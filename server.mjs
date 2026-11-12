import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRequest, endpoint, extractDelta, extractText, parseSSE } from './api.mjs';
import { runAgentRouter, usesCodex } from './agentrouter.mjs';
import { createAccounts } from './accounts.mjs';
import { validatePublicProvider } from './provider-safety.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), 'public');
const port = Number(process.env.PORT || 3003);
const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/i18n.js': ['i18n.js', 'text/javascript'], '/attachments.js': ['attachments.js', 'text/javascript'], '/model-options.js': ['model-options.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
files['/auth.js'] = ['auth.js', 'text/javascript'];
const sessionToken = req => /(?:^|;\s*)forma_session=([A-Za-z0-9_-]+)/.exec(req.headers.cookie || '')?.[1];
const sessionCookie = (token, secure) => `forma_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? 604800 : 0}${secure ? '; Secure' : ''}`;

async function readBody(req, limit = 20_000_000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('The request is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

function redact(message, key) {
  let value = String(message || '');
  if (typeof key === 'string' && key) value = value.replaceAll(key, '[redacted]');
  return value.replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]').replace(/Bearer\s+[^\s"<>]+/gi, 'Bearer [redacted]').slice(0, 1000);
}
async function providerError(response, key) {
  let detail = '';
  try {
    const data = await response.json();
    detail = data.error?.message || data.message || (typeof data.error === 'string' ? data.error : '');
  } catch {}
  detail = redact(detail, key);
  const prefix = /unauthorized client|unsupported client|client.*not allowed/i.test(detail)
    ? 'This provider does not allow this application. Ask its support to enable access for this client.'
    : response.status === 401 ? 'Authentication or access denied. Check the API key and provider permissions.'
    : response.status === 429 ? 'This provider is rate limited or out of credit. Try again later or choose another provider.'
    : 'The provider could not complete the request.';
  return `${prefix} (HTTP ${response.status})${detail ? '\nProvider detail: ' + detail : ''}`;
}

export function createServer({ accounts, publicURL = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL } = {}) {
  const publicOrigin = publicURL ? new URL(publicURL).origin : null;
  const attempts = new Map();
  const busy = new Set();
  return http.createServer(async (req, res) => {
    const host = req.headers.host || '';
    const local = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host);
    if (publicOrigin ? host !== new URL(publicOrigin).host : !local) return json(res, 403, { error: 'Invalid host.' });
    const pathname = new URL(req.url, 'http://localhost').pathname;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const expectedOrigin = publicOrigin || `http://${host}`;
    if (req.method === 'POST') {
      if (req.headers.origin !== expectedOrigin) return json(res, 403, { error: 'Cross-origin requests are not allowed.' });
      if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, { error: 'Use application/json.' });
    }
    if (pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true });
    if (pathname.startsWith('/api/auth/')) {
      if (!accounts) return json(res, 503, { error: 'Account storage is unavailable.' });
      try {
        if (pathname === '/api/auth/me' && req.method === 'GET') return json(res, 200, { user: await accounts.identify(sessionToken(req)) });
        if (req.method !== 'POST') return json(res, 404, { error: 'Not found' });
        if (pathname === '/api/auth/logout') { await accounts.revoke(sessionToken(req)); res.setHeader('Set-Cookie', sessionCookie('', !!publicOrigin)); return json(res, 200, { ok: true }); }
        if (!['/api/auth/register', '/api/auth/login'].includes(pathname)) return json(res, 404, { error: 'Not found' });
        const address = req.socket.remoteAddress || '';
        // Render puts the client address at the end of its forwarded-for chain.
        const client = process.env.RENDER ? String(req.headers['x-forwarded-for'] || address).split(',').at(-1).trim() : address;
        const now = Date.now();
        if (attempts.size > 10000) for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
        let rate = attempts.get(client);
        if (!rate || rate.until < now) { rate = { count: 0, until: now + 15 * 60000 }; attempts.set(client, rate); }
        if (++rate.count > 20) { res.setHeader('Retry-After', Math.ceil((rate.until - now) / 1000)); return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' }); }
        const body = await readBody(req, 8000);
        const user = await (pathname.endsWith('/register') ? accounts.register(body) : accounts.login(body));
        await accounts.revoke(sessionToken(req));
        res.setHeader('Set-Cookie', sessionCookie(await accounts.issue(user), !!publicOrigin));
        return json(res, pathname.endsWith('/register') ? 201 : 200, { user });
      } catch (error) { return json(res, error.status || 503, { error: error.status ? error.message : 'Account storage is unavailable. Try again later.' }); }
    }
    if (req.method === 'POST' && ['/api/chat', '/api/models', '/api/check'].includes(pathname)) {
      let user;
      try { user = await accounts?.identify(sessionToken(req)); } catch { return json(res, 503, { error: 'Account storage is unavailable.' }); }
      if (!user) return json(res, 401, { error: 'Sign in to use your AI workspace.', code: 'SESSION_REQUIRED' });
      if (busy.has(user.id)) return json(res, 429, { error: 'Wait for your current request to finish.' });
      if (busy.size >= 4) return json(res, 429, { error: 'The server is busy. Try again shortly.' });
      busy.add(user.id);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new Error('The provider timed out. Please try again.')), 180_000);
      res.on('close', () => controller.abort());
      let streaming = false;
      let provider;
      let dispatcher;
      try {
        const body = await readBody(req);
        provider = body.provider;
        if (publicOrigin) dispatcher = await validatePublicProvider(provider?.url);
        if (pathname === '/api/check' && usesCodex(provider)) {
          if (!body.model || typeof body.model !== 'string') throw new Error('Enter a model ID before testing this connection.');
          const probe = [{ role: 'user', content: 'Reply only OK.' }];
          buildRequest(provider, probe, body.model, '', 'low');
          await runAgentRouter({ provider, model: body.model, messages: probe, systemPrompt: 'This is a connection test. Reply only OK.', effort: 'low', signal: controller.signal });
          return json(res, 200, { ok: true, transport: 'codex', model: body.model });
        }
        if (pathname === '/api/models' || pathname === '/api/check') {
          if (!provider || !['openai', 'responses', 'anthropic'].includes(provider.protocol)) throw new Error('Choose a valid provider.');
          const headers = provider.protocol === 'anthropic'
            ? { 'x-api-key': provider.key || '', 'anthropic-version': '2023-06-01' }
            : (provider.key ? { Authorization: 'Bearer ' + provider.key } : {});
          const response = await fetch(endpoint(provider.url, provider.protocol, 'models'), { headers, signal: controller.signal, redirect: 'error', dispatcher });
          if (!response.ok) return json(res, response.status, { error: await providerError(response, provider.key) });
          const data = await response.json();
          const models = (data.data || data.models || []).map(m => m.id || m.name).filter(m => typeof m === 'string').sort();
          return json(res, 200, { models });
        }
        const upstream = buildRequest(provider, body.messages, body.model, body.systemPrompt, body.effort);
        if (usesCodex(provider)) {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'Connection': 'keep-alive' }); streaming = true;
          const answer = await runAgentRouter({ provider, model: body.model, messages: body.messages, systemPrompt: body.systemPrompt, effort: body.effort, signal: controller.signal });
          res.end(`data: ${JSON.stringify({ text: answer })}\n\ndata: ${JSON.stringify({ done: true })}\n\n`); return;
        }
        const response = await fetch(upstream.url, { method: 'POST', headers: upstream.headers, body: JSON.stringify(upstream.body), signal: controller.signal, redirect: 'error', dispatcher });
        if (!response.ok) return json(res, response.status, { error: await providerError(response, provider.key) });
        if (!response.body) throw new Error('The provider returned an empty response.');
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
        streaming = true;
        const send = data => res.write(`data: ${JSON.stringify(data)}\n\n`);
        if ((response.headers.get('content-type') || '').includes('text/event-stream')) {
          let finished = false;
          for await (const data of parseSSE(response.body)) {
            const delta = extractDelta(data, upstream.protocol);
            if (delta.text) send({ text: delta.text });
            if (delta.done) { finished = true; break; }
          }
          if (!finished) throw new Error('The provider connection ended before the response finished. Try regenerating the response.');
        } else {
          const data = await response.json();
          const content = extractText(data, upstream.protocol);
          if (typeof content !== 'string') throw new Error('No text was returned. Check that this model supports chat.');
          send({ text: content });
          if (data.status === 'incomplete') throw new Error('The model response was incomplete. Try again or choose another model.');
        }
        send({ done: true });
        res.end();
      } catch (error) {
        if (res.destroyed) return;
        const message = redact(error.message === 'fetch failed' ? 'Could not reach this API URL. Check the address and your connection.' : error.message, provider?.key);
        if (streaming) { res.write(`data: ${JSON.stringify({ error: message })}\n\n`); res.end(); }
        else json(res, 400, { error: message || 'Unable to connect to the provider.' });
      } finally { clearTimeout(timeout); busy.delete(user.id); await dispatcher?.close(); }
      return;
    }
    if (req.method !== 'GET' || !files[pathname]) return json(res, 404, { error: 'Not found' });
    try {
      const [file, type] = files[pathname];
      const body = await readFile(join(root, file));
      res.writeHead(200, {
        'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
      });
      res.end(body);
    } catch { json(res, 500, { error: 'Unable to load the workspace.' }); }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const accounts = await createAccounts();
  const hosted = !!(process.env.RENDER || process.env.PUBLIC_URL);
  const server = createServer({ accounts });
  server.listen(port, hosted ? '0.0.0.0' : '127.0.0.1', () => console.log(`Forma is ready on port ${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(async () => { await accounts.close(); process.exit(0); }));
}
