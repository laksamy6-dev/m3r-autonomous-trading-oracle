/**
 * Safe vault placeholder. Replace with real DB-backed implementation.
 * This file is intentionally defensive: it checks DATABASE_URL and table existence.
 */
import { Client } from 'pg';
import fs from 'fs';
export async function saveVaultToDb(data?: any) {
  try {
    if (fs.existsSync('server/.disable-db')) {
      console.warn('[VAULT] DB writes disabled by server/.disable-db');
      return;
    }
    const url = process.env.DATABASE_URL;
    if (!url) { console.warn('[VAULT] DATABASE_URL not set — skipping save'); return; }
    const client = new Client({ connectionString: url });
    await client.connect();
    const res = await client.query("SELECT to_regclass('public.brain_state') as exists");
    if (!res.rows[0].exists) {
      console.warn('[VAULT] brain_state table missing — skipping save');
      await client.end();
      return;
    }
    await client.query('INSERT INTO brain_state(key, state, updated_at) VALUES($1,$2,now()) ON CONFLICT (key) DO UPDATE SET state = EXCLUDED.state, updated_at = now()', ['vault', JSON.stringify(data || {})]);
    await client.end();
  } catch (e) {
    console.warn('[VAULT] Error saving to DB:', e && e.message ? e.message : e);
  }
}
export async function loadVaultFromDb() {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) return {};
    const client = new Client({ connectionString: url });
    await client.connect();
    const r = await client.query("SELECT state FROM brain_state WHERE key='vault' LIMIT 1");
    await client.end();
    return r.rows[0] ? r.rows[0].state : {};
  } catch (e) {
    console.warn('[VAULT] load error', e && e.message ? e.message : e);
    return {};
  }
}
