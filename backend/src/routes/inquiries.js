const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// UUID v4 format validator
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Basic XSS sanitizer (removes HTML tags)
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
}

// POST /api/inquiries – public submission
router.post('/', async (req, res) => {
  let { name, email, phone, user_type, category, message } = req.body;

  name = sanitizeText(name);
  email = typeof email === 'string' ? email.trim().toLowerCase() : '';
  phone = sanitizeText(phone);
  message = sanitizeText(message);

  // Validation
  const errors = [];
  if (!name || name.length > 150) errors.push('Name is required (max 150 characters).');
  if (!email || email.length > 255) errors.push('Email is required (max 255 characters).');
  if (!phone || phone.length > 20) errors.push('Phone number is required (max 20 characters).');
  if (!user_type) errors.push('User type is required.');
  if (!category) errors.push('Category is required.');
  if (!message || message.length > 5000) errors.push('Message is required (max 5000 characters).');

  const validUserTypes = ['Parent', 'Student', 'School'];
  const validCategories = ['Scholarship', 'Concert', 'Admission', 'General Query'];

  if (user_type && !validUserTypes.includes(user_type)) errors.push('Invalid user type.');
  if (category && !validCategories.includes(category)) errors.push('Invalid category.');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) errors.push('Invalid email format.');

  const phoneCleaned = phone.replace(/[\s\-()]/g, '');
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  if (phone && !phoneRegex.test(phoneCleaned)) errors.push('Invalid phone number format.');

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed.', errors });
  }

  try {
    const result = await pool.query(
      `INSERT INTO inquiries (name, email, phone, user_type, category, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, user_type, category, message, status, created_at`,
      [name, email, phone, user_type, category, message]
    );

    res.status(201).json({
      message: 'Inquiry submitted successfully. We will get back to you soon!',
      inquiry: result.rows[0],
    });
  } catch (err) {
    console.error('Submit inquiry error:', err.message);
    res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
});

// GET /api/inquiries – admin only, with pagination & safe limits
router.get('/', authMiddleware, async (req, res) => {
  const { category, user_type, search, status, page = 1, limit = 20 } = req.query;

  // Strict pagination bounds to prevent DoS via massive limits
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  const validCategories = ['Scholarship', 'Concert', 'Admission', 'General Query'];
  const validUserTypes = ['Parent', 'Student', 'School'];
  const validStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];

  if (category && validCategories.includes(category)) {
    conditions.push(`category = $${paramIdx++}`);
    params.push(category);
  }
  if (user_type && validUserTypes.includes(user_type)) {
    conditions.push(`user_type = $${paramIdx++}`);
    params.push(user_type);
  }
  if (status && validStatuses.includes(status)) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(status);
  }
  if (search && typeof search === 'string') {
    const sanitizedSearch = sanitizeText(search).slice(0, 50);
    if (sanitizedSearch) {
      conditions.push(`(name ILIKE $${paramIdx} OR phone ILIKE $${paramIdx})`);
      params.push(`%${sanitizedSearch}%`);
      paramIdx++;
    }
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM inquiries ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT id, name, email, phone, user_type, category, message, status, created_at
       FROM inquiries
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, safeLimit, offset]
    );

    res.json({
      inquiries: result.rows,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    console.error('Fetch inquiries error:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Allowed lifecycle transitions
const ALLOWED_TRANSITIONS = {
  'New': ['In Progress', 'Closed'],
  'In Progress': ['Resolved', 'Closed'],
  'Resolved': ['Closed', 'In Progress'],
  'Closed': ['In Progress'], // Reopen only
};

// PATCH /api/inquiries/:id/status – admin only (with state machine validation)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({ message: 'Invalid inquiry ID format.' });
  }

  const validStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    // 1. Fetch current status
    const currentResult = await pool.query('SELECT id, name, status FROM inquiries WHERE id = $1', [id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Inquiry not found.' });
    }

    const currentStatus = currentResult.rows[0].status;

    // 2. If same status, no-op
    if (currentStatus === status) {
      return res.json({ message: `Status is already ${status}.`, inquiry: currentResult.rows[0] });
    }

    // 3. Enforce lifecycle state machine rules
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Invalid status transition: Cannot change status from "${currentStatus}" to "${status}".`,
        allowedTransitions: allowed,
      });
    }

    // 4. Update status
    const result = await pool.query(
      `UPDATE inquiries SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, status, updated_at`,
      [status, id]
    );

    res.json({ message: `Status updated from ${currentStatus} to ${status}.`, inquiry: result.rows[0] });
  } catch (err) {
    console.error('Update status error:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/inquiries/stats – admin only, dashboard summary
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'New')         AS new_count,
        COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress_count,
        COUNT(*) FILTER (WHERE status = 'Resolved')    AS resolved_count,
        COUNT(*) FILTER (WHERE status = 'Closed')      AS closed_count,
        COUNT(*)                                        AS total_count,
        COUNT(*) FILTER (WHERE user_type = 'Parent')   AS parent_count,
        COUNT(*) FILTER (WHERE user_type = 'Student')  AS student_count,
        COUNT(*) FILTER (WHERE user_type = 'School')   AS school_count,
        COUNT(*) FILTER (WHERE category = 'Scholarship')   AS scholarship_count,
        COUNT(*) FILTER (WHERE category = 'Concert')       AS concert_count,
        COUNT(*) FILTER (WHERE category = 'Admission')     AS admission_count,
        COUNT(*) FILTER (WHERE category = 'General Query') AS general_count
      FROM inquiries
    `);

    res.json({ stats: result.rows[0] });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
