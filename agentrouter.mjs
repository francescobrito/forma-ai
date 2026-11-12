import { spawn } from 'node:child_process';
import { access, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { createRequire } from 'node:module';
import { buildRequest, endpoint, parseSSE } from './api.mjs';

export function usesCodex(provider) {
  try { return provider.protocol !== 'anthropic' && new URL(provider.url).hostname === 'agentrouter.org'; } catch { return false; }
}

export async function codexExecutable() {
  if (process.env.FORMA_CODEX_PATH) return process.env.FORMA_CODEX_PATH;
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    const installed = join(process.env.LOCALAPPDATA, 'Programs', 'OpenAI', 'Codex', 'bin', 'codex.exe');
    try { await access(installed, constants.F_OK); return installed; } catch {}
  }
  try { return join(dirnameForPackage(), 'bin', 'codex.js'); } catch { return 'codex'; }
}
const dirnameForPackage = () => resolve(createRequire(import.meta.url).resolve('@openai/codex/package.json'), '..');

export function codexArguments({ provider, model, systemPrompt, effort, images = [] }) {
  const baseURL = endpoint(provider.url, 'responses', 'responses').replace(/\/responses$/, '');
  const config = { name: 'Forma AgentRouter', base_url: baseURL, env_key: 'FORMA_PROVIDER_KEY', wire_api: 'responses', request_max_retries: 0, stream_max_retries: 0 };
  const table = '{' + Object.entries(config).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(',') + '}';
  const args = ['--no-daemon', 'exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--skip-git-repo-check', '--json', '--color', 'never', '--sandbox', 'read-only', '--model', model, '--config', 'model_provider="forma_agentrouter"', '--config', 'model_providers.forma_agentrouter=' + table, '--config', 'project_doc_max_bytes=0', '--config', 'web_search="disabled"', '--config', 'model_reasoning_effort=' + JSON.stringify(effort || 'medium'), '--config', 'developer_instructions=' + JSON.stringify('Answer the user as a conversational AI assistant. Do not use tools or access local files. ' + (systemPrompt || ''))];
  for (const feature of ['shell_tool', 'unified_exec', 'code_mode', 'code_mode_host', 'apps', 'plugins', 'hooks', 'browser_use', 'browser_use_external', 'computer_use', 'workspace_dependencies', 'view_image', 'image_generation', 'goals', 'sleep_tool', 'skill_search', 'multi_agent', 'multi_agent_v2', 'incremental_tools', 'unbounded_connection_retries', 'shell_snapshot']) args.push('--disable', feature);
  args.push('--enable', 'skip_host_skill_discovery');
  for (const image of images) args.push('--image', image);
  args.push('--config', 'model_instructions_file=' + JSON.stringify(fileURLToPath(new URL('./agentrouter-instructions.md', import.meta.url))));
  args.push('-');
  return args;
}

const cleanError = (value, key) => String(value || '').replaceAll(key, '[redacted]').replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]').slice(0, 1600);

export function chatEnvironment(key) {
  // A website conversation must not inherit the parent coding task's tool bridge,
  // injected instructions, client overrides, or unrelated API credentials.
  const allowed = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|SYSTEMDRIVE|COMSPEC|TEMP|TMP|TMPDIR|USERPROFILE|HOME|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|PROGRAMDATA|PROGRAMFILES(?:\(X86\))?|PROGRAMW6432|LANG|LC_.*|HTTP_PROXY|HTTPS_PROXY|ALL_PROXY|NO_PROXY|SSL_CERT_FILE|SSL_CERT_DIR)$/i;
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => allowed.test(name)));
  return { ...env, FORMA_PROVIDER_KEY: key };
}

async function chatAdapter(request) {
  const desired = buildRequest({ ...request.provider, protocol: 'responses' }, request.messages, request.model, request.systemPrompt, request.effort);
  let used = false, upstreamFailure = '';
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method !== 'POST' || req.url !== '/v1/responses' || req.headers.authorization !== 'Bearer ' + request.provider.key || used) {
        res.writeHead(403); res.end('Only one authenticated chat request is allowed.'); return;
      }
      used = true;
      let size = 0; const chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > 20_000_000) throw new Error('This conversation is too large. Start a new chat.'); chunks.push(chunk); }
      const native = JSON.parse(Buffer.concat(chunks).toString());
      // Keep the official client's metadata and generated headers. Replace its
      // coding context with the website conversation, and expose no tools.
      const body = { ...native, ...desired.body, tools: [], tool_choice: 'none', parallel_tool_calls: false };
      const headers = Object.fromEntries(Object.entries(req.headers).filter(([name]) => !['host', 'connection', 'content-length', 'transfer-encoding', 'accept-encoding'].includes(name)));
      const upstream = await fetch(desired.url, { method: 'POST', headers, body: JSON.stringify(body), signal: request.signal, redirect: 'error' });
      // Some gateways send a JSON error inside SSE without a Responses event
      // type. The native client reports only a disconnected stream in that case.
      // Retain the provider's error without retaining its response text or keys.
      const inspect = async () => {
        const copy = upstream.clone();
        try {
          if ((copy.headers.get('content-type') || '').includes('text/event-stream')) {
            let completed = false; const types = new Set();
            for await (const data of parseSSE(copy.body)) {
              if (data === '[DONE]') continue;
              let event; try { event = JSON.parse(data); } catch { continue; }
              if (typeof event.type === 'string') types.add(event.type);
              const error = event.error || event.response?.error;
              if (error) upstreamFailure = cleanError(error.message || error, request.provider.key);
              if (event.type === 'response.completed') completed = true;
            }
            if (!completed && !upstreamFailure) upstreamFailure = `AgentRouter ended the stream before completing a response (HTTP ${upstream.status}; events: ${[...types].join(', ') || 'none'}).`;
          } else {
            const data = await copy.json();
            if (data.error) upstreamFailure = cleanError(data.error.message || data.error, request.provider.key);
          }
        } catch (error) { upstreamFailure ||= cleanError(error.message, request.provider.key); }
      };
      const inspection = inspect();
      res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/json' });
      if (upstream.body) for await (const chunk of upstream.body) { if (res.destroyed) break; res.write(chunk); }
      await inspection;
      res.end();
    } catch (error) {
      if (res.destroyed) return;
      if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: cleanError(error.message, request.provider.key) } }));
    }
  });
  await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveListen); });
  return { url: `http://127.0.0.1:${server.address().port}/v1`, failure: () => upstreamFailure, close: async () => { server.closeAllConnections(); await new Promise(resolveClose => server.close(resolveClose)); } };
}

export async function runAgentRouter(request, options = {}) {
  const { provider, model, messages, systemPrompt, effort, signal } = request;
  if (!provider.key || typeof provider.key !== 'string') throw new Error('Add your API key to this provider to start chatting.');
  if (signal?.aborted) throw signal.reason || new Error('Request cancelled.');
  const runtimeRoot = resolve(options.runtimeRoot || join(tmpdir(), 'forma-agentrouter'));
  await mkdir(runtimeRoot, { recursive: true });
  const directory = await mkdtemp(join(runtimeRoot, 'request-'));
  let adapter;
  try {
    adapter = await chatAdapter(request);
    const prompt = 'Answer the latest user message. Do not use tools.';
    const executable = options.executable || await codexExecutable();
    const args = codexArguments({ provider: { ...provider, url: adapter.url }, model, systemPrompt, effort });
    const script = executable.endsWith('.js');
    const child = (options.spawn || spawn)(script ? process.execPath : executable, script ? [executable, ...args] : args, { cwd: directory, env: { ...chatEnvironment(provider.key), CODEX_HOME: directory }, windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    let pending = '', stderr = '', answer = '', completed = false, failure = '', activeTurn = false;
    function event(line) {
      let data; try { data = JSON.parse(line); } catch { return; }
      if (data.type === 'turn.started') activeTurn = true;
      if (data.type === 'item.completed' && data.item?.type === 'agent_message') answer += data.item.text || '';
      if (data.type === 'turn.completed') completed = true;
      if (data.type === 'turn.failed') failure = data.error?.message || 'The provider returned an error.';
      if (data.type === 'error') failure = data.message || 'The provider returned an error.';
      if (activeTurn && data.type === 'item.started' && !['agent_message', 'reasoning'].includes(data.item?.type)) { failure = 'Tools are disabled for this connection.'; child.kill(); }
    }
    child.stdout.on('data', chunk => {
      pending += chunk.toString(); let newline;
      while ((newline = pending.indexOf('\n')) >= 0) { event(pending.slice(0, newline)); pending = pending.slice(newline + 1); }
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-5000); });
    child.stdin.on('error', () => {});
    const abort = () => child.kill(); signal?.addEventListener('abort', abort, { once: true });
    const exit = new Promise((resolveExit, rejectExit) => {
      child.once('error', error => rejectExit(new Error(error.code === 'ENOENT' ? 'Install Codex CLI to use the AgentRouter connection.' : cleanError(error.message, provider.key))));
      child.once('close', code => resolveExit(code));
    });
    child.stdin.end(prompt);
    let code;
    try { if (signal?.aborted) abort(); code = await exit; } finally { signal?.removeEventListener('abort', abort); }
    if (pending.trim()) event(pending);
    if (signal?.aborted) throw signal.reason || new Error('Request cancelled.');
    if (failure || code !== 0 || !completed || !answer.trim()) throw new Error(cleanError(adapter.failure() || failure || stderr || 'The provider returned no answer.', provider.key));
    return answer;
  } finally {
    await adapter?.close();
    // Only remove the per-request folder created above, never a user-selected path.
    const target = resolve(directory);
    if (target.startsWith(runtimeRoot + sep) && target !== runtimeRoot) await rm(target, { recursive: true, force: true });
  }
}
