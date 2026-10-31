const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/auth/register  (one-time admin seeding – disable in prod or protect)
router.post('/register', async (req, res) => {
  const { name, email, password, secret } = req.body;

  if (secret !== process.env.ADMIN_REGISTER_SECRET) {
    return res.status(403).json({ message: 'Forbidden: Invalid registration secret.' });
  }

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  try {
    const exists = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ message: 'Admin with this email already exists.' });
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      'INSERT INTO admins (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, password_hash]
    );

    res.status(201).json({ message: 'Admin created successfully.', admin: result.rows[0] });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/auth/me  – verify token & return current admin
router.get('/me', require('../middleware/auth'), async (req, res) => {
  res.json({ admin: req.admin });
});

module.exports = router;
