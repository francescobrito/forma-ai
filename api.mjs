import { reasoningOptions } from './public/model-options.js';

export function resolveProtocol(provider, model = '') {
  if (provider.protocol !== 'openai') return provider.protocol;
  const url = new URL(provider.url);
  return (url.hostname === 'agentrouter.org' && /^gpt-/i.test(model)) || /\/responses\/?$/.test(url.pathname) ? 'responses' : 'openai';
}

export function endpoint(raw, protocol, resource) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Use an HTTP or HTTPS API URL without credentials, query parameters, or fragments.');
  }
  let path = url.pathname.replace(/\/+$/, '');
  path = path.replace(/\/(chat\/completions|responses|messages|models)$/, '');
  if (!path) path = '/v1';
  if (protocol === 'anthropic' && !path.endsWith('/v1')) path += '/v1';
  url.pathname = path + '/' + resource;
  return url.toString();
}

export function buildRequest(provider, messages, model, systemPrompt, effort) {
  if (!provider || !provider.url || !['openai', 'responses', 'anthropic'].includes(provider.protocol)) throw new Error('Choose a valid API provider in Settings.');
  if (typeof model !== 'string' || !model.trim()) throw new Error('Choose a model before sending a message.');
  if (!Array.isArray(messages) || !messages.length || messages.some(m => !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string')) throw new Error('Invalid conversation.');
  const protocol = resolveProtocol(provider, model);
  const convertedMessages = messages.map(message => convertMessage(message, protocol));
  const reasoning = reasoningOptions(provider, model, effort);
  const headers = { 'Content-Type': 'application/json' };
  if (protocol === 'anthropic') {
    if (!provider.key) throw new Error('Add your Anthropic API key in Settings.');
    headers['x-api-key'] = provider.key;
    headers['anthropic-version'] = '2023-06-01';
    return { protocol, url: endpoint(provider.url, protocol, 'messages'), headers, body: { model, messages: convertedMessages, max_tokens: 4096, stream: true, ...reasoning, ...(systemPrompt ? { system: systemPrompt } : {}) } };
  }
  if (provider.key) headers.Authorization = 'Bearer ' + provider.key;
  if (protocol === 'responses') {
    const responseReasoning = reasoning.reasoning || (reasoning.reasoning_effort ? { effort: reasoning.reasoning_effort } : undefined);
    return { protocol, url: endpoint(provider.url, protocol, 'responses'), headers, body: { model, input: convertedMessages, stream: true, store: false, ...(systemPrompt ? { instructions: systemPrompt } : {}), ...(responseReasoning ? { reasoning: responseReasoning } : {}) } };
  }
  return { protocol, url: endpoint(provider.url, protocol, 'chat/completions'), headers, body: { model, messages: [...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []), ...convertedMessages], stream: true, ...reasoning } };
}

function convertMessage(message, protocol) {
  if (message.attachments !== undefined && (!Array.isArray(message.attachments) || message.attachments.length > 5 || message.role !== 'user')) throw new Error('Invalid attachments.');
  if (!message.attachments?.length) return { role: message.role, content: message.content };
  const textType = protocol === 'responses' ? 'input_text' : 'text';
  const content = message.content ? [{ type: textType, text: message.content }] : [];
  let total = 0;
  for (const attachment of message.attachments) {
    if (!attachment || typeof attachment.name !== 'string' || !attachment.name || attachment.name.length > 250) throw new Error('Invalid attachment name.');
    if (attachment.kind === 'text') {
      if (typeof attachment.text !== 'string' || Buffer.byteLength(attachment.text) > 500 * 1024) throw new Error('Text files must be 500 KB or smaller.');
      total += Buffer.byteLength(attachment.text);
      content.push({ type: textType, text: `Attached file: ${attachment.name}\n\n${attachment.text}` });
      continue;
    }
    const match = typeof attachment.data === 'string' && /^data:(image\/(?:jpeg|png|webp|gif)|application\/pdf);base64,([A-Za-z0-9+/]+={0,2})$/.exec(attachment.data);
    if (!match || !['image', 'pdf'].includes(attachment.kind) || (attachment.kind === 'pdf') !== (match[1] === 'application/pdf')) throw new Error('Invalid attachment format.');
    const size = Buffer.from(match[2], 'base64').length; if (size > 5 * 1024 * 1024) throw new Error('Each file must be 5 MB or smaller.'); total += size;
    if (protocol === 'anthropic') {
      const source = { type: 'base64', media_type: match[1], data: match[2] };
      content.push(attachment.kind === 'image' ? { type: 'image', source } : { type: 'document', source, title: attachment.name });
    } else if (protocol === 'responses') {
      content.push(attachment.kind === 'image' ? { type: 'input_image', image_url: attachment.data } : { type: 'input_file', filename: attachment.name, file_data: attachment.data });
    } else {
      content.push(attachment.kind === 'image' ? { type: 'image_url', image_url: { url: attachment.data } } : { type: 'file', file: { filename: attachment.name, file_data: attachment.data } });
    }
  }
  if (total > 8 * 1024 * 1024) throw new Error('Attachments must total 8 MB or less.');
  return { role: message.role, content };
}

// Handles SSE records split across chunks, LF/CRLF, and multiline data fields.
export async function* parseSSE(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const records = function* () {
    let match;
    while ((match = /\r?\n\r?\n/.exec(buffer))) {
      const record = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      const data = record.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n');
      if (data) yield data;
    }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      yield* records();
    }
    buffer += decoder.decode();
    buffer += '\n\n';
    yield* records();
  } finally { reader.releaseLock(); }
}

export function extractDelta(data, protocol) {
  if (data === '[DONE]') return { done: true };
  const event = JSON.parse(data);
  if (event.error) throw new Error(event.error.message || 'The provider returned an error.');
  if (protocol === 'responses') {
    if (event.type === 'response.failed') throw new Error(event.response?.error?.message || 'The provider returned an error.');
    if (event.type === 'response.incomplete') throw new Error('The model response was incomplete. Try again or choose another model.');
    if (event.type === 'response.completed') return { done: true };
    if (event.type === 'response.output_text.delta') return { text: typeof event.delta === 'string' ? event.delta : '' };
    return {};
  }
  if (protocol === 'anthropic') {
    if (event.type === 'message_stop') return { done: true };
    return { text: event.type === 'content_block_delta' && event.delta?.type === 'text_delta' ? event.delta.text : '' };
  }
  const text = event.choices?.[0]?.delta?.content;
  return { text: typeof text === 'string' ? text : '', ...(event.choices?.[0]?.finish_reason ? { done: true } : {}) };
}

export function extractText(data, protocol) {
  if (data.error) throw new Error(data.error.message || 'The provider returned an error.');
  if (protocol === 'responses') {
    if (data.status === 'failed') throw new Error('The provider returned an error.');
    if (typeof data.output_text === 'string') return data.output_text;
    const parts = (data.output || []).filter(item => item.type === 'message').flatMap(item => item.content || []).filter(part => part.type === 'output_text' && typeof part.text === 'string');
    return parts.length ? parts.map(part => part.text).join('') : undefined;
  }
  return protocol === 'anthropic' ? data.content?.filter(c => c.type === 'text').map(c => c.text).join('') : data.choices?.[0]?.message?.content;
}
