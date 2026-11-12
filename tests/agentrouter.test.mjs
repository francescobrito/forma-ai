import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { access } from 'node:fs/promises';
import http from 'node:http';
import { runAgentRouter, codexExecutable } from '../agentrouter.mjs';

const request = { provider: { protocol: 'responses', url: 'https://agentrouter.org/v1', key: 'test-agentrouter-key' }, model: 'gpt-6.1-sol', effort: 'high', systemPrompt: 'Be concise.', messages: [{ role: 'user', content: 'Earlier question' }, { role: 'assistant', content: 'Earlier answer' }, { role: 'user', content: 'Новый вопрос', attachments: [{ kind: 'image', name: 'photo.png', data: 'data:image/png;base64,aGVsbG8=' }, { kind: 'text', name: 'notes.txt', text: 'File text' }] }] };
function stub(onInput) {
  return (executable, args, options) => {
    const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.kill = () => { child.emit('close', null); return true; };
    let input = ''; child.stdin.on('data', chunk => { input += chunk; });
    child.stdin.on('finish', () => { queueMicrotask(() => onInput({ child, args, options, input })); });
    return child;
  };
}
function emit(child, event) { child.stdout.write(JSON.stringify(event) + '\n'); }

test('Codex transport isolates the child environment, keeps the key off command lines, and cleans its working folder', async () => {
  let directory;
  const answer = await runAgentRouter(request, { spawn: stub(({ child, args, options, input }) => {
    directory = options.cwd;
    assert.equal(options.shell, false);
    assert.equal(options.env.FORMA_PROVIDER_KEY, request.provider.key);
    assert.equal(options.env.CODEX_APP_TOOLS_PIPE_PATH, undefined);
    assert.equal(options.env.CODEX_INTERNAL_ORIGINATOR_OVERRIDE, undefined);
    assert.equal(options.env.AGENTROUTER_API_KEY, undefined);
    assert.equal(args.join(' ').includes(request.provider.key), false);
    assert.ok(args.includes('--ephemeral')); assert.ok(args.includes('--ignore-user-config'));
    assert.match(input, /Do not use tools/);
    assert.ok(!args.includes('--image')); assert.ok(args.includes('model_reasoning_effort="high"'));
    emit(child, { type: 'turn.started' });
    const bytes = Buffer.from(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Соединение работает' } }) + '\n');
    for (const byte of bytes) child.stdout.write(Buffer.from([byte]));
    emit(child, { type: 'turn.completed' }); child.emit('close', 0);
  }) });
  assert.equal(answer, 'Соединение работает');
  await assert.rejects(access(directory));
});
test('cancelling a Codex reply stops its process and cleans temporary files', async () => {
  const controller = new AbortController(); let directory;
  await assert.rejects(runAgentRouter({ ...request, signal: controller.signal }, { spawn: stub(({ options }) => { directory = options.cwd; controller.abort(new Error('Cancelled by user')); }) }), /Cancelled by user/);
  await assert.rejects(access(directory));
});
test('provider failures redact credentials and attempted tool use fails closed', async () => {
  await assert.rejects(runAgentRouter(request, { spawn: stub(({ child }) => {
    emit(child, { type: 'turn.failed', error: { message: 'Authentication failed: ' + request.provider.key } }); child.emit('close', 1);
  }) }), error => { assert.match(error.message, /Authentication failed/); assert.equal(error.message.includes(request.provider.key), false); return true; });
  await assert.rejects(runAgentRouter(request, { spawn: stub(({ child }) => { emit(child, { type: 'turn.started' }); emit(child, { type: 'item.started', item: { type: 'command_execution' } }); }) }), /Tools are disabled/);
});
test('installed official Codex sends no tools and receives a response through its own native client', async t => {
  const executable = await codexExecutable();
  try { await access(executable); } catch { t.skip('Official Codex executable is not installed at a known path.'); return; }
  let received;
  const mock = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    received = { headers: req.headers, body: JSON.parse(raw), url: req.url };
    const message = { id: 'msg_test', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'Native response', annotations: [] }] };
    const events = [{ type: 'response.created', response: { id: 'resp_test', status: 'in_progress', output: [] } }, { type: 'response.output_item.added', output_index: 0, item: { ...message, status: 'in_progress', content: [] } }, { type: 'response.output_text.delta', output_index: 0, content_index: 0, item_id: 'msg_test', delta: 'Native response' }, { type: 'response.output_item.done', output_index: 0, item: message }, { type: 'response.completed', response: { id: 'resp_test', status: 'completed', output: [message], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } } }];
    res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.end(events.map(event => 'data: ' + JSON.stringify(event) + '\n\n').join(''));
  });
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
  try {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(new Error('Test timed out')), 25000);
    const messages = [...request.messages, { role: 'user', content: 'Native transport test message', attachments: [{ kind: 'pdf', name: 'document.pdf', data: 'data:application/pdf;base64,aGVsbG8=' }] }];
    let answer; try { answer = await runAgentRouter({ ...request, provider: { ...request.provider, url: `http://127.0.0.1:${mock.address().port}/v1` }, messages, signal: controller.signal }, { executable }); } finally { clearTimeout(timer); }
    assert.equal(answer, 'Native response');
    assert.equal(received.url, '/v1/responses');
    assert.equal(received.body.model, request.model);
    assert.equal(received.headers.authorization, 'Bearer ' + request.provider.key);
    assert.match(received.headers['user-agent'], /codex/i);
    assert.deepEqual(received.body.tools || [], []);
    assert.equal(received.body.instructions, request.systemPrompt);
    assert.equal(received.body.tool_choice, 'none');
    assert.equal(received.body.input.some(item => item.type === 'additional_tools'), false);
    assert.ok(JSON.stringify(received.body.input).length < 5000, 'The native client must keep the chat context small');
    assert.ok(received.body.input.some(item => JSON.stringify(item).includes('Native transport test message')));
    assert.equal(received.body.reasoning.effort, 'high');
    const context = JSON.stringify(received.body.input);
    for (const content of ['Earlier question', 'Earlier answer', 'Новый вопрос', 'File text', 'data:image/png;base64,aGVsbG8=', 'data:application/pdf;base64,aGVsbG8=']) assert.ok(context.includes(content));
  } finally { await new Promise(resolve => mock.close(resolve)); }
});
