const jwt = require('jsonwebtoken');
const pool = require('../db');

const authMiddleware = async (req, res, next) => {
  // Support both secure httpOnly cookie and Bearer Authorization header
  let token = req.cookies?.admin_token;
  if (!token && req.headers['authorization']) {
    const parts = req.headers['authorization'].split(' ');
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No authentication token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify admin existence and token_version for instant revocation
    const result = await pool.query(
      'SELECT id, name, email, token_version FROM admins WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Account no longer exists.' });
    }

    const admin = result.rows[0];

    // If token version does not match, the token was revoked (e.g. password changed/logged out)
    if (decoded.token_version !== undefined && decoded.token_version !== admin.token_version) {
      return res.status(401).json({ message: 'Session expired or revoked. Please log in again.' });
    }

    req.admin = { id: admin.id, name: admin.name, email: admin.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }
    return res.status(403).json({ message: 'Invalid or forged token.' });
  }
};

module.exports = authMiddleware;
