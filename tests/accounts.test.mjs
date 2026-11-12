import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { createAccounts } from '../accounts.mjs';
import { createServer } from '../server.mjs';
import { publicAddress, validatePublicProvider } from '../provider-safety.mjs';

test('accounts and sessions survive a restart, reject wrong passwords, and revoke logout', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forma-auth-test-'));
  const file = join(directory, 'accounts.sqlite');
  let accounts = await createAccounts({ file });
  try {
    const user = await accounts.register({ name: 'Test User', email: 'TEST@example.com', password: 'test-only-long-password' });
    assert.equal(user.email, 'test@example.com'); assert.equal(user.password_hash, undefined);
    const token = await accounts.issue(user);
    await assert.rejects(accounts.login({ email: user.email, password: 'wrong' }), /Incorrect/);
    await assert.rejects(accounts.register({ name: 'Duplicate', email: user.email, password: 'test-only-long-password' }), /already/);
    await accounts.close(); accounts = await createAccounts({ file });
    assert.deepEqual(await accounts.identify(token), user);
    assert.deepEqual(await accounts.login({ email: user.email, password: 'test-only-long-password' }), user);
    await accounts.revoke(token); assert.equal(await accounts.identify(token), null);
    assert.equal(await accounts.identify('bad-cookie'), null);
  } finally { await accounts.close(); await rm(directory, { recursive: true }); }
});

test('HTTP auth requires same-origin requests and protects all proxy endpoints', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forma-auth-http-'));
  const accounts = await createAccounts({ file: join(directory, 'accounts.sqlite') });
  const server = createServer({ accounts });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (path, body, cookie = '', origin = base) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie }, body: JSON.stringify(body) });
  try {
    for (const path of ['/api/chat', '/api/models', '/api/check']) assert.equal((await post(path, {})).status, 401);
    assert.equal((await post('/api/auth/register', {}, '', 'https://evil.example')).status, 403);
    const credentials = { name: 'API Test', email: 'http@example.com', password: 'test-only-long-password' };
    const response = await post('/api/auth/register', credentials); assert.equal(response.status, 201);
    const cookie = response.headers.get('set-cookie'); assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/);
    const user = (await response.json()).user;
    const me = await fetch(base + '/api/auth/me', { headers: { Cookie: cookie } }); assert.deepEqual((await me.json()).user, user);
    const badLogin = await post('/api/auth/login', { email: credentials.email, password: 'wrong' }); assert.equal(badLogin.status, 401);
    assert.equal((await post('/api/models', {}, cookie)).status, 400);
    assert.equal((await post('/api/auth/logout', {}, cookie)).status, 200);
    assert.equal((await post('/api/chat', {}, cookie)).status, 401);
    const login = await post('/api/auth/login', credentials); assert.equal(login.status, 200);
    assert.notEqual(login.headers.get('set-cookie'), cookie);
    const health = await fetch(base + '/api/health'); assert.deepEqual(await health.json(), { ok: true });
  } finally { await new Promise(resolve => server.close(resolve)); await accounts.close(); await rm(directory, { recursive: true }); }
});

test('hosted deployment validates host, uses Secure cookies, and blocks private destinations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'forma-host-test-'));
  const accounts = await createAccounts({ file: join(directory, 'accounts.sqlite') });
  const server = createServer({ accounts, publicURL: 'https://forma.example.com' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await new Promise((resolve, reject) => {
      const request = http.request({ host: '127.0.0.1', port: server.address().port, path: '/api/auth/register', method: 'POST', headers: { Host: 'forma.example.com', Origin: 'https://forma.example.com', 'Content-Type': 'application/json' } }, result => { result.resume(); result.on('end', () => resolve(result)); });
      request.on('error', reject); request.end(JSON.stringify({ name: 'Hosted', email: 'hosted@example.com', password: 'test-only-long-password' }));
    });
    assert.equal(response.statusCode, 201); assert.match(response.headers['set-cookie'][0], /; Secure/);
    for (const ip of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '100.64.0.1', '::1', '::ffff:127.0.0.1', 'fc00::1']) assert.equal(publicAddress(ip), false, ip);
    assert.equal(publicAddress('8.8.8.8'), true);
    await assert.rejects(validatePublicProvider('http://api.example.com'), /HTTPS/);
    await assert.rejects(validatePublicProvider('https://127.0.0.1/v1'), /private/);
    await assert.rejects(validatePublicProvider('https://[::1]/v1'), /private/);
  } finally { await new Promise(resolve => server.close(resolve)); await accounts.close(); await rm(directory, { recursive: true }); }
});
