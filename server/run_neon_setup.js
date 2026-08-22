const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const NEON_URL = 'postgresql://neondb_owner:npg_ijM05tOdoWcQ@ep-flat-block-ay3xxqz0-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false }
});

async function runSetup() {
  const client = await pool.connect();
  try {
    console.log('🚀 Connecting to Neon PostgreSQL Cloud Database...');
    const nowRes = await client.query('SELECT NOW()');
    console.log('✅ Connected! Server Timestamp:', nowRes.rows[0].now);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`\n📂 Found ${files.length} SQL Migration files. Running migrations...`);
    for (const f of files) {
      const filePath = path.join(migrationsDir, f);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`  ▶️ Running migration: ${f}`);
      try {
        await client.query(sql);
        console.log(`    ✅ Migration ${f} passed.`);
      } catch (mErr) {
        console.warn(`    ⚠️ Notice for ${f}:`, mErr.message);
      }
    }

    console.log('\n🌱 Migrations complete! Now seeding production employees & vehicles...');
    client.release();

    // Run seed.js
    require('./seeds/seed.js');

  } catch (err) {
    console.error('❌ Neon Setup Error:', err.message);
    client.release();
    pool.end();
  }
}

runSetup();
