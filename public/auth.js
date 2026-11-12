import { t, getLanguage, setLanguage } from './i18n.js';
let currentUser;
const $ = selector => document.querySelector(selector);
async function request(path, body) {
  const response = await fetch('/api/auth/' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to sign in. Try again.');
  return result;
}
export function storageKey(key) { if (!currentUser) throw new Error('Sign in first.'); return key + '.' + currentUser.id; }
export const accountId = () => currentUser?.id;
export async function requireAccount() {
  try { currentUser = (await request('me')).user; }
  catch { $('#auth-error').textContent = t('Unable to reach the server. Refresh to try again.'); }
  if (!currentUser) {
    $('#auth-screen').hidden = false;
    $('#app').inert = true;
    await new Promise(resolve => {
      let mode = 'login';
      function render() {
        $('#auth-title').textContent = t(mode === 'login' ? 'Welcome back.' : 'Create an account.');
        $('#auth-name-field').hidden = mode !== 'register';
        $('#auth-name').required = mode === 'register';
        $('#auth-password').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
        $('#auth-password').minLength = mode === 'register' ? 12 : 1;
        $('#auth-submit').textContent = t(mode === 'login' ? 'Sign in' : 'Create account');
        $('#auth-switch').textContent = t(mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in');
        $('#auth-language').textContent = getLanguage() === 'ru' ? 'English' : 'Русский';
        for (const [id, text] of [['auth-email-label', 'Email'], ['auth-password-label', 'Password'], ['auth-name-label', 'Your name'], ['auth-caption', 'Your ideas. Your models. Your account.'], ['auth-privacy', 'Conversations and API keys are saved on this device for your account.'], ['auth-password-hint', 'For a new account, use at least 12 characters.']]) $('#' + id).textContent = t(text);
      }
      $('#auth-language').onclick = () => { setLanguage(getLanguage() === 'ru' ? 'en' : 'ru'); render(); };
      $('#auth-switch').onclick = () => { mode = mode === 'login' ? 'register' : 'login'; $('#auth-error').textContent = ''; render(); };
      $('#auth-form').onsubmit = async event => {
        event.preventDefault(); $('#auth-submit').disabled = true; $('#auth-error').textContent = '';
        try {
          const result = await request(mode, { email: $('#auth-email').value, password: $('#auth-password').value, name: $('#auth-name').value });
          currentUser = result.user; $('#auth-password').value = ''; resolve();
        } catch (error) { $('#auth-error').textContent = t(error.message); }
        finally { $('#auth-submit').disabled = false; }
      };
      render();
    });
  }
  $('#auth-screen').hidden = true; $('#app').inert = false; $('#app').hidden = false;
  $('#account-name').textContent = currentUser.name;
  $('#account-email').textContent = currentUser.email;
  $('#account-avatar').textContent = currentUser.name[0].toUpperCase();
  const logout = async () => {
    if ($('#logout').disabled) return;
    $('#logout').disabled = true;
    try { await request('logout', {}); sessionStorage.removeItem(storageKey('forma.session-keys.v1')); currentUser = null; location.reload(); }
    catch (error) { $('#logout').disabled = false; alert(t(error.message)); }
  };
  $('#logout').onclick = logout;
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#auth-screen').hidden) event.preventDefault(); });
  // A login/logout in another tab must not leave a previous account's data visible.
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('forma-account') : null;
  channel?.postMessage({ user: currentUser.id });
  channel?.addEventListener('message', event => { if (event.data.user !== currentUser?.id) location.reload(); });
  $('#logout').addEventListener('click', () => { if ($('#logout').disabled) channel?.postMessage({ user: null }); });
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (...args) => { const response = await nativeFetch(...args); if (response.status === 401 && String(args[0]).startsWith('/api/')) { let result; try { result = await response.clone().json(); } catch {} if (result?.code === 'SESSION_REQUIRED') location.reload(); } return response; };
  return currentUser;
}
