const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// POST /api/inquiries  – public, no auth needed
router.post('/', async (req, res) => {
  const { name, email, phone, user_type, category, message } = req.body;

  // Basic validation
  const errors = [];
  if (!name?.trim())     errors.push('Name is required.');
  if (!email?.trim())    errors.push('Email is required.');
  if (!phone?.trim())    errors.push('Phone number is required.');
  if (!user_type)        errors.push('User type is required.');
  if (!category)         errors.push('Category is required.');
  if (!message?.trim())  errors.push('Message is required.');

  const validUserTypes = ['Parent', 'Student', 'School'];
  const validCategories = ['Scholarship', 'Concert', 'Admission', 'General Query'];

  if (user_type && !validUserTypes.includes(user_type))
    errors.push('Invalid user type.');
  if (category && !validCategories.includes(category))
    errors.push('Invalid category.');

  // Simple email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) errors.push('Invalid email format.');

  // Phone: 7-15 digits, optional leading +
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  if (phone && !phoneRegex.test(phone.replace(/[\s\-()]/g, '')))
    errors.push('Invalid phone number.');

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed.', errors });
  }

  try {
    const result = await pool.query(
      `INSERT INTO inquiries (name, email, phone, user_type, category, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, user_type, category, message, status, created_at`,
      [name.trim(), email.trim().toLowerCase(), phone.trim(), user_type, category, message.trim()]
    );

    res.status(201).json({
      message: 'Inquiry submitted successfully. We will get back to you soon!',
      inquiry: result.rows[0],
    });
  } catch (err) {
    console.error('Submit inquiry error:', err);
    res.status(500).json({ message: 'Internal server error. Please try again.' });
  }
});

// GET /api/inquiries  – admin only, with filters & search
router.get('/', authMiddleware, async (req, res) => {
  const { category, user_type, search, status, page = 1, limit = 20 } = req.query;

  const conditions = [];
  const params = [];
  let paramIdx = 1;

  if (category) {
    conditions.push(`category = $${paramIdx++}`);
    params.push(category);
  }
  if (user_type) {
    conditions.push(`user_type = $${paramIdx++}`);
    params.push(user_type);
  }
  if (status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(status);
  }
  if (search) {
    conditions.push(`(name ILIKE $${paramIdx} OR phone ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    // Total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM inquiries ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Paginated results
    const result = await pool.query(
      `SELECT id, name, email, phone, user_type, category, message, status, created_at
       FROM inquiries
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      inquiries: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Fetch inquiries error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// PATCH /api/inquiries/:id/status  – admin only
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await pool.query(
      `UPDATE inquiries SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, status, updated_at`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Inquiry not found.' });
    }

    res.json({ message: 'Status updated.', inquiry: result.rows[0] });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/inquiries/stats  – admin only, dashboard summary
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
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
