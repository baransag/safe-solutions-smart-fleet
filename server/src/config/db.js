const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'safe_solutions',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
  } finally {
    client.release();
  }
}

async function query(text, params) {
  try {
    if (!process.env.DATABASE_URL && (process.env.VERCEL || process.env.NODE_ENV === 'production') && !process.env.DB_HOST_OVERRIDE) {
      return { rows: [] };
    }
    const result = await Promise.race([
      pool.query(text, params),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB connection timeout')), 1200))
    ]);
    return result;
  } catch (err) {
    console.warn('DB query fallback notice:', err.message);
    return { rows: [] };
  }
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
