const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
const NEON_FALLBACK = 'postgresql://neondb_owner:npg_ijM05tOdoWcQ@ep-summer-pond-aylfy7kr-pooler.c-5.us-east-2.aws.neon.tech/neondb';

let poolInstance = null;

function getPool() {
  if (!poolInstance) {
    const rawUrl = process.env.DATABASE_URL || NEON_FALLBACK;
    const cleanUrl = rawUrl.split('?')[0];
    const isLocal = cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1');

    poolInstance = new Pool({
      connectionString: cleanUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 5000,
    });

    poolInstance.on('error', (err) => {
      console.error('Database pool error:', err.message);
    });
  }
  return poolInstance;
}

async function query(text, params) {
  const p = getPool();
  return await p.query(text, params);
}

async function transaction(callback) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function testConnection() {
  const res = await query('SELECT NOW()');
  return res.rows[0].now;
}

module.exports = { pool: { query, connect: () => getPool().connect() }, query, transaction, testConnection };
