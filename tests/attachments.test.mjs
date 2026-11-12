import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest } from '../api.mjs';
const provider = protocol => ({ protocol, url: 'https://api.example.com/v1', key: 'test-key' });
const files = [
  { kind: 'image', name: 'photo.png', data: 'data:image/png;base64,aGVsbG8=' },
  { kind: 'pdf', name: 'notes.pdf', data: 'data:application/pdf;base64,JVBERi0xLjc=' },
  { kind: 'text', name: 'notes.txt', text: 'File contents — текст файла' }
];
test('OpenAI requests carry the actual image, PDF and text content', () => {
  const result = buildRequest(provider('openai'), [{ role: 'user', content: 'Explain these files', attachments: files }], 'vision-model');
  const parts = result.body.messages[0].content;
  assert.equal(parts[0].text, 'Explain these files');
  assert.deepEqual(parts[1], { type: 'image_url', image_url: { url: files[0].data } });
  assert.deepEqual(parts[2], { type: 'file', file: { filename: 'notes.pdf', file_data: files[1].data } });
  assert.match(parts[3].text, /File contents — текст файла/);
});
test('Anthropic requests translate files to image and document blocks', () => {
  const result = buildRequest(provider('anthropic'), [{ role: 'user', content: '', attachments: files }], 'vision-model');
  const parts = result.body.messages[0].content;
  assert.deepEqual(parts[0], { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'aGVsbG8=' } });
  assert.equal(parts[1].type, 'document');
  assert.equal(parts[1].source.media_type, 'application/pdf');
  assert.equal(parts[1].title, 'notes.pdf');
  assert.equal(parts[2].type, 'text');
});
test('invalid media, oversized files and assistant attachments are rejected', () => {
  const request = attachments => buildRequest(provider('openai'), [{ role: 'user', content: 'hi', attachments }], 'model');
  assert.throws(() => request([{ ...files[0], data: 'https://example.com/private-image' }]), /format/);
  assert.throws(() => request([{ ...files[0], data: 'data:image/svg+xml;base64,aGVsbG8=' }]), /format/);
  assert.throws(() => request([{ ...files[1], kind: 'image' }]), /format/);
  assert.throws(() => request(Array(6).fill(files[0])), /attachments/);
  assert.throws(() => request([{ ...files[2], text: 'x'.repeat(512001) }]), /500 KB/);
  assert.throws(() => buildRequest(provider('openai'), [{ role: 'assistant', content: 'hi', attachments: files }], 'model'), /attachments/);
});
