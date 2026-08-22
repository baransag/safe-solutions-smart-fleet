const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
const NEON_FALLBACK = 'postgresql://neondb_owner:npg_ijM05tOdoWcQ@ep-flat-block-ay3xxqz0-pooler.c-5.us-east-2.aws.neon.tech/neondb';

const rawUrl = process.env.DATABASE_URL || NEON_FALLBACK;
const cleanUrl = rawUrl.split('?')[0];

const isLocal = cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1');

const poolConfig = {
  connectionString: cleanUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: isProduction ? 3 : 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('✅ PostgreSQL Connected:', result.rows[0].now);
  } finally {
    client.release();
  }
}

async function query(text, params) {
  return await pool.query(text, params);
}

async function transaction(callback) {
  const client = await pool.connect();
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

module.exports = { pool, query, transaction, testConnection };
