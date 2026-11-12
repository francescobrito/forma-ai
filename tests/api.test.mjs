import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { endpoint, buildRequest, parseSSE, extractDelta } from '../api.mjs';
import { createServer } from '../server.mjs';

test('URLs support base paths and complete endpoints', () => {
  assert.equal(endpoint('https://api.example.com', 'openai', 'chat/completions'), 'https://api.example.com/v1/chat/completions');
  assert.equal(endpoint('https://openrouter.ai/api/v1/', 'openai', 'models'), 'https://openrouter.ai/api/v1/models');
  assert.equal(endpoint('http://localhost:11434/v1/chat/completions', 'openai', 'models'), 'http://localhost:11434/v1/models');
  assert.equal(endpoint('https://api.anthropic.com', 'anthropic', 'messages'), 'https://api.anthropic.com/v1/messages');
  for (const bad of ['file:///etc/passwd', 'https://user:secret@example.com', 'https://example.com?key=secret', 'https://example.com#x']) assert.throws(() => endpoint(bad, 'openai', 'models'));
});

test('request translation includes credentials only in the correct headers', () => {
  const messages = [{ role: 'user', content: 'Hello' }];
  const openai = buildRequest({ protocol: 'openai', url: 'https://example.com/v1', key: 'test-key' }, messages, 'model-a', 'Be brief');
  assert.equal(openai.headers.Authorization, 'Bearer test-key');
  assert.deepEqual(openai.body.messages[0], { role: 'system', content: 'Be brief' });
  assert.equal(openai.body.stream, true);
  const anthropic = buildRequest({ protocol: 'anthropic', url: 'https://example.com', key: 'test-key' }, messages, 'model-b', 'Be brief');
  assert.equal(anthropic.headers['x-api-key'], 'test-key');
  assert.equal(anthropic.headers['anthropic-version'], '2023-06-01');
  assert.equal(anthropic.body.system, 'Be brief');
  assert.deepEqual(anthropic.body.messages, messages);
  assert.equal(anthropic.body.max_tokens, 4096);
  assert.throws(() => buildRequest({ protocol: 'anthropic', url: 'https://example.com' }, messages, 'model-b'));
  assert.throws(() => buildRequest({ protocol: 'openai', url: 'https://example.com' }, [{ role: 'system', content: 'bad' }], 'model-a'));
});

test('SSE parsing survives byte-by-byte UTF-8, CRLF, multiline records and an unterminated final record', async () => {
  const encoded = new TextEncoder().encode(': ping\r\n\r\ndata: {"text":"Привет 🌿"}\r\n\r\ndata: line one\ndata: line two\n\ndata: [DONE]');
  const stream = new ReadableStream({ start(controller) { for (const byte of encoded) controller.enqueue(Uint8Array.of(byte)); controller.close(); } });
  const result = []; for await (const data of parseSSE(stream)) result.push(data);
  assert.deepEqual(result, ['{"text":"Привет 🌿"}', 'line one\nline two', '[DONE]']);
});

test('OpenAI and Anthropic event extraction ignores non-text deltas and detects errors', () => {
  assert.deepEqual(extractDelta('{"choices":[{"delta":{"content":"hi"}}]}', 'openai'), { text: 'hi' });
  assert.deepEqual(extractDelta('{"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}', 'anthropic'), { text: 'hi' });
  assert.deepEqual(extractDelta('{"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"hidden"}}', 'anthropic'), { text: '' });
  assert.deepEqual(extractDelta('{"type":"message_stop"}', 'anthropic'), { done: true });
  assert.deepEqual(extractDelta('{"choices":[{"delta":{},"finish_reason":"stop"}]}', 'openai'), { text: '', done: true });
  assert.throws(() => extractDelta('{"error":{"message":"invalid model"}}', 'openai'), /invalid model/);
});

let mock, server, base, upstreamBase, received;
before(async () => {
  mock = http.createServer(async (req, res) => {
    if (req.url === '/v1/models') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ data: [{ id: 'z-model' }, { id: 'a-model' }] })); return; }
    let raw = ''; for await (const chunk of req) raw += chunk;
    received = { headers: req.headers, body: JSON.parse(raw), url: req.url };
    if (received.body.model === 'unauthorized') { res.writeHead(401, { 'Content-Type': 'application/json' }); res.end('{"error":{"message":"invalid_api_key: mock-secret"}}'); return; }
    if (received.body.model === 'json-model') { res.setHeader('Content-Type', 'application/json'); res.end('{"choices":[{"message":{"content":"plain JSON reply"}}]}'); return; }
    res.setHeader('Content-Type', 'text/event-stream');
    if (received.body.model === 'truncated') { res.end('data: {"choices":[{"delta":{"content":"Partial reply"}}]}\n\n'); return; }
    if (req.url === '/v1/messages') { res.end('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Anthropic reply"}}\n\ndata: {"type":"message_stop"}\n\n'); return; }
    res.write('data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n');
    res.end('data: {"choices":[{"delta":{"content":"world"}}]}\n\ndata: [DONE]\n\n');
  });
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
  upstreamBase = `http://127.0.0.1:${mock.address().port}/v1`;
  server = createServer({ accounts: { identify: async token => token === 'test-session' ? { id: 'fixture-user' } : null } }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => mock.close(resolve))]); });
const request = (path, data, headers = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: 'forma_session=test-session', ...headers }, body: JSON.stringify(data) });
const chatBody = (protocol = 'openai', model = 'test-model') => ({ provider: { url: upstreamBase, protocol, key: 'mock-secret' }, model, messages: [{ role: 'user', content: 'Hello' }], systemPrompt: 'Be clear' });

test('proxy streams OpenAI responses and forwards the selected model and system prompt', async () => {
  const response = await request('/api/chat', chatBody());
  assert.equal(response.status, 200);
  const events = []; for await (const data of parseSSE(response.body)) events.push(JSON.parse(data));
  assert.deepEqual(events, [{ text: 'Hello ' }, { text: 'world' }, { done: true }]);
  assert.equal(received.headers.authorization, 'Bearer mock-secret');
  assert.equal(received.body.model, 'test-model');
  assert.equal(received.body.messages[0].role, 'system');
});

test('proxy translates Anthropic responses and supports JSON-only providers', async () => {
  let response = await request('/api/chat', chatBody('anthropic'));
  assert.match(await response.text(), /Anthropic reply/);
  assert.equal(received.url, '/v1/messages');
  assert.equal(received.headers['x-api-key'], 'mock-secret');
  response = await request('/api/chat', chatBody('openai', 'json-model'));
  assert.match(await response.text(), /plain JSON reply/);
});

test('proxy forwards effort and image bytes together with the response instructions', async () => {
  const body = chatBody('openai', 'o3');
  body.effort = 'high';
  body.systemPrompt = 'Give thorough explanations with concrete examples.';
  body.messages[0].attachments = [{ kind: 'image', name: 'clipboard.png', data: 'data:image/png;base64,aGVsbG8=' }];
  const response = await request('/api/chat', body);
  assert.equal(response.status, 200);
  await response.text();
  assert.equal(received.body.reasoning_effort, 'high');
  assert.equal(received.body.messages[0].content, body.systemPrompt);
  assert.equal(received.body.messages[1].content[1].image_url.url, body.messages[0].attachments[0].data);
});

test('model discovery and readable authentication errors', async () => {
  let response = await request('/api/models', { provider: chatBody().provider });
  assert.deepEqual(await response.json(), { models: ['a-model', 'z-model'] });
  response = await request('/api/chat', chatBody('openai', 'unauthorized'));
  assert.equal(response.status, 401);
  const data = await response.json(); assert.match(data.error, /API key/); assert.match(data.error, /invalid_api_key/); assert.doesNotMatch(data.error, /mock-secret/);
});

test('a truncated provider stream reports an error and preserves partial text', async () => {
  const response = await request('/api/chat', chatBody('openai', 'truncated'));
  const events = []; for await (const data of parseSSE(response.body)) events.push(JSON.parse(data));
  assert.equal(events[0].text, 'Partial reply');
  assert.match(events[1].error, /before the response finished/);
  assert.equal(events.some(e => e.done), false);
});

test('local server rejects cross-origin requests, invalid URLs, and unknown paths', async () => {
  let response = await request('/api/chat', chatBody(), { Origin: 'https://untrusted.example' });
  assert.equal(response.status, 403);
  response = await request('/api/chat', { ...chatBody(), provider: { protocol: 'openai', url: 'file:///tmp/secret' } });
  assert.equal(response.status, 400);
  assert.equal((await fetch(base + '/not-a-file')).status, 404);
  const page = await fetch(base); assert.equal(page.status, 200); assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
});
