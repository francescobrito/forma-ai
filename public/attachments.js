import { accountId } from './auth.js';
const MAX_FILE = 5 * 1024 * 1024;
const MAX_TOTAL = 8 * 1024 * 1024;
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const textExtensions = /\.(txt|md|csv|tsv|json|log|js|jsx|ts|tsx|py|html|css|xml|yaml|yml|toml|sql|sh|ini)$/i;
let dbPromise;
function database() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('forma.files.v1.' + accountId(), 1);
    request.onupgradeneeded = () => request.result.createObjectStore('attachments');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { dbPromise = undefined; reject(new Error('Browser file storage is unavailable. Allow site storage to attach files.')); };
  });
  return dbPromise;
}
export async function getAttachment(fileId) {
  const db = await database();
  return new Promise((resolve, reject) => { const request = db.transaction('attachments').objectStore('attachments').get(fileId); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
export async function deleteAttachments(ids = null) {
  try { const db = await database(); await new Promise((resolve, reject) => { const tx = db.transaction('attachments', 'readwrite'); const store = tx.objectStore('attachments'); if (ids === null) store.clear(); else ids.forEach(fileId => store.delete(fileId)); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); } catch {}
}
export function dataURL(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('This file could not be read.')); reader.readAsDataURL(blob); }); }
async function optimizePhoto(file) {
  if (file.type === 'image/gif') return file;
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('This image could not be opened. Try a JPEG or PNG photo.')); });
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .86));
    if (!blob) throw new Error('This image could not be opened. Try a JPEG or PNG photo.');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
export async function conversationWithFiles(messages) {
  return Promise.all(messages.filter(m => m.content.trim() || m.attachments?.length).map(async message => {
    const attachments = await Promise.all((message.attachments || []).map(async file => {
      const blob = await getAttachment(file.id); if (!blob) throw new Error('An attachment is no longer available on this device. Attach it again in a new message.');
      return file.kind === 'text' ? { name: file.name, kind: 'text', text: await blob.text() } : { name: file.name, kind: file.kind, data: await dataURL(blob) };
    }));
    return { role: message.role, content: message.content, ...(attachments.length ? { attachments } : {}) };
  }));
}
export function createAttachmentManager({ icon, t, toast, escapeHTML, changed }) {
  let pending = [], preparing = false, version = 0;
  const root = document.querySelector('#attachment-list');
  const picker = document.querySelector('#file-picker');
  const camera = document.querySelector('#camera-picker');
  const menu = document.querySelector('#attachment-menu');
  const prompt = document.querySelector('#prompt');
  const clipboardName = type => `clipboard-${Date.now()}.${({ 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' })[type] || 'png'}`;
  function render() {
    root.hidden = !pending.length && !preparing;
    root.innerHTML = pending.map(file => `<div class="attachment-chip">${file.kind === 'image' ? `<img src="${file.url}" alt="${escapeHTML(file.name)}">` : `<span class="attachment-file-icon">${icon('file')}</span>`}<span class="attachment-info"><strong data-user-content>${escapeHTML(file.name)}</strong><small>${Math.max(1, Math.round(file.blob.size / 1024))} KB</small></span><button type="button" class="icon-button" data-remove-attachment="${file.id}" aria-label="${t('Remove attachment')}">${icon('x')}</button></div>`).join('') + (preparing ? `<span class="attachment-preparing">${t('Preparing files…')}</span>` : '');
    document.querySelector('#attachment-note').hidden = !pending.length;
    document.querySelector('#attach-button').disabled = preparing;
    changed();
  }
  function closeMenu() { menu.hidden = true; document.querySelector('#attach-button').setAttribute('aria-expanded', 'false'); }
  document.querySelector('#attach-button').addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; document.querySelector('#attach-button').setAttribute('aria-expanded', String(open)); });
  document.querySelector('#attach-files').addEventListener('click', () => { closeMenu(); picker.click(); });
  document.querySelector('#take-photo').addEventListener('click', () => { closeMenu(); camera.click(); });
  document.querySelector('#paste-photo').addEventListener('click', async () => {
    closeMenu();
    if (preparing) { toast(t('Wait for the files to finish preparing, then paste again.')); return; }
    if (!navigator.clipboard?.read) { toast(t('Use Ctrl+V in the message field, or touch and hold it and choose Paste.')); prompt.focus(); return; }
    const clipboardVersion = version;
    try {
      // Read only after a deliberate click so mobile browsers retain user activation.
      const items = await navigator.clipboard.read();
      const files = [];
      for (const item of items) {
        const type = item.types.find(type => imageTypes.has(type));
        if (type) files.push(new File([await item.getType(type)], clipboardName(type), { type }));
      }
      if (clipboardVersion !== version) return;
      if (!files.length) { toast(t('No photo in the clipboard. Copy the image itself, then paste it here.')); return; }
      await addFiles(files);
    } catch {
      toast(t('Could not read the clipboard. Use Ctrl+V in the message field, or touch and hold it and choose Paste.'));
    }
    prompt.focus();
  });
  prompt.addEventListener('paste', event => {
    const data = event.clipboardData;
    if (!data) return;
    // Some phones provide files without DataTransferItems. Avoid adding both copies.
    const itemFiles = [...(data.items || [])].filter(item => item.kind === 'file').map(item => item.getAsFile()).filter(Boolean);
    const files = itemFiles.length ? itemFiles : [...(data.files || [])];
    if (!files.length) return; // Plain text keeps the browser's normal paste behavior.
    event.preventDefault();
    const text = data.getData('text/plain');
    if (text) {
      const available = prompt.maxLength < 0 ? text.length : Math.max(0, prompt.maxLength - (prompt.value.length - (prompt.selectionEnd - prompt.selectionStart)));
      prompt.setRangeText(text.slice(0, available), prompt.selectionStart, prompt.selectionEnd, 'end');
      prompt.dispatchEvent(new Event('input', { bubbles: true }));
    }
    void addFiles(files.map(file => file.name ? file : new File([file], clipboardName(file.type), { type: file.type })));
  });
  document.addEventListener('click', e => { if (!e.target.closest('.attachment-control')) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  async function addFiles(files) {
    if (preparing) { toast(t('Wait for the files to finish preparing, then paste again.')); return; }
    preparing = true; const selectionVersion = version; render();
    try {
      for (const file of files) {
        if (selectionVersion !== version) break;
        if (pending.length >= 5) { toast(t('Add up to 5 files per message.')); break; }
        if (file.size > MAX_FILE) { toast(t('Each file must be 5 MB or smaller.')); continue; }
        const kind = imageTypes.has(file.type) ? 'image' : (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) ? 'pdf' : (file.type.startsWith('text/') || textExtensions.test(file.name)) ? 'text' : null;
        if (!kind) { toast(t('Supported: JPEG, PNG, WebP, GIF, PDF and text files.')); continue; }
        if (kind === 'text' && file.size > 500 * 1024) { toast(t('Text files must be 500 KB or smaller.')); continue; }
        const blob = kind === 'image' ? await optimizePhoto(file) : new Blob([file], { type: kind === 'pdf' ? 'application/pdf' : 'text/plain' });
        if (selectionVersion !== version) break;
        if (kind === 'text' && (await blob.text()).includes('\0')) { toast(t('This file is not readable text.')); continue; }
        if (pending.reduce((sum, attachment) => sum + attachment.blob.size, 0) + blob.size > MAX_TOTAL) { toast(t('Attachments must total 8 MB or less.')); continue; }
        pending.push({ id: crypto.randomUUID(), name: file.name, kind, type: blob.type, size: blob.size, blob, url: kind === 'image' ? URL.createObjectURL(blob) : null });
      }
    } catch (error) { toast(t(error.message)); }
    finally { preparing = false; picker.value = ''; camera.value = ''; render(); }
  }
  picker.addEventListener('change', () => addFiles([...picker.files])); camera.addEventListener('change', () => addFiles([...camera.files]));
  root.addEventListener('click', e => { const button = e.target.closest('[data-remove-attachment]'); if (!button) return; const removed = pending.find(file => file.id === button.dataset.removeAttachment); if (removed?.url) URL.revokeObjectURL(removed.url); pending = pending.filter(file => file.id !== button.dataset.removeAttachment); render(); });
  function clear() { version++; pending.forEach(file => { if (file.url) URL.revokeObjectURL(file.url); }); pending = []; render(); }
  return {
    has: () => pending.length > 0,
    busy: () => preparing,
    names: () => pending.map(file => file.name),
    clear, render,
    async consume() {
      if (!pending.length) return [];
      const selected = [...pending]; const db = await database();
      await new Promise((resolve, reject) => { const tx = db.transaction('attachments', 'readwrite'); selected.forEach(file => tx.objectStore('attachments').put(file.blob, file.id)); tx.oncomplete = resolve; tx.onerror = () => reject(new Error('Browser file storage is unavailable. Allow site storage to attach files.')); });
      const metadata = selected.map(({ id, name, kind, type, size }) => ({ id, name, kind, type, size })); clear(); return metadata;
    }
  };
}
