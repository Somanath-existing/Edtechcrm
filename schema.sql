-- ============================================================
-- EdTech CRM & Inquiry System – Database Schema
-- Database: Supabase PostgreSQL
-- Run this file in Supabase Dashboard → SQL Editor, or via psql
-- ============================================================

-- Enable UUID extension (available by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM TYPES ──────────────────────────────────────────────────────────────

CREATE TYPE user_type_enum AS ENUM ('Parent', 'Student', 'School');

CREATE TYPE category_enum AS ENUM (
  'Scholarship',
  'Concert',
  'Admission',
  'General Query'
);

CREATE TYPE inquiry_status_enum AS ENUM (
  'New',
  'In Progress',
  'Resolved',
  'Closed'
);

-- ─── ADMINS ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admins (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index for fast login lookup
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins (email);

-- ─── INQUIRIES ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inquiries (
  id            UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(150)          NOT NULL,
  email         VARCHAR(255)          NOT NULL,
  phone         VARCHAR(20)           NOT NULL,
  user_type     user_type_enum        NOT NULL,
  category      category_enum         NOT NULL,
  message       TEXT                  NOT NULL,
  status        inquiry_status_enum   NOT NULL DEFAULT 'New',
  created_at    TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ           NOT NULL DEFAULT NOW()
);

-- Indexes for common filter/search patterns
CREATE INDEX IF NOT EXISTS idx_inquiries_category   ON inquiries (category);
CREATE INDEX IF NOT EXISTS idx_inquiries_user_type  ON inquiries (user_type);
CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_name       ON inquiries USING GIN (to_tsvector('english', name));

-- ─── AUTO-UPDATE updated_at ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── SAMPLE DATA (optional, for testing) ─────────────────────────────────────
-- Uncomment the block below to load sample inquiries

/*
INSERT INTO inquiries (name, email, phone, user_type, category, message) VALUES
  ('Rahul Sharma',  'rahul@example.com',  '+919876543210', 'Student', 'Scholarship',   'I want to know about scholarship eligibility criteria for Class 11 students.'),
  ('Priya Nair',    'priya@example.com',  '+919123456789', 'Parent',  'Admission',     'Please share details about the admission process and required documents.'),
  ('St. Xavier School', 'admin@stxavier.edu', '+918012345678', 'School', 'Concert',  'We are interested in organising an annual cultural concert. Please guide us.'),
  ('Ankit Patel',   'ankit@example.com',  '+919988776655', 'Student', 'General Query', 'What are the hostel facilities available for outstation students?'),
  ('Meena Gupta',   'meena@example.com',  '+917766554433', 'Parent',  'Scholarship',   'My daughter scored 95% in board exams. Is she eligible for merit scholarship?');
*/
