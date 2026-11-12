import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest } from '../api.mjs';
import { effectiveEffort } from '../public/model-options.js';
const provider = { protocol: 'openai', url: 'https://api.example.com/v1', key: 'test-key' };
const messages = [{ role: 'user', content: 'Solve this' }];

test('high-only models remain usable with the saved default effort', () => {
  const effort = effectiveEffort(provider, 'gpt-5-pro', 'medium');
  assert.equal(effort, 'high');
  assert.equal(buildRequest(provider, messages, 'gpt-5-pro', '', effort).body.reasoning_effort, 'high');
  assert.equal(effectiveEffort(provider, 'o3', 'medium'), 'medium');
  assert.equal(effectiveEffort({ ...provider, url: 'https://openrouter.ai/api/v1' }, 'openai/gpt-5-pro', 'low'), 'high');
});

test('all three effort levels reach OpenAI-compatible reasoning models', () => {
  for (const model of ['o3', 'o4-mini', 'gpt-5', 'gpt-5.1', 'gpt-oss-120b']) {
    for (const effort of ['low', 'medium', 'high']) {
      const request = buildRequest(provider, messages, model, 'Respond concisely.', effort);
      assert.equal(request.body.reasoning_effort, effort);
      assert.equal(request.body.messages[0].content, 'Respond concisely.');
    }
  }
});
test('ordinary or unrecognized models retain working text requests', () => {
  for (const model of ['gpt-4o', 'gpt-5-chat-latest', 'o1-mini', 'custom-model']) {
    const request = buildRequest(provider, messages, model, '', 'high');
    assert.equal(request.body.reasoning_effort, undefined);
    assert.equal(request.body.thinking, undefined);
  }
  assert.equal(buildRequest(provider, messages, 'o3').body.reasoning_effort, undefined);
  assert.throws(() => buildRequest(provider, messages, 'o3', '', 'extreme'), /Choose low/);
  assert.throws(() => buildRequest(provider, messages, 'gpt-5-pro', '', 'low'), /high reasoning effort only/);
});
test('OpenRouter receives its nested reasoning setting', () => {
  const router = { ...provider, url: 'https://openrouter.ai/api/v1' };
  assert.deepEqual(buildRequest(router, messages, 'openai/o3', '', 'high').body.reasoning, { effort: 'high' });
});
test('Anthropic uses valid thinking budgets and leaves room for the answer', () => {
  const anthropic = { ...provider, protocol: 'anthropic' };
  for (const [effort, budget] of [['low', 1024], ['medium', 4096], ['high', 8192]]) {
    const body = buildRequest(anthropic, messages, 'claude-sonnet-4-5', '', effort).body;
    assert.deepEqual(body.thinking, { type: 'enabled', budget_tokens: budget });
    assert.equal(body.max_tokens, budget + 4096);
  }
  const adaptive = buildRequest(anthropic, messages, 'claude-opus-4-6', '', 'high').body;
  assert.deepEqual(adaptive.thinking, { type: 'adaptive' });
  assert.deepEqual(adaptive.output_config, { effort: 'high' });
  assert.equal(buildRequest(anthropic, messages, 'claude-3-5-sonnet', '', 'high').body.thinking, undefined);
});
