require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // Supabase requires SSL
});

(async () => {
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ Connected to Supabase:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
})();