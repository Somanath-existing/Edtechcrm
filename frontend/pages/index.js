import { useState } from 'react';
import { api } from '../lib/api';
import Link from 'next/link';

const USER_TYPES = ['Parent', 'Student', 'School'];
const CATEGORIES = ['Scholarship', 'Concert', 'Admission', 'General Query'];

const initialForm = {
  name: '', email: '', phone: '', user_type: '', category: '', message: '',
};

export default function InquiryForm() {
  const [form, setForm]         = useState(initialForm);
  const [errors, setErrors]     = useState({});
  const [status, setStatus]     = useState(null); // 'success' | 'error'
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name      = 'Full name is required.';
    if (!form.email.trim())    e.email     = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.phone.trim())    e.phone     = 'Phone number is required.';
    else if (!/^\+?[0-9\s\-()]{7,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number.';
    if (!form.user_type)       e.user_type = 'Please select a user type.';
    if (!form.category)        e.category  = 'Please select a category.';
    if (!form.message.trim())  e.message   = 'Message is required.';
    else if (form.message.trim().length < 10) e.message = 'Message must be at least 10 characters.';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(err => { const n = { ...err }; delete n[name]; return n; });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setStatus(null);
    try {
      const data = await api.submitInquiry(form);
      setStatus('success');
      setMessage(data.message);
      setForm(initialForm);
      setErrors({});
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
      if (err.errors) {
        const fieldErrors = {};
        err.errors.forEach(e => {
          const key = e.toLowerCase().includes('name') ? 'name'
            : e.toLowerCase().includes('email') ? 'email'
            : e.toLowerCase().includes('phone') ? 'phone'
            : e.toLowerCase().includes('user') ? 'user_type'
            : e.toLowerCase().includes('categor') ? 'category'
            : 'message';
          fieldErrors[key] = e;
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#eef2ff 0%,#f0f9ff 50%,#fdf4ff 100%)' }}>
      {/* ── Header ── */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <div style={{ width: 38, height: 38, background: 'var(--brand-primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>E</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>EdTech CRM</div>
              <div style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: -2 }}>Education Management Portal</div>
            </div>
          </div>
          <Link href="/admin/login" className="btn btn-outline btn-sm">Admin Login →</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: '3.5rem 0 2rem', textAlign: 'center' }}>
        <div className="container">
          <div style={{ display: 'inline-block', background: 'rgba(79,70,229,.1)', color: 'var(--brand-primary)', padding: '.35rem 1rem', borderRadius: 999, fontSize: '.8rem', fontWeight: 600, marginBottom: '1rem' }}>
            ✦ Official Inquiry Portal
          </div>
          <h1 style={{ fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, marginBottom: '1rem' }}>
            Have a Question?<br />
            <span style={{ color: 'var(--brand-primary)' }}>We're Here to Help.</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-2)', maxWidth: 520, margin: '0 auto 2rem' }}>
            Fill in the form below and our team will get back to you within 24 hours.
          </p>
        </div>
      </section>

      {/* ── Form ── */}
      <main className="container" style={{ maxWidth: 680, paddingBottom: '4rem' }}>
        {status && (
          <div className={`alert alert-${status}`} style={{ marginBottom: '1.5rem' }}>
            {status === 'success' ? '✅' : '❌'} {message}
          </div>
        )}

        <div className="card" style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.75rem', color: 'var(--text)' }}>
            Submit Your Inquiry
          </h2>

          <form onSubmit={handleSubmit} noValidate>
            {/* Row: User Type + Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="user_type">User Type *</label>
                <select
                  id="user_type" name="user_type" value={form.user_type}
                  onChange={handleChange}
                  className={`form-control${errors.user_type ? ' error' : ''}`}
                >
                  <option value="">Select user type</option>
                  {USER_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                {errors.user_type && <span className="error-msg">⚠ {errors.user_type}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="category">Category *</label>
                <select
                  id="category" name="category" value={form.category}
                  onChange={handleChange}
                  className={`form-control${errors.category ? ' error' : ''}`}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                {errors.category && <span className="error-msg">⚠ {errors.category}</span>}
              </div>
            </div>

            {/* Name */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" htmlFor="name">Full Name *</label>
              <input
                type="text" id="name" name="name" value={form.name}
                onChange={handleChange} placeholder="Enter your full name"
                className={`form-control${errors.name ? ' error' : ''}`}
              />
              {errors.name && <span className="error-msg">⚠ {errors.name}</span>}
            </div>

            {/* Row: Email + Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address *</label>
                <input
                  type="email" id="email" name="email" value={form.email}
                  onChange={handleChange} placeholder="Enter your email address"
                  className={`form-control${errors.email ? ' error' : ''}`}
                />
                {errors.email && <span className="error-msg">⚠ {errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">Phone Number *</label>
                <input
                  type="tel" id="phone" name="phone" value={form.phone}
                  onChange={handleChange} placeholder="Enter your phone number"
                  className={`form-control${errors.phone ? ' error' : ''}`}
                />
                {errors.phone && <span className="error-msg">⚠ {errors.phone}</span>}
              </div>
            </div>

            {/* Message */}
            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label" htmlFor="message">Your Message / Query *</label>
              <textarea
                id="message" name="message" value={form.message}
                onChange={handleChange}
                placeholder="Enter your query or message in detail…"
                className={`form-control${errors.message ? ' error' : ''}`}
                rows={5}
              />
              {errors.message && <span className="error-msg">⚠ {errors.message}</span>}
              <span style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: '.2rem' }}>
                {form.message.trim().length} characters
              </span>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ padding: '.85rem', fontSize: '1rem' }}>
              {loading ? <><span className="spinner" /> Submitting…</> : 'Submit Inquiry →'}
            </button>
          </form>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-3)', fontSize: '.82rem', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        © {new Date().getFullYear()} EdTech CRM. All rights reserved.
      </footer>
    </div>
  );
}
