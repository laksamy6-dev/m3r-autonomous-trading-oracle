/* ESM vault shim: populates process.env from vault_data table if DATABASE_URL present */
try {
  const { Client } = await import('pg');
  const url = process.env.DATABASE_URL;
  if (url) {
    const c = new Client({ connectionString: url });
    await c.connect();
    const res = await c.query('SELECT key_id, value::text FROM vault_data');
    for (const row of res.rows) {
      const k = row.key_id;
      const v = row.value.replace(/^"|"$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
    await c.end();
  }
} catch (e) {
  // Do not crash the app if vault read fails; log for diagnostics
  try { console.warn('vault_env_shim error', e && e.stack ? e.stack : e); } catch {}
}
