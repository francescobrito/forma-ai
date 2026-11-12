// Shared by the UI and proxy so the visible capability matches the request.
export function effortMode(provider, model = '') {
  if (!provider) return 'none';
  const name = model.toLowerCase().split('/').at(-1);
  if (provider.protocol === 'anthropic') {
    if (/^claude-(?:opus|sonnet)-4-[6-9](?:-|$)/.test(name)) return 'adaptive';
    if (/^claude-(?:3-7-sonnet|(?:opus|sonnet|haiku)-4)(?:[-.]|$)/.test(name)) return 'budget';
    return 'none';
  }
  try { if (new URL(provider.url).hostname === 'openrouter.ai') return 'router'; } catch {}
  if (/(?:-chat-latest|^o1-(?:mini|preview))/.test(name)) return 'none';
  if (/^(?:o[134](?:-|$)|gpt-[56](?:[.-]|$)|gpt-oss(?:-|$))/.test(name)) return 'openai';
  return 'none';
}

export function effectiveEffort(provider, model, effort) {
  const mode = effortMode(provider, model);
  const highOnly = ['openai', 'router'].includes(mode) && model.toLowerCase().split('/').at(-1) === 'gpt-5-pro';
  return highOnly ? 'high' : effort;
}

export function reasoningOptions(provider, model, effort) {
  if (effort === undefined) return {};
  if (!['low', 'medium', 'high'].includes(effort)) throw new Error('Choose low, medium or high reasoning effort.');
  const mode = effortMode(provider, model);
  if (mode === 'openai') {
    if (model.toLowerCase().split('/').at(-1) === 'gpt-5-pro' && effort !== 'high') throw new Error('This model supports high reasoning effort only.');
    return { reasoning_effort: effort };
  }
  if (mode === 'router') return { reasoning: { effort } };
  if (mode === 'adaptive') return { thinking: { type: 'adaptive' }, output_config: { effort }, max_tokens: 16384 };
  if (mode === 'budget') {
    const budget = { low: 1024, medium: 4096, high: 8192 }[effort];
    return { thinking: { type: 'enabled', budget_tokens: budget }, max_tokens: budget + 4096 };
  }
  return {};
}
