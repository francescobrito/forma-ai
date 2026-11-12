import { t, getLanguage, setLanguage, translate, installTranslations } from './i18n.js';
import { createAttachmentManager, conversationWithFiles, getAttachment, deleteAttachments } from './attachments.js';
import { effortMode, effectiveEffort } from './model-options.js';
import { requireAccount, storageKey } from './auth.js';
await requireAccount();
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const paths = {
  sparkle: '<path d="M12 2c1.4 6.3 3.7 8.6 10 10-6.3 1.4-8.6 3.7-10 10C10.6 15.7 8.3 13.4 2 12 8.3 10.6 10.6 8.3 12 2Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  settings: '<path d="m9.4 3-.6 2.1-2 .9-2.1-.5-2.6 4.4 1.5 1.6v2.3l-1.5 1.6 2.6 4.4 2.1-.5 2 .9.6 2.1h5.2l.6-2.1 2-.9 2.1.5 2.6-4.4-1.5-1.6v-2.3l1.5-1.6-2.6-4.4-2.1.5-2-.9-.6-2.1Z"/><circle cx="12" cy="12" r="3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.8 2.8 0 1 1 4.7 2c-1.2.9-1.9 1.1-1.9 3M12 17h.01"/>',
  'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
  'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-left': '<path d="M20 12H4m6-6-6 6 6 6"/>',
  'arrow-up': '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  moon: '<path d="M21 13a9 9 0 0 1-10-10A9 9 0 1 0 21 13Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  sliders: '<path d="M4 6h4m4 0h8M4 12h10m4 0h2M4 18h2m4 0h10"/><circle cx="10" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
  pen: '<path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM13 6l5 5"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  lightbulb: '<path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h6"/>',
  leaf: '<path d="M20 3C8 2 2 8 5 16c5 7 16 3 15-13ZM4 21 16 9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  edit: '<path d="m15 4 5 5-10 10-6 1 1-6L15 4ZM12 7l5 5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="m3 3 18 18M10 5c7-1 12 7 12 7a19 19 0 0 1-4 4M6 6a19 19 0 0 0-4 6s4 7 10 7a13 13 0 0 0 5-1M10 10a3 3 0 0 0 4 4"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  retry: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none"/>',
  chat: '<path d="M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-5 2 1-5a10 10 0 0 1-1-4 9 9 0 0 1 18-1Z"/>',
  terminal: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m6 8 4 4-4 4m7 0h5"/>'
  ,camera: '<path d="M8 5 9.5 3h5L16 5h5v15H3V5Z"/><circle cx="12" cy="12" r="4"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${paths[name] || paths.sparkle}</svg>`;
function hydrate(root = document) { $$('[data-icon]', root).forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
hydrate();

const storage = {
  get(store, key, fallback) { try { return JSON.parse(window[store].getItem(storageKey(key))) ?? fallback; } catch { return fallback; } },
  set(store, key, value) { try { window[store].setItem(storageKey(key), JSON.stringify(value)); return true; } catch { return false; } }
};
const saved = storage.get('localStorage', 'forma.workspace.v1', {});
let providers = Array.isArray(saved.providers) ? saved.providers.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.url === 'string' && Array.isArray(p.models) && ['openai', 'responses', 'anthropic'].includes(p.protocol)).map(p => ({ ...p, models: p.models.filter(m => typeof m === 'string' && m.trim()) })) : [];
let chats = Array.isArray(saved.chats) ? saved.chats.filter(c => c && typeof c.id === 'string' && typeof c.title === 'string' && Array.isArray(c.messages)).map(c => ({ ...c, messages: c.messages.filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').map(m => m.status === 'streaming' ? { ...m, status: 'stopped' } : m) })) : [];
let activeProvider = saved.activeProvider || providers[0]?.id || null;
let activeModel = typeof saved.activeModel === 'string' ? saved.activeModel : '';
let currentChatId = null;
let prefs = { language: ['en', 'ru'].includes(saved.prefs?.language) ? saved.prefs.language : getLanguage(), theme: saved.prefs?.theme === 'dark' ? 'dark' : 'light', style: saved.prefs?.style === 'detailed' ? 'detailed' : 'concise', effort: ['low', 'medium', 'high'].includes(saved.prefs?.effort) ? saved.prefs.effort : 'medium', instructions: typeof saved.prefs?.instructions === 'string' ? saved.prefs.instructions : '' };
setLanguage(prefs.language);
const keys = { ...storage.get('localStorage', 'forma.remembered-keys.v1', {}), ...storage.get('sessionStorage', 'forma.session-keys.v1', {}) };
let activeController = null;
let settingsTab = 'providers';
let providerEdit = null;
let category = 'write';
let toastTimeout;
let storageWarningShown = false;
let attachments = null;
let sendingFiles = false;
const id = () => crypto.randomUUID();
const currentChat = () => chats.find(c => c.id === currentChatId);
const selectedProvider = () => providers.find(p => p.id === activeProvider);

function persist() {
  const stored = storage.set('localStorage', 'forma.workspace.v1', { providers: providers.map(({ key, ...provider }) => provider), chats, activeProvider, activeModel, prefs });
  const remembered = Object.fromEntries(providers.filter(p => p.remember && keys[p.id]).map(p => [p.id, keys[p.id]]));
  const temporary = Object.fromEntries(providers.filter(p => !p.remember && keys[p.id]).map(p => [p.id, keys[p.id]]));
  storage.set('localStorage', 'forma.remembered-keys.v1', remembered);
  storage.set('sessionStorage', 'forma.session-keys.v1', temporary);
  if (!stored && !storageWarningShown) { storageWarningShown = true; toast('Browser storage is full or unavailable. New changes may not be saved.'); }
}

function toast(message) { clearTimeout(toastTimeout); $('#toast').textContent = t(message); $('#toast').hidden = false; toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 4000); }
function applyTheme() { document.documentElement.classList.toggle('dark', prefs.theme === 'dark'); $('#theme-toggle').innerHTML = icon(prefs.theme === 'dark' ? 'sun' : 'moon'); $('#theme-toggle').setAttribute('aria-label', `Switch to ${prefs.theme === 'dark' ? 'light' : 'dark'} theme`); }
applyTheme();

const suggestionSets = {
  write: [
    ['lightbulb', '', 'Find the right words', 'Turn a rough idea into something great', 'Help me turn a rough idea into a clear, compelling piece of writing. Start by asking me about the idea and who it is for.'],
    ['mail', 'lavender', 'An email, but better', 'Make your message sound like you', 'Help me write an email that sounds natural and gets my point across. Ask me who it is for, what I need to say, and the tone I want.'],
    ['file', 'peach', 'A fresh perspective', 'Bring a new angle to your story', 'Help me brainstorm three fresh angles for a story. Ask me about the topic, audience, and what I have already tried.'],
    ['pen', 'blue', 'Make it more you', 'Polish your writing, keep your voice', 'Help me polish a piece of writing while preserving my voice. Ask me to share the draft and what I would like to improve.']
  ],
  learn: [
    ['book', '', 'Make it click', 'Understand something complex, simply', 'Help me understand a complex topic using simple explanations and concrete examples. Ask me what topic I want to learn and what I already know.'],
    ['lightbulb', 'lavender', 'Follow your curiosity', 'Ask the questions behind the questions', 'Guide me through an interesting subject with questions that help me discover the answers. Ask me what I am curious about.'],
    ['file', 'peach', 'Build a learning plan', 'Small steps toward a new skill', 'Help me build a realistic learning plan for a new skill. Ask me about the skill, my experience, and the time I can commit.'],
    ['globe', 'blue', 'Practice a language', 'A conversation that helps you grow', 'Be my language conversation partner. Ask which language I am learning and my level, then help me practice with gentle corrections.']
  ],
  build: [
    ['code', '', 'From idea to code', 'Get a hand with your next project', 'Help me turn a project idea into working code. Ask about the project, my preferred language, and the first feature I want to build.'],
    ['terminal', 'lavender', 'Untangle a bug', 'Find what is going wrong, and why', 'Help me debug a problem step by step. Ask me for the relevant code, the error, and the behavior I expected.'],
    ['layers', 'peach', 'Think through a system', 'Give your big idea a solid foundation', 'Help me think through the architecture of a software system. Ask what it should do, how many users it will have, and my constraints.'],
    ['lightbulb', 'blue', 'Ship something useful', 'Break your next project into steps', 'Help me scope a small, useful project and break it into achievable steps. Ask about my idea and available time.']
  ],
  explore: [
    ['compass', '', 'Somewhere new', 'Plan a trip that feels like you', 'Help me plan a thoughtful trip. Ask about the destination, dates, budget, and what I enjoy doing.'],
    ['leaf', 'lavender', 'A better everyday', 'Make a little room for what matters', 'Help me improve my daily routine in a realistic way. Ask about my current routine and the one thing I most want to change.'],
    ['lightbulb', 'peach', 'What if…', 'See where an unexpected idea leads', 'Let us explore a creative what-if scenario together. Offer three intriguing starting points and let me choose one.'],
    ['globe', 'blue', 'Connect the dots', 'Discover something worth thinking about', 'Introduce me to an interesting connection between two seemingly unrelated subjects. Ask about my interests first.']
  ]
};
const categories = [['write', 'pen', 'Write'], ['learn', 'book', 'Learn'], ['build', 'code', 'Build'], ['explore', 'compass', 'Explore']];
function renderSuggestions() {
  $('#categories').innerHTML = categories.map(([key, glyph, label]) => `<button class="category ${category === key ? 'active' : ''}" id="category-${key}" role="tab" aria-selected="${category === key}" aria-controls="suggestions" tabindex="${category === key ? '0' : '-1'}" data-category="${key}">${icon(glyph)}${label}</button>`).join('');
  $('#suggestions').setAttribute('aria-labelledby', `category-${category}`);
  $('#suggestions').innerHTML = suggestionSets[category].map(([glyph, color, title, desc], i) => `<button class="suggestion-card" data-suggestion="${i}"><span class="suggestion-symbol ${color}">${icon(glyph)}</span><span class="suggestion-copy"><strong>${title}</strong><small>${desc}</small></span><span class="suggestion-arrow">${icon('arrow-up-right')}</span></button>`).join('');
}
renderSuggestions();
$('#categories').addEventListener('click', e => { const button = e.target.closest('[data-category]'); if (button) { category = button.dataset.category; renderSuggestions(); $(`#category-${category}`).focus(); } });
$('#categories').addEventListener('keydown', e => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return; e.preventDefault(); let index = categories.findIndex(c => c[0] === category); index = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (index + (e.key === 'ArrowRight' ? 1 : -1) + 4) % 4; category = categories[index][0]; renderSuggestions(); $(`#category-${category}`).focus(); });
$('#suggestions').addEventListener('click', e => { const card = e.target.closest('[data-suggestion]'); if (card) { $('#prompt').value = t(suggestionSets[category][Number(card.dataset.suggestion)][4]); resizePrompt(); $('#prompt').focus(); } });

function renderHeader() {
  const provider = selectedProvider();
  if (provider && !provider.models.includes(activeModel)) activeModel = provider.models[0] || '';
  $('#active-provider-label').textContent = provider?.name || 'Forma';
  $('#active-model-label').textContent = provider ? activeModel || t('Add a model in Settings') : t('Choose a model');
  $('#composer-provider-name').textContent = provider?.name || t('Choose your AI');
  $('#connection-banner').hidden = !!provider;
  $('#response-style-label').textContent = t(prefs.style === 'detailed' ? 'Detailed' : 'Concise');
  $('#reasoning-effort-label').textContent = t(({ low: 'Low', medium: 'Medium', high: 'High' })[effectiveEffort(provider, activeModel, prefs.effort)]);
  $('#reasoning-effort').classList.toggle('effort-inactive', !!provider && effortMode(provider, activeModel) === 'none');
  $('#connect-card').innerHTML = provider ? `<span class="connect-icon">${icon('layers')}</span><span><strong>${providers.length} provider${providers.length === 1 ? '' : 's'} connected</strong><small>Manage your AI connections</small></span><span class="card-arrow">${icon('arrow-up-right')}</span>` : `<span class="connect-icon">${icon('layers')}</span><span><strong>Bring your own AI</strong><small>Connect your favorite models</small></span><span class="card-arrow">${icon('arrow-up-right')}</span>`;
  $('#export-chat').hidden = !currentChat();
  updateSendButton();
}
function updateSendButton() { const busy = !!activeController; const button = $('#send-button'); button.disabled = !busy && (sendingFiles || attachments?.busy() || (!$('#prompt').value.trim() && !attachments?.has())); button.type = busy ? 'button' : 'submit'; button.classList.toggle('running', busy); button.innerHTML = icon(busy ? 'stop' : 'arrow-up'); button.setAttribute('aria-label', t(busy ? 'Stop generating' : 'Send message')); }
function renderModelMenu() {
  $('#model-menu').innerHTML = '<div class="menu-title">CHOOSE YOUR MODEL</div>' + (providers.length ? providers.map(provider => `<div class="menu-title" data-user-content>${escapeHTML(provider.name)}</div>` + (provider.models.length ? provider.models.map(model => `<button class="model-option ${provider.id === activeProvider && model === activeModel ? 'selected' : ''}" data-select-provider="${escapeHTML(provider.id)}" data-select-model="${escapeHTML(model)}"><span class="provider-initial">${escapeHTML(provider.name[0].toUpperCase())}</span><span><strong data-user-content>${escapeHTML(model)}</strong><small>${provider.protocol === 'anthropic' ? 'Anthropic' : provider.protocol === 'responses' ? 'OpenAI Responses' : 'OpenAI-compatible'}</small></span>${provider.id === activeProvider && model === activeModel ? icon('check') : ''}</button>`).join('') : '<p class="menu-empty">Add a model name in provider settings.</p>')).join('') : '<p class="menu-empty">Your favorite AI, all in one place.<br>Connect a provider to choose your model.</p>') + `<button class="menu-footer" data-manage-providers>${icon('plus')}Manage providers</button>`;
}
function toggleModelMenu() { const menu = $('#model-menu'); const open = menu.hidden; if (open) renderModelMenu(); menu.hidden = !open; $('#model-switcher').setAttribute('aria-expanded', String(open)); if (open) $('button', menu)?.focus(); }
function closeModelMenu() { $('#model-menu').hidden = true; $('#model-switcher').setAttribute('aria-expanded', 'false'); }
$('#model-switcher').addEventListener('click', toggleModelMenu);
$('#composer-provider').addEventListener('click', toggleModelMenu);
$('#model-menu').addEventListener('click', e => {
  const choice = e.target.closest('[data-select-provider]');
  if (choice) { activeProvider = choice.dataset.selectProvider; activeModel = choice.dataset.selectModel; persist(); renderHeader(); closeModelMenu(); $('#prompt').focus(); }
  if (e.target.closest('[data-manage-providers]')) { closeModelMenu(); openSettings(); }
});
document.addEventListener('click', e => { if (!e.target.closest('.model-switcher-wrap') && !e.target.closest('#composer-provider')) closeModelMenu(); });

function renderHistory() {
  $('#chat-count').textContent = chats.length;
  if (!chats.length) { $('#chat-history').innerHTML = '<p class="empty-history">A space for your next big idea.<br>Your conversations will appear here.</p>'; return; }
  let group = '';
  $('#chat-history').innerHTML = [...chats].sort((a, b) => b.updatedAt - a.updatedAt).map(chat => {
    const date = new Date(chat.updatedAt).toDateString() === new Date().toDateString() ? 'Today' : 'Earlier';
    const heading = group !== date ? `<div class="history-group-label">${date}</div>` : ''; group = date;
    return `${heading}<div class="history-row ${chat.id === currentChatId ? 'active' : ''}"><button class="history-chat" data-chat="${escapeHTML(chat.id)}">${icon('chat')}<span data-user-content>${escapeHTML(chat.title)}</span></button><button class="icon-button history-delete" data-delete-chat="${escapeHTML(chat.id)}" aria-label="Delete ${escapeHTML(chat.title)}">${icon('trash')}</button></div>`;
  }).join('');
}
$('#chat-history').addEventListener('click', e => {
  const deletion = e.target.closest('[data-delete-chat]');
  if (deletion) { confirmAction('Delete conversation?', 'This conversation will be permanently removed from this device.', 'Delete conversation', () => { if (deletion.dataset.deleteChat === currentChatId) { stopGeneration(); currentChatId = null; } const deleted = chats.find(c => c.id === deletion.dataset.deleteChat); chats = chats.filter(c => c.id !== deletion.dataset.deleteChat); deleteAttachments(deleted?.messages.flatMap(m => (m.attachments || []).map(file => file.id)) || []); persist(); renderAll(); }); return; }
  const button = e.target.closest('[data-chat]');
  if (button) selectChat(button.dataset.chat);
});
function selectChat(chatId) { stopGeneration(); currentChatId = chatId; closeSidebar(); renderAll(); scrollToBottom(); }
function newChat() { stopGeneration(); attachments?.clear(); currentChatId = null; $('#prompt').value = ''; resizePrompt(); renderAll(); closeSidebar(); $('#prompt').focus(); }
$('#new-chat').addEventListener('click', newChat);

function inlineMarkdown(raw) {
  const tokens = /`([^`]+)`|\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  let output = '', cursor = 0, match;
  while ((match = tokens.exec(raw))) {
    output += escapeHTML(raw.slice(cursor, match.index));
    if (match[1] !== undefined) output += `<code>${escapeHTML(match[1])}</code>`;
    else if (match[2] !== undefined) {
      let safe = false; try { safe = ['http:', 'https:'].includes(new URL(match[3]).protocol); } catch {}
      output += safe ? `<a href="${escapeHTML(match[3])}" target="_blank" rel="noopener noreferrer">${escapeHTML(match[2])}</a>` : escapeHTML(match[0]);
    } else if (match[4] !== undefined) output += `<strong>${escapeHTML(match[4])}</strong>`;
    else output += `<em>${escapeHTML(match[5])}</em>`;
    cursor = match.index + match[0].length;
  }
  return output + escapeHTML(raw.slice(cursor));
}
function markdown(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let output = '', paragraph = [], list = null, inCode = false, code = [], language = '';
  const flush = () => { if (paragraph.length) { output += `<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`; paragraph = []; } if (list) { output += `</${list}>`; list = null; } };
  const flushCode = () => { output += `<div class="code-block"><div class="code-heading"><span>${escapeHTML(language || 'code')}</span><button data-copy-code>${t('Copy code')}</button></div><pre><code>${escapeHTML(code.join('\n'))}</code></pre></div>`; code = []; };
  for (const line of lines) {
    if (/^\s*```/.test(line)) { if (inCode) { flushCode(); inCode = false; } else { flush(); inCode = true; language = line.trim().slice(3).trim(); } continue; }
    if (inCode) { code.push(line); continue; }
    if (!line.trim()) { flush(); continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) { flush(); output += `<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`; continue; }
    const item = /^\s*(?:([-*])|(\d+)\.)\s+(.+)$/.exec(line);
    if (item) { if (paragraph.length) { output += `<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`; paragraph = []; } const type = item[1] ? 'ul' : 'ol'; if (list !== type) { if (list) output += `</${list}>`; list = type; output += `<${type}>`; } output += `<li>${inlineMarkdown(item[3])}</li>`; continue; }
    if (line.startsWith('> ')) { flush(); output += `<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`; continue; }
    if (list) { output += `</${list}>`; list = null; }
    paragraph.push(line);
  }
  flush(); if (inCode) flushCode(); return output;
}
function messageHTML(message, index, chat) {
  if (message.role === 'user') return `<article class="message user">${message.attachments?.length ? `<div class="message-attachments">${message.attachments.map(file => `<button class="message-attachment" data-open-attachment="${escapeHTML(file.id)}" aria-label="${t('Open attachment')}">${file.kind === 'image' ? `<img data-attachment-image="${escapeHTML(file.id)}" alt="${escapeHTML(file.name)}">` : icon('file')}<span data-user-content>${escapeHTML(file.name)}</span></button>`).join('')}</div>` : ''}${message.content ? `<div class="user-bubble">${escapeHTML(message.content)}</div>` : ''}</article>`;
  const last = index === chat.messages.length - 1;
  return `<article class="message assistant" data-message="${escapeHTML(message.id)}"><div class="assistant-heading"><span class="assistant-mark">${icon('sparkle')}</span><span data-user-content>${escapeHTML(message.providerName || 'Forma')} <span class="model-subtitle">· ${escapeHTML(message.model || '')}</span></span></div><div class="message-content">${message.content ? markdown(message.content) : message.status === 'streaming' ? '<span class="thinking" aria-label="Generating response"><i></i><i></i><i></i></span>' : ''}</div>${message.error ? `<div class="message-error">${escapeHTML(message.error)}</div>` : ''}${message.status === 'stopped' ? '<p class="message-status">Response stopped</p>' : ''}${message.status !== 'streaming' ? `<div class="message-actions">${message.content ? `<button class="icon-button" data-copy-message="${escapeHTML(message.id)}" aria-label="Copy response">${icon('copy')}</button>` : ''}${last ? `<button class="icon-button" data-retry aria-label="Regenerate response">${icon('retry')}</button>` : ''}</div>` : ''}</article>`;
}
const imageURLs = new Set();
function renderConversation() { imageURLs.forEach(url => URL.revokeObjectURL(url)); imageURLs.clear(); const chat = currentChat(); $('#welcome').hidden = !!chat; $('#messages').hidden = !chat; if (chat) { $('#messages').innerHTML = chat.messages.map((m, i) => messageHTML(m, i, chat)).join(''); $$('[data-attachment-image]').forEach(async image => { try { const blob = await getAttachment(image.dataset.attachmentImage); if (blob && image.isConnected) { const url = URL.createObjectURL(blob); imageURLs.add(url); image.src = url; } } catch {} }); } else $('#messages').innerHTML = ''; }
function renderAll() { renderHeader(); renderHistory(); renderConversation(); }
function scrollToBottom() { const area = $('#conversation-area'); area.scrollTop = area.scrollHeight; }
function updateStreamingMessage(chat, message) {
  if (currentChatId !== chat.id) return;
  const area = $('#conversation-area'); const stick = area.scrollHeight - area.scrollTop - area.clientHeight < 100;
  const article = $(`[data-message="${message.id}"]`);
  if (article) $('.message-content', article).innerHTML = markdown(message.content);
  if (stick) scrollToBottom();
}
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); } catch { toast('Clipboard is unavailable in this browser. Select the text to copy it.'); } }
async function openAttachment(fileId) {
  try {
    const file = currentChat()?.messages.flatMap(message => message.attachments || []).find(attachment => attachment.id === fileId);
    const blob = await getAttachment(fileId);
    if (!file || !blob) throw new Error('An attachment is no longer available on this device. Attach it again in a new message.');
    const url = URL.createObjectURL(blob);
    if (file.kind === 'image') {
      smallDialog(file.name, `<img class="attachment-full-image" src="${url}" alt="${escapeHTML(file.name)}">`);
      $('#small-dialog-title').setAttribute('data-user-content', '');
      $('#small-dialog').addEventListener('close', () => { URL.revokeObjectURL(url); $('#small-dialog-title').removeAttribute('data-user-content'); }, { once: true });
    } else {
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (error) { toast(error.message); }
}
$('#messages').addEventListener('click', e => {
  const fileButton = e.target.closest('[data-open-attachment]'); if (fileButton) { openAttachment(fileButton.dataset.openAttachment); return; }
  const code = e.target.closest('[data-copy-code]'); if (code) return copy($('pre code', code.closest('.code-block')).textContent);
  const button = e.target.closest('[data-copy-message]'); if (button) return copy(currentChat()?.messages.find(m => m.id === button.dataset.copyMessage)?.content || '');
  if (e.target.closest('[data-retry]')) regenerate();
});

function resizePrompt() { const textarea = $('#prompt'); textarea.style.height = 'auto'; textarea.style.height = Math.min(textarea.scrollHeight, matchMedia('(max-width:760px)').matches ? 140 : 180) + 'px'; updateSendButton(); }
$('#prompt').addEventListener('input', resizePrompt);
$('#prompt').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !matchMedia('(pointer:coarse)').matches) { e.preventDefault(); if (!activeController) send(); } });
$('#chat-form').addEventListener('submit', e => { e.preventDefault(); send(); });
$('#send-button').addEventListener('click', () => { if (activeController) stopGeneration(); });
function stopGeneration() { if (activeController) { activeController.abort(); activeController = null; updateSendButton(); } }
function styleInstructions() { return prefs.style === 'detailed' ? 'Give thorough explanations with concrete examples and a clear structure.' : 'Respond concisely. Focus on the useful essentials and avoid unnecessary detail.'; }
function systemPrompt() { return [prefs.instructions.trim(), styleInstructions()].filter(Boolean).join('\n\n'); }
async function* streamEvents(stream) {
  const reader = stream.getReader(); const decoder = new TextDecoder(); let buffer = '';
  try { while (true) { const { done, value } = await reader.read(); buffer += done ? decoder.decode() + '\n\n' : decoder.decode(value, { stream: true }); let boundary; while ((boundary = /\r?\n\r?\n/.exec(buffer))) { const record = buffer.slice(0, boundary.index); buffer = buffer.slice(boundary.index + boundary[0].length); const data = record.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n'); if (data) yield JSON.parse(data); } if (done) break; } } finally { reader.releaseLock(); }
}
function validateConnection() {
  const provider = selectedProvider();
  if (!provider) { openSettings(); return null; }
  if (!activeModel) { openSettings('providers', provider.id); return null; }
  if (!keys[provider.id] && new URL(provider.url).hostname !== 'localhost' && new URL(provider.url).hostname !== '127.0.0.1' && new URL(provider.url).hostname !== '[::1]') { toast('Add your API key to this provider to start chatting.'); openSettings('providers', provider.id); return null; }
  return provider;
}
async function send() {
  if (activeController || sendingFiles || attachments?.busy()) return;
  let content = $('#prompt').value.trim(); if (!content && !attachments?.has()) return;
  const provider = validateConnection(); if (!provider) return;
  let files;
  sendingFiles = true; updateSendButton();
  try { files = await attachments.consume(); } catch (error) { toast(error.message); return; } finally { sendingFiles = false; updateSendButton(); }
  if (!content && files.length) content = t('Analyze the attached files.');
  let chat = currentChat();
  if (!chat) { chat = { id: id(), title: content.length > 44 ? content.slice(0, 44).trim() + '…' : content, messages: [], createdAt: Date.now(), updatedAt: Date.now() }; chats.unshift(chat); currentChatId = chat.id; }
  chat.messages.push({ id: id(), role: 'user', content, ...(files.length ? { attachments: files } : {}) });
  $('#prompt').value = ''; resizePrompt();
  await generate(chat, provider);
}
async function regenerate() {
  if (activeController) return;
  const provider = validateConnection(); if (!provider) return;
  const chat = currentChat(); if (!chat || chat.messages.at(-1)?.role !== 'assistant') return;
  chat.messages.pop(); await generate(chat, provider);
}
async function generate(chat, provider) {
  const controller = new AbortController(); activeController = controller;
  const model = activeModel;
  const effort = effectiveEffort(provider, model, prefs.effort);
  const instructions = systemPrompt();
  const contextMessages = [...chat.messages];
  const message = { id: id(), role: 'assistant', content: '', model, providerName: provider.name, status: 'streaming' };
  chat.messages.push(message); chat.updatedAt = Date.now(); persist(); renderAll(); scrollToBottom();
  let complete = false;
  try {
    const context = await conversationWithFiles(contextMessages);
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: { url: provider.url, protocol: provider.protocol, key: keys[provider.id] || '' }, model, messages: context, systemPrompt: instructions, effort }), signal: controller.signal });
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || `Connection failed (${response.status}).`); }
    for await (const event of streamEvents(response.body)) {
      if (controller.signal.aborted) break;
      if (event.error) throw new Error(event.error);
      if (event.text) { message.content += event.text; updateStreamingMessage(chat, message); }
      if (event.done) { complete = true; break; }
    }
    if (controller.signal.aborted) message.status = 'stopped';
    else if (!complete) throw new Error('The connection ended before the response finished. You can regenerate it.');
    else if (!message.content.trim()) throw new Error('This model returned no text. Try another chat model.');
    else message.status = 'complete';
  } catch (error) {
    if (controller.signal.aborted) message.status = 'stopped';
    else { message.status = 'error'; message.error = error.message === 'Failed to fetch' ? 'Could not reach the workspace server. Check that it is running, then try again.' : error.message; }
  } finally {
    if (activeController === controller) activeController = null;
    persist();
    if (currentChatId === chat.id) renderConversation();
    renderHeader(); renderHistory();
  }
}

function syncSidebarAccessibility() { const mobile = matchMedia('(max-width:760px)').matches; const open = $('#sidebar').classList.contains('mobile-open'); $('#sidebar').inert = mobile ? !open : $('#app').classList.contains('sidebar-closed'); $('.main').inert = mobile && open; }
function openSidebar() { $('#sidebar').classList.add('mobile-open'); $('#sidebar-backdrop').hidden = false; syncSidebarAccessibility(); $('#collapse-sidebar').focus(); }
function closeSidebar() { const focusWasInside = $('#sidebar').contains(document.activeElement); $('#sidebar').classList.remove('mobile-open'); $('#sidebar-backdrop').hidden = true; syncSidebarAccessibility(); if (focusWasInside && matchMedia('(max-width:760px)').matches) $('#show-sidebar').focus(); }
$('#show-sidebar').addEventListener('click', () => { if (matchMedia('(max-width:760px)').matches) openSidebar(); else { $('#app').classList.remove('sidebar-closed'); $('#show-sidebar').hidden = true; syncSidebarAccessibility(); $('#collapse-sidebar').focus(); } });
$('#collapse-sidebar').addEventListener('click', () => { if (matchMedia('(max-width:760px)').matches) closeSidebar(); else { $('#app').classList.add('sidebar-closed'); $('#show-sidebar').hidden = false; syncSidebarAccessibility(); $('#show-sidebar').focus(); } });
$('#sidebar-backdrop').addEventListener('click', closeSidebar);
$('#theme-toggle').addEventListener('click', () => { prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; applyTheme(); persist(); });

function openSettings(tab = 'providers', edit = null) { settingsTab = tab; providerEdit = edit; closeSidebar(); closeModelMenu(); renderSettings(); if (!$('#settings-dialog').open) $('#settings-dialog').showModal(); }
$('#open-settings').addEventListener('click', () => openSettings());
$('#connect-card').addEventListener('click', () => openSettings());
$('#banner-connect').addEventListener('click', () => openSettings());
$('#close-settings').addEventListener('click', () => $('#settings-dialog').close());
$$('[data-settings-tab]').forEach(button => button.addEventListener('click', () => { settingsTab = button.dataset.settingsTab; providerEdit = null; renderSettings(); }));
function renderSettings() {
  $$('[data-settings-tab]').forEach(button => { button.classList.toggle('active', button.dataset.settingsTab === settingsTab); button.setAttribute('aria-current', button.dataset.settingsTab === settingsTab ? 'page' : 'false'); });
  if (settingsTab === 'providers') { if (providerEdit) renderProviderForm(providerEdit); else renderProviders(); }
  if (settingsTab === 'preferences') renderPreferences();
  if (settingsTab === 'data') renderData();
}
function renderProviders() {
  $('#settings-content').innerHTML = `<div class="section-heading"><div><h3>Your AI providers</h3><p class="section-description">Different models. One familiar space.<br>Add a provider, then switch whenever you like.</p></div><button class="button primary" data-add-provider>${icon('plus')}Add provider</button></div>` + (providers.length ? `<div class="provider-list">${providers.map(provider => `<div class="provider-card"><div class="provider-card-top"><span class="provider-initial">${escapeHTML(provider.name[0].toUpperCase())}</span><div class="provider-card-details"><strong>${escapeHTML(provider.name)}</strong><small>${escapeHTML(provider.url)}</small></div><button class="icon-button" data-edit-provider="${escapeHTML(provider.id)}" aria-label="Edit ${escapeHTML(provider.name)}">${icon('edit')}</button><button class="icon-button" data-remove-provider="${escapeHTML(provider.id)}" aria-label="Remove ${escapeHTML(provider.name)}">${icon('trash')}</button></div><div class="provider-card-bottom"><span class="badge">${provider.protocol === 'anthropic' ? 'Anthropic' : provider.protocol === 'responses' ? 'OpenAI Responses' : 'OpenAI-compatible'} · ${provider.models.length} model${provider.models.length === 1 ? '' : 's'}</span>${provider.id === activeProvider ? '<span class="badge connected"><span class="badge-dot"></span>Selected</span>' : `<button class="text-button" data-use-provider="${escapeHTML(provider.id)}">Use provider</button>`}${!keys[provider.id] ? '<span class="badge">No API key saved</span>' : ''}</div></div>`).join('')}</div>` : `<div class="providers-empty"><div class="empty-mark">${icon('layers')}</div><strong>Your AI workspace starts here</strong><p>Connect an API with your URL and key.<br>Use a hosted provider or a model running locally.</p><button class="button primary" data-add-provider>${icon('plus')}Connect your first provider</button><div class="provider-logos"><span>OpenAI</span><span>Anthropic</span><span>OpenRouter</span><span>Groq</span><span>Ollama</span></div></div>`) + `<div class="info-note">${icon('lock')}<span>Keys stay in this browser session unless you choose to remember them. Requests pass through the Forma server to the provider you select.</span></div>`;
}
const presets = {
  custom: { name: '', url: '', protocol: 'openai', models: '' },
  agentrouter: { name: 'AgentRouter', url: 'https://agentrouter.org/v1', protocol: 'responses', models: '' },
  openai: { name: 'OpenAI', url: 'https://api.openai.com/v1', protocol: 'openai', models: '' },
  anthropic: { name: 'Anthropic', url: 'https://api.anthropic.com/v1', protocol: 'anthropic', models: '' },
  openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', protocol: 'openai', models: '' },
  groq: { name: 'Groq', url: 'https://api.groq.com/openai/v1', protocol: 'openai', models: '' },
  ollama: { name: 'Ollama', url: 'http://localhost:11434/v1', protocol: 'openai', models: '' }
};
function renderProviderForm(providerId) {
  const provider = providers.find(p => p.id === providerId);
  $('#settings-content').innerHTML = `<div class="form-heading"><button class="icon-button" data-back-providers aria-label="Back to providers">${icon('arrow-left')}</button><h3>${provider ? 'Edit provider' : 'Connect a provider'}</h3></div><form id="provider-form"><div class="field"><label for="provider-preset">Start with a provider</label><select id="provider-preset"><option value="custom">Custom provider</option><option value="openai">OpenAI</option><option value="agentrouter">AgentRouter (Responses)</option><option value="anthropic">Anthropic</option><option value="openrouter">OpenRouter</option><option value="groq">Groq</option><option value="ollama">Ollama (local)</option></select></div><div class="form-row"><div class="field"><label for="provider-name">Display name</label><input id="provider-name" required maxlength="40" placeholder="My AI provider" value="${escapeHTML(provider?.name || '')}"></div><div class="field"><label for="provider-protocol">API format</label><select id="provider-protocol"><option value="openai" ${!provider || provider.protocol === 'openai' ? 'selected' : ''}>OpenAI-compatible</option><option value="responses" ${provider?.protocol === 'responses' ? 'selected' : ''}>OpenAI Responses</option><option value="anthropic" ${provider?.protocol === 'anthropic' ? 'selected' : ''}>Anthropic</option></select></div></div><div class="field"><label for="provider-url">API base URL</label><input id="provider-url" type="url" inputmode="url" required placeholder="https://api.example.com/v1" value="${escapeHTML(provider?.url || '')}" spellcheck="false"><small>Enter the base URL or the full chat endpoint.</small></div><div class="field"><label for="provider-key">API key</label><div class="key-field"><input id="provider-key" type="password" placeholder="Paste your API key" value="${escapeHTML(provider ? keys[provider.id] || '' : '')}" autocomplete="off" spellcheck="false"><button class="icon-button" type="button" id="toggle-key" aria-label="Show API key">${icon('eye')}</button></div><small>Optional for local providers such as Ollama.</small></div><label class="checkbox-field"><input type="checkbox" id="remember-key" ${provider?.remember ? 'checked' : ''}><span><strong>Remember API key on this device</strong><br>Stored in this browser without encryption. Use only on a trusted device.</span></label><div class="field"><div class="label-row"><label for="provider-models">Model names</label><button type="button" id="fetch-models">Fetch from provider</button></div><textarea id="provider-models" required placeholder="${escapeHTML(t('Enter a model ID, or fetch available models'))}" spellcheck="false">${escapeHTML(provider?.models.join('\n') || '')}</textarea><small>One model ID per line, or separated by commas. Use the exact names your provider supports.</small></div><p id="provider-form-error" class="form-error" role="alert" hidden></p><div class="form-actions"><button type="button" class="button secondary" data-back-providers>Cancel</button><button type="submit" class="button primary">${provider ? 'Save changes' : 'Add provider'}</button></div></form>`;
  $('#provider-preset').addEventListener('change', e => { const preset = presets[e.target.value]; $('#provider-name').value = preset.name; $('#provider-url').value = preset.url; $('#provider-protocol').value = preset.protocol; $('#provider-models').value = preset.models; });
  $('#toggle-key').addEventListener('click', () => { const input = $('#provider-key'); input.type = input.type === 'password' ? 'text' : 'password'; $('#toggle-key').innerHTML = icon(input.type === 'password' ? 'eye' : 'eye-off'); $('#toggle-key').setAttribute('aria-label', input.type === 'password' ? 'Show API key' : 'Hide API key'); });
  $('#provider-protocol').closest('.field').insertAdjacentHTML('beforeend', '<small id="protocol-note"></small>');
  function protocolNote() {
    const url = $('#provider-url').value;
    let isAgentRouter = false; try { isAgentRouter = new URL(url).hostname === 'agentrouter.org'; } catch {}
    $('#protocol-note').textContent = t(isAgentRouter ? 'AgentRouter connects through the installed Codex client. Its tools are disabled.' : $('#provider-protocol').value === 'responses' ? 'Uses the /responses endpoint.' : 'Uses the selected API format.');
    const fetchButton = $('#fetch-models'); fetchButton.disabled = isAgentRouter;
    fetchButton.title = t(isAgentRouter ? 'Enter model IDs from AgentRouter. The connection test verifies the first model.' : 'Fetch from provider');
    const checkNote = $('#connection-check-note'); if (checkNote) checkNote.textContent = t(isAgentRouter ? 'AgentRouter testing sends a short request to the first model and uses API credits.' : 'No chat request is sent and no generation credits are used.');
  }
  ['provider-url', 'provider-protocol', 'provider-preset'].forEach(name => $('#' + name).addEventListener('change', protocolNote)); protocolNote();
  $('#fetch-models').closest('.field').insertAdjacentHTML('afterend', '<div class="connection-check"><button class="button secondary" type="button" id="test-connection">Test connection</button><small id="connection-check-note">No chat request is sent and no generation credits are used.</small><p id="connection-result" role="status" hidden></p></div>');
  protocolNote();
  $('#test-connection').addEventListener('click', testConnection);
  $('#fetch-models').addEventListener('click', fetchModels);
  $('#provider-form').addEventListener('submit', e => { e.preventDefault(); saveProvider(provider?.id); });
}
async function testConnection() {
  const values = providerFormValues();
  if (!validURL(values.url)) return formError(t('Enter a valid API URL first.'));
  const button = $('#test-connection'), result = $('#connection-result');
  button.disabled = true; button.textContent = t('Checking…'); result.hidden = true; $('#provider-form-error').hidden = true;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch('/api/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: { url: values.url, protocol: values.protocol, key: values.key }, model: values.models[0] }), signal: controller.signal });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    if (!button.isConnected) return;
    if (data.transport === 'codex') { result.textContent = t('AgentRouter connected through Codex. The model answered:') + ' ' + data.model; result.className = 'connection-success'; result.hidden = false; return; }
    const missing = values.models.filter(model => !data.models.includes(model));
    result.textContent = missing.length ? t('Connected. Models not found in the returned list:') + ' ' + missing.join(', ') : t('Connected. Model discovery and authentication succeeded.');
    result.className = missing.length ? 'connection-warning' : 'connection-success'; result.hidden = false;
  } catch (error) {
    if (button.isConnected) { result.textContent = t(error.name === 'AbortError' ? 'The request timed out.' : error.message); result.className = 'connection-warning'; result.hidden = false; }
  } finally { clearTimeout(timer); if (button.isConnected) { button.disabled = false; button.textContent = t('Test connection'); } }
}
function providerFormValues() { return { name: $('#provider-name').value.trim(), url: $('#provider-url').value.trim().replace(/\/+$/, ''), protocol: $('#provider-protocol').value, key: $('#provider-key').value.trim(), models: [...new Set($('#provider-models').value.split(/[\n,]/).map(m => m.trim()).filter(Boolean))], remember: $('#remember-key').checked }; }
function formError(message) { const el = $('#provider-form-error'); if (el) { el.hidden = false; el.textContent = t(message); } }
function validURL(url) { try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password && !parsed.search && !parsed.hash; } catch { return false; } }
function saveProvider(providerId) {
  const values = providerFormValues();
  if (!values.name || !validURL(values.url)) return formError('Enter a name and a valid HTTP or HTTPS API URL.');
  if (!values.models.length) return formError('Add at least one model ID, or fetch models from the provider.');
  if (!values.key && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(values.url).hostname)) return formError('An API key is required for a hosted provider.');
  const provider = { ...values, id: providerId || id() }; delete provider.key;
  if (providerId) providers = providers.map(p => p.id === providerId ? provider : p); else providers.push(provider);
  if (values.key) keys[provider.id] = values.key; else delete keys[provider.id];
  if (!selectedProvider() || !providerId) { activeProvider = provider.id; activeModel = provider.models[0]; }
  if (activeProvider === provider.id && !provider.models.includes(activeModel)) activeModel = provider.models[0];
  persist(); providerEdit = null; renderSettings(); renderHeader(); toast(providerId ? 'Provider updated' : 'Provider saved. Use Test connection to verify access.');
}
async function fetchModels() {
  const values = providerFormValues(); if (!validURL(values.url)) return formError('Enter a valid API URL first.');
  const button = $('#fetch-models'); button.disabled = true; button.textContent = 'Fetching…'; $('#provider-form-error').hidden = true;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch('/api/models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: { url: values.url, protocol: values.protocol, key: values.key } }), signal: controller.signal });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    if (!data.models.length) throw new Error('No models found. Enter a model ID manually.');
    if (!button.isConnected) return;
    $('#provider-models').value = data.models.join('\n'); toast(`${data.models.length} models found`);
  } catch (error) { if (button.isConnected) formError((error.name === 'AbortError' ? 'The request timed out.' : error.message) + ' You can also enter model names manually.'); }
  finally { clearTimeout(timer); if (button.isConnected) { button.disabled = false; button.textContent = 'Fetch from provider'; } }
}
$('#settings-content').addEventListener('click', e => {
  if (e.target.closest('[data-add-provider]')) { providerEdit = 'new'; renderSettings(); }
  if (e.target.closest('[data-back-providers]')) { providerEdit = null; renderSettings(); }
  const edit = e.target.closest('[data-edit-provider]'); if (edit) { providerEdit = edit.dataset.editProvider; renderSettings(); }
  const use = e.target.closest('[data-use-provider]'); if (use) { activeProvider = use.dataset.useProvider; activeModel = selectedProvider().models[0]; persist(); renderSettings(); renderHeader(); toast(`Using ${selectedProvider().name}`); }
  const remove = e.target.closest('[data-remove-provider]');
  if (remove) { const provider = providers.find(p => p.id === remove.dataset.removeProvider); confirmAction('Remove provider?', `Remove ${provider.name} and its saved API key? Your conversations will stay on this device.`, 'Remove provider', () => { providers = providers.filter(p => p.id !== provider.id); delete keys[provider.id]; if (activeProvider === provider.id) { activeProvider = providers[0]?.id || null; activeModel = providers[0]?.models[0] || ''; } persist(); renderSettings(); renderHeader(); toast('Provider removed'); }); }
});

function renderPreferences() {
  $('#settings-content').innerHTML = `<div class="section-heading"><div><h3>A workspace that fits you</h3><p class="section-description">Set the mood and tell your AI how you like to work.</p></div></div><div class="preference-row"><div><strong>Appearance</strong><small>A little light, or a little less.</small></div><select id="pref-theme" aria-label="Appearance"><option value="light" ${prefs.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${prefs.theme === 'dark' ? 'selected' : ''}>Dark</option></select></div><div class="preference-row"><div><strong>Response mode</strong><small>Choose concise or detailed answers.</small></div><select id="pref-style" aria-label="Response mode">${Object.entries({ concise: 'Concise', detailed: 'Detailed' }).map(([key, value]) => `<option value="${key}" ${prefs.style === key ? 'selected' : ''}>${value}</option>`).join('')}</select></div><form id="instructions-form" class="preference-instructions"><div class="field"><label for="pref-instructions">Custom instructions</label><textarea id="pref-instructions" rows="5" maxlength="12000" placeholder="What should your AI know about you? How would you like it to respond?">${escapeHTML(prefs.instructions)}</textarea><small>Included with each new request, across all providers.</small></div><button class="button primary" type="submit">Save instructions</button></form>`;
  $('.section-heading', $('#settings-content')).insertAdjacentHTML('afterend', '<div class="preference-row"><div><strong>Language</strong><small>Choose the interface language.</small></div><select id="pref-language" aria-label="Language"><option value="en">English</option><option value="ru">Русский</option></select></div>');
  $('#pref-language').value = prefs.language;
  $('#pref-language').addEventListener('change', e => {
    prefs.language = e.target.value; setLanguage(prefs.language); persist();
    renderAll(); renderSuggestions(); applyTheme(); attachments?.render(); translate(document.body); toast('Language updated');
  });
  $('#pref-theme').addEventListener('change', e => { prefs.theme = e.target.value; applyTheme(); persist(); });
  $('#pref-style').closest('.preference-row').insertAdjacentHTML('afterend', '<div class="preference-row"><div><strong>Reasoning effort</strong><small>Applied to models that support reasoning controls.</small></div><select id="pref-effort" aria-label="Reasoning effort"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>');
  $('#pref-effort').value = prefs.effort;
  $('#pref-effort').addEventListener('change', e => { prefs.effort = e.target.value; persist(); renderHeader(); });
  $('#pref-style').addEventListener('change', e => { prefs.style = e.target.value; persist(); renderHeader(); });
  $('#instructions-form').addEventListener('submit', e => { e.preventDefault(); prefs.instructions = $('#pref-instructions').value.trim(); persist(); toast('Instructions saved'); });
}
function download(name, content, type = 'application/json') { const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function renderData() {
  $('#settings-content').innerHTML = `<div class="section-heading"><div><h3>Your data, in your hands</h3><p class="section-description">Conversations and preferences are stored in this browser.</p></div></div><div class="preference-row"><div><strong>Export conversations</strong><small>Download ${chats.length} conversation${chats.length === 1 ? '' : 's'} as a JSON file.</small></div><button class="button secondary" id="export-all">${icon('download')}Export</button></div><div class="preference-row"><div><strong>Delete all conversations</strong><small>Permanently clear your chat history on this device.</small></div><button class="button danger" id="clear-chats">Delete all</button></div><div class="preference-row"><div><strong>Forget all API keys</strong><small>Keep provider settings, remove saved credentials.</small></div><button class="button danger" id="forget-keys">Forget keys</button></div><div class="info-note">${icon('lock')}<span>Exported files contain conversation text and model names. API keys are never included. Clearing browser data also removes your saved workspace.</span></div>`;
  $('#export-all').addEventListener('click', () => download('forma-conversations.json', JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), chats }, null, 2)));
  $('#clear-chats').addEventListener('click', () => confirmAction('Delete all conversations?', `This will permanently delete ${chats.length} conversations from this device. Export them first if you want to keep a copy.`, 'Delete all', () => { stopGeneration(); chats = []; deleteAttachments(); currentChatId = null; persist(); renderAll(); renderData(); toast('All conversations deleted'); }));
  $('#forget-keys').addEventListener('click', () => confirmAction('Forget all API keys?', 'Your provider settings will stay saved. You will need to enter your keys again to use hosted providers.', 'Forget keys', () => { stopGeneration(); Object.keys(keys).forEach(k => delete keys[k]); providers = providers.map(p => ({ ...p, remember: false })); persist(); toast('All API keys forgotten'); }));
}
$('#export-chat').addEventListener('click', () => { const chat = currentChat(); if (!chat) return; const text = '# ' + chat.title + '\n\n' + chat.messages.map(m => `## ${m.role === 'user' ? 'You' : m.providerName || 'Assistant'}\n\n${m.content}${m.attachments?.length ? '\n\nAttachments: ' + m.attachments.map(file => file.name).join(', ') : ''}${m.error ? '\n\nError: ' + m.error : ''}`).join('\n\n'); download('forma-conversation.md', text, 'text/markdown'); });

function smallDialog(title, content) { $('#small-dialog-title').textContent = title; $('#small-dialog-content').innerHTML = content; if (!$('#small-dialog').open) $('#small-dialog').showModal(); }
$('#close-small-dialog').addEventListener('click', () => $('#small-dialog').close());
function confirmAction(title, description, label, action) { smallDialog(title, `<p class="confirm-description">${escapeHTML(description)}</p><div class="confirm-actions"><button class="button secondary" id="confirm-cancel">Cancel</button><button class="button danger" id="confirm-action">${escapeHTML(label)}</button></div>`); $('#confirm-cancel').addEventListener('click', () => $('#small-dialog').close()); $('#confirm-action').addEventListener('click', () => { $('#small-dialog').close(); action(); }); $('#confirm-cancel').focus(); }
$('#response-style').addEventListener('click', () => {
  smallDialog('How should your AI respond?', Object.entries({ concise: ['Concise', 'Straight to the point, with the useful essentials.'], detailed: ['Detailed', 'Thorough explanations and concrete examples.'] }).map(([key, [title, desc]]) => `<button class="style-choice ${prefs.style === key ? 'selected' : ''}" data-style="${key}"><span><strong>${title}</strong><small>${desc}</small></span>${prefs.style === key ? icon('check') : ''}</button>`).join(''));
  $$('[data-style]').forEach(button => button.addEventListener('click', () => { prefs.style = button.dataset.style; persist(); renderHeader(); $('#small-dialog').close(); }));
});
$('#reasoning-effort').addEventListener('click', () => {
  const provider = selectedProvider();
  const unsupported = !!provider && effortMode(provider, activeModel) === 'none';
  const highOnly = effectiveEffort(provider, activeModel, 'low') === 'high';
  const selectedEffort = effectiveEffort(provider, activeModel, prefs.effort);
  smallDialog('Reasoning effort', Object.entries({ low: ['Low', 'Faster answers for simpler tasks.'], medium: ['Medium', 'A balance of speed and deeper reasoning.'], high: ['High', 'More reasoning for difficult tasks; may take longer.'] }).map(([key, [title, desc]]) => `<button class="style-choice ${selectedEffort === key ? 'selected' : ''}" data-effort="${key}" ${highOnly && key !== 'high' ? 'disabled' : ''}><span><strong>${title}</strong><small>${desc}</small></span>${selectedEffort === key ? icon('check') : ''}</button>`).join('') + `<p class="effort-note">${t(highOnly ? 'This model supports high reasoning effort only.' : unsupported ? 'This model has no known effort setting. The level is saved for supported models.' : 'Applied to models that support reasoning controls.')}</p>`);
  $$('[data-effort]').forEach(button => button.addEventListener('click', () => { prefs.effort = button.dataset.effort; persist(); renderHeader(); $('#small-dialog').close(); }));
});
function openSearch() {
  closeSidebar(); smallDialog('Find a conversation', '<input class="search-input" id="search-input" type="search" placeholder="Search titles and messages…" aria-label="Search conversations"><div class="search-results" id="search-results"></div>');
  const render = () => { const term = $('#search-input').value.toLowerCase(); const matches = [...chats].sort((a, b) => b.updatedAt - a.updatedAt).filter(c => c.title.toLowerCase().includes(term) || c.messages.some(m => m.content.toLowerCase().includes(term))); $('#search-results').innerHTML = matches.length ? matches.map(c => `<button class="search-result" data-search-chat="${escapeHTML(c.id)}"><strong>${escapeHTML(c.title)}</strong><small>${escapeHTML(c.messages.find(m => m.content.toLowerCase().includes(term))?.content.slice(0, 100) || '')}</small></button>`).join('') : '<p class="menu-empty">No conversations found. A new idea is a good place to start.</p>'; };
  $('#search-input').addEventListener('input', render); $('#search-results').addEventListener('click', e => { const button = e.target.closest('[data-search-chat]'); if (button) { $('#small-dialog').close(); selectChat(button.dataset.searchChat); } }); render(); $('#search-input').focus();
}
$('#search-chats').addEventListener('click', openSearch);
$('#open-help').addEventListener('click', () => { closeSidebar(); smallDialog('A space for all your models', `<div class="help-content"><p><strong>Make yourself at home.</strong> Forma connects to your AI providers using the credentials you supply.</p><ol><li>Open <strong>Settings → AI providers</strong> and add a provider.</li><li>Enter its <strong>API URL, API key, and model ID</strong>. You can fetch available model IDs from the provider.</li><li>Choose a model above the conversation and start chatting.</li></ol><p>On phones, tap the send arrow to send. Return adds a new line. The sidebar opens from the top-left button.</p><div class="help-shortcut"><span>New conversation</span><kbd>Ctrl / ⌘ K</kbd></div><div class="help-shortcut"><span>Search conversations</span><kbd>Ctrl / ⌘ /</kbd></div><div class="help-shortcut"><span>Send on desktop</span><kbd>Enter</kbd></div><div class="help-shortcut"><span>New line on desktop</span><kbd>Shift Enter</kbd></div><p class="info-note">Keys stay in this browser session by default. Chats are saved in this browser. Your messages go to the provider you choose.</p></div>`); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModelMenu(); closeSidebar(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (!$('#settings-dialog').open && !$('#small-dialog').open) newChat(); }
  if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); if (!$('#settings-dialog').open && !$('#small-dialog').open) openSearch(); }
});
$$('dialog').forEach(dialog => dialog.addEventListener('click', e => { if (e.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close(); }));
// Dynamic viewport units plus VisualViewport keep the composer above mobile keyboards.
function updateViewport() { if (window.visualViewport && matchMedia('(max-width:760px)').matches) $('#app').style.height = window.visualViewport.height + 'px'; else $('#app').style.height = ''; syncSidebarAccessibility(); }
window.visualViewport?.addEventListener('resize', updateViewport); window.addEventListener('resize', updateViewport); updateViewport();
window.addEventListener('beforeunload', () => { if (activeController) activeController.abort(); });
attachments = createAttachmentManager({ icon, t, toast, escapeHTML, changed: updateSendButton });
installTranslations();
renderAll(); resizePrompt();
