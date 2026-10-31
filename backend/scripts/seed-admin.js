/**
 * One-time script to seed the first admin account.
 * Run: node scripts/seed-admin.js
 * Set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME env vars or edit defaults below.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const pool = require('../src/db');

async function seedAdmin() {
  const name     = process.env.ADMIN_NAME     || 'Super Admin';
  const email    = process.env.ADMIN_EMAIL    || 'admin@edtech.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';

  console.log(`Seeding admin: ${name} <${email}>`);

  try {
    // Check if already exists
    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('⚠️  Admin with this email already exists. Skipping.');
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO admins (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, password_hash]
    );

    console.log('✅ Admin created:', result.rows[0]);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Remember to change the default password after first login!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await pool.end();
  }
}

seedAdmin();
