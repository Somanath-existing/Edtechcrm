const { Pool } = require('pg');

const isLocalDb = process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
  statement_timeout: 5000, // 5s query timeout prevents database lockups and slow-query DoS
  connectionTimeoutMillis: 5000,
  max: 20,
});

pool.on('connect', () => {
  console.log('✅ Connected to Supabase PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Database pool error:', err.message);
});

module.exports = pool;
