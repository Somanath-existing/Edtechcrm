const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// Helper to set secure cookie
function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    path: '/',
  });
}

// Password strength validator
function isStrongPassword(pwd) {
  if (!pwd || pwd.length < 8) return false;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  return hasUpper && hasLower && hasDigit && hasSpecial;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, token_version FROM admins WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, token_version: admin.token_version || 1 },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    setAuthCookie(res, token);

    res.json({
      message: 'Login successful',
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
  res.json({ message: 'Logged out successfully.' });
});

// POST /api/auth/change-password (Authenticated Admin)
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required.' });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      message: 'New password must be at least 8 characters long and contain uppercase, lowercase, numbers, and a special character.',
    });
  }

  try {
    const result = await pool.query(
      'SELECT id, password_hash, token_version FROM admins WHERE id = $1',
      [req.admin.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const saltRounds = 12;
    const newHash = await bcrypt.hash(newPassword, saltRounds);
    const newTokenVersion = (admin.token_version || 1) + 1;

    await pool.query(
      'UPDATE admins SET password_hash = $1, token_version = $2, updated_at = NOW() WHERE id = $3',
      [newHash, newTokenVersion, req.admin.id]
    );

    // Issue refreshed token with the new token_version so current session stays logged in
    const freshToken = jwt.sign(
      { id: req.admin.id, email: req.admin.email, name: req.admin.name, token_version: newTokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    setAuthCookie(res, freshToken);

    res.json({
      message: 'Password updated successfully. All other sessions have been revoked.',
      token: freshToken,
    });
  } catch (err) {
    console.error('Change password error:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/auth/me – verify token & return current admin
router.get('/me', authMiddleware, async (req, res) => {
  res.json({ admin: req.admin });
});

module.exports = router;
