import { randomBytes, randomUUID, scrypt as derive, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const scrypt = promisify(derive);
const digest = token => createHash('sha256').update(token).digest('hex');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const publicUser = user => ({ id: user.id, email: user.email, name: user.name });

export async function createAccounts({ databaseURL = process.env.DATABASE_URL, file = process.env.FORMA_DATABASE_FILE || './data/accounts.sqlite' } = {}) {
  let query, close;
  if (databaseURL) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: databaseURL, max: 5, connectionTimeoutMillis: 10000 });
    query = async (sql, args = []) => (await pool.query(sql, args)).rows;
    close = () => pool.end();
  } else {
    if (process.env.RENDER || process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production. Use a persistent PostgreSQL database.');
    const { DatabaseSync } = await import('node:sqlite');
    const path = resolve(file); await mkdir(dirname(path), { recursive: true });
    const db = new DatabaseSync(path);
    db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    query = async (sql, args = []) => {
      const statement = db.prepare(sql.replace(/\$\d+/g, '?'));
      return /^(SELECT|.*RETURNING)/is.test(sql) ? statement.all(...args) : (statement.run(...args), []);
    };
    close = () => db.close();
  }
  await query('CREATE TABLE IF NOT EXISTS forma_users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL)');
  await query('CREATE TABLE IF NOT EXISTS forma_sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES forma_users(id) ON DELETE CASCADE, expires BIGINT NOT NULL)');
  await query('CREATE INDEX IF NOT EXISTS forma_sessions_expires ON forma_sessions(expires)');
  const dummySalt = randomBytes(16).toString('hex');
  const dummyHash = dummySalt + ':' + (await scrypt('unmatchable-password', dummySalt, 64)).toString('hex');
  return {
    close,
    async register({ email, password, name }) {
      email = String(email || '').trim().toLowerCase(); name = String(name || '').trim();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail('Enter a valid email address.');
      if (!name || name.length > 80) throw fail('Enter a name between 1 and 80 characters.');
      if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw fail('Use a password between 12 and 128 characters.');
      const salt = randomBytes(16).toString('hex');
      const hash = salt + ':' + (await scrypt(password, salt, 64)).toString('hex');
      const user = { id: randomUUID(), email, name };
      try { await query('INSERT INTO forma_users (id,email,name,password_hash) VALUES ($1,$2,$3,$4)', [user.id, email, name, hash]); }
      catch (error) { if (error.code === '23505' || /UNIQUE constraint/.test(error.message)) throw fail('This email is already registered. Sign in.', 409); throw error; }
      return publicUser(user);
    },
    async login({ email, password }) {
      if (typeof password !== 'string' || password.length > 128) throw fail('Incorrect email or password.', 401);
      const [user] = await query('SELECT * FROM forma_users WHERE email=$1', [String(email || '').trim().toLowerCase().slice(0, 254)]);
      const [salt, hex] = (user?.password_hash || dummyHash).split(':');
      const candidate = await scrypt(password, salt, 64);
      if (!timingSafeEqual(candidate, Buffer.from(hex, 'hex')) || !user) throw fail('Incorrect email or password.', 401);
      return publicUser(user);
    },
    async issue(user) {
      const token = randomBytes(32).toString('base64url');
      await query('DELETE FROM forma_sessions WHERE expires < $1', [Date.now()]);
      await query('INSERT INTO forma_sessions (hash,user_id,expires) VALUES ($1,$2,$3)', [digest(token), user.id, Date.now() + 7 * 86400000]);
      return token;
    },
    async identify(token) {
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      const [user] = await query('SELECT u.id,u.email,u.name FROM forma_users u JOIN forma_sessions s ON s.user_id=u.id WHERE s.hash=$1 AND s.expires>$2', [digest(token), Date.now()]);
      return user ? publicUser(user) : null;
    },
    async revoke(token) { if (token) await query('DELETE FROM forma_sessions WHERE hash=$1', [digest(token)]); }
  };
}
