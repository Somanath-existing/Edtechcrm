require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const inquiryRoutes = require('./routes/inquiries');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Trust Reverse Proxy (Render / Vercel / Cloudflare) ────────────────────────
app.set('trust proxy', 1);

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── Cookie Parser ────────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── CORS Tightening ──────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server) or approved origins
    if (!origin || allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS policy violation: Origin ${origin} not permitted.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ─── CSRF Protection on Mutating Requests ─────────────────────────────────────
// Checks origin / referer header against allowed origins on state-changing methods
app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.headers['origin'] || req.headers['referer'];
    if (origin) {
      const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
      if (!isAllowed && process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: 'Forbidden: Cross-site request rejected.' });
      }
    }
  }
  next();
});

// ─── Request Body Size Limit (Blocks oversized payloads & memory exhaustion) ──
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP. Please try again later.' },
});

// Dedicated strict brute-force limiter for admin login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: { message: 'Too many failed login attempts. Please wait 15 minutes before trying again.' },
});

// Strict limiter for public inquiry submissions
const inquirySubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Inquiry submission limit reached. Please try again after an hour.' },
});

app.use(generalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);

// Apply submission limiter specifically to POST /api/inquiries
app.post('/api/inquiries', inquirySubmissionLimiter);
app.use('/api/inquiries', inquiryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler – prevents sensitive stack traces or passwords from leaking
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 EdTech CRM backend running securely on port ${PORT}`);
});

module.exports = app;
