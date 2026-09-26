// src/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase pooler over public networks
  }
});

pool.on('connect', () => {
  console.log('[PostgreSQL] Connected to Supabase Session Pooler');
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Error]:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};