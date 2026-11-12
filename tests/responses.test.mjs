import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { buildRequest, endpoint, extractDelta, extractText, parseSSE } from '../api.mjs';
import { createServer } from '../server.mjs';
const provider = { protocol: 'responses', url: 'https://api.example.com/v1', key: 'test-key' };

test('Responses translates instructions, chat history, effort, images and documents', () => {
  const image = 'data:image/png;base64,aGVsbG8=', pdf = 'data:application/pdf;base64,JVBERi0xLjc=';
  const messages = [{ role: 'user', content: 'First' }, { role: 'assistant', content: 'Answer' }, { role: 'user', content: 'Files', attachments: [{ kind: 'image', name: 'photo.png', data: image }, { kind: 'pdf', name: 'notes.pdf', data: pdf }, { kind: 'text', name: 'notes.txt', text: 'Text contents' }] }];
  const request = buildRequest(provider, messages, 'gpt-6.1-sol', 'Be concise', 'high');
  assert.equal(request.url, 'https://api.example.com/v1/responses');
  assert.equal(request.body.instructions, 'Be concise');
  assert.deepEqual(request.body.reasoning, { effort: 'high' });
  assert.equal(request.body.store, false);
  assert.deepEqual(request.body.input.slice(0, 2), messages.slice(0, 2));
  assert.deepEqual(request.body.input[2].content.slice(0, 3), [{ type: 'input_text', text: 'Files' }, { type: 'input_image', image_url: image }, { type: 'input_file', filename: 'notes.pdf', file_data: pdf }]);
  assert.match(request.body.input[2].content[3].text, /Text contents/);
  assert.equal(request.body.reasoning_effort, undefined);
  assert.equal(request.body.messages, undefined);
});
test('existing AgentRouter GPT providers use Responses without re-entering credentials', () => {
  const request = buildRequest({ ...provider, protocol: 'openai', url: 'https://agentrouter.org/v1' }, [{ role: 'user', content: 'Hello' }], 'gpt-6.1-sol');
  assert.equal(request.protocol, 'responses');
  assert.equal(request.headers.Authorization, 'Bearer test-key');
  assert.equal(request.url, 'https://agentrouter.org/v1/responses');
  assert.equal(endpoint('https://api.example.com/v1/responses', 'responses', 'models'), 'https://api.example.com/v1/models');
});
test('Responses events ignore reasoning and distinguish completed, incomplete and failed answers', () => {
  assert.deepEqual(extractDelta('{"type":"response.output_text.delta","delta":"Привет"}', 'responses'), { text: 'Привет' });
  assert.deepEqual(extractDelta('{"type":"response.reasoning_text.delta","delta":"private"}', 'responses'), {});
  assert.deepEqual(extractDelta('{"type":"response.completed"}', 'responses'), { done: true });
  assert.throws(() => extractDelta('{"type":"response.incomplete"}', 'responses'), /incomplete/);
  assert.throws(() => extractDelta('{"type":"response.failed","response":{"error":{"message":"Model denied"}}}', 'responses'), /Model denied/);
  assert.equal(extractText({ output: [{ type: 'reasoning', content: [] }, { type: 'message', content: [{ type: 'output_text', text: 'Answer' }] }] }, 'responses'), 'Answer');
});
test('live proxy handles Responses streaming, JSON, client denial and credential redaction', async () => {
  let received;
  const mock = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    received = { url: req.url, authorization: req.headers.authorization, body: JSON.parse(raw) };
    if (received.body.model === 'blocked') {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'unauthorized client detected; request key test-key' } })); return;
    }
    if (received.body.model === 'json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"status":"completed","output":[{"type":"message","content":[{"type":"output_text","text":"JSON answer"}]}]}'); return;
    }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.end('data: {"type":"response.output_text.delta","delta":"Stream answer"}\n\ndata: {"type":"response.completed"}\n\n');
  });
  const server = createServer({ accounts: { identify: async token => token === 'test-session' ? { id: 'fixture-user' } : null } });
  await Promise.all([new Promise(resolve => mock.listen(0, '127.0.0.1', resolve)), new Promise(resolve => server.listen(0, '127.0.0.1', resolve))]);
  try {
    const apiProvider = { ...provider, url: `http://127.0.0.1:${mock.address().port}/v1` };
    const send = model => fetch(`http://127.0.0.1:${server.address().port}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: `http://127.0.0.1:${server.address().port}`, Cookie: 'forma_session=test-session' }, body: JSON.stringify({ provider: apiProvider, model, messages: [{ role: 'user', content: 'Hello' }] }) });
    const response = await send('gpt-6.1-sol');
    assert.equal(response.status, 200);
    const events = []; for await (const data of parseSSE(response.body)) events.push(JSON.parse(data));
    assert.deepEqual(events, [{ text: 'Stream answer' }, { done: true }]);
    assert.equal(received.url, '/v1/responses');
    assert.equal(received.authorization, 'Bearer test-key');
    assert.match(await (await send('json')).text(), /JSON answer/);
    const denied = await send('blocked');
    assert.equal(denied.status, 401);
    const error = (await denied.json()).error;
    assert.match(error, /does not allow this application/);
    assert.match(error, /unauthorized client detected/);
    assert.doesNotMatch(error, /test-key|rejected your API key/);
  } finally { await Promise.all([new Promise(resolve => mock.close(resolve)), new Promise(resolve => server.close(resolve))]); }
});
