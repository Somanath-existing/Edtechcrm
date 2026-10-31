import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../../lib/api';

export default function AdminLogin() {
  const [form, setForm]                 = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.me().then(() => router.replace('/admin/dashboard')).catch(() => {});
  }, [router]);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please enter both email and password.'); return; }

    setLoading(true);
    try {
      const data = await api.login(form);
      localStorage.removeItem('admin_token'); // Ensure no token in localStorage
      localStorage.setItem('admin_info', JSON.stringify(data.admin));
      router.replace('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e40af 100%)', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,.15)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .75rem', backdropFilter: 'blur(4px)' }}>
            <span style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800 }}>E</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800 }}>EdTech CRM</h1>
          <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '.88rem', marginTop: '.25rem' }}>Admin Portal</p>
        </div>

        <div className="card" style={{ padding: '2.25rem', boxShadow: 'var(--shadow-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text)' }}>
            Sign in to your account
          </h2>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                type="email" id="email" name="email"
                value={form.email} onChange={handleChange}
                placeholder="Enter your email address"
                className="form-control"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="form-control"
                  style={{ paddingRight: '2.5rem' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-3)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit" className="btn btn-primary btn-full" disabled={loading}
              style={{ padding: '.85rem', fontSize: '1rem' }}
            >
              {loading ? <><span className="spinner" /> Signing in…</> : 'Sign In →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '.85rem', color: 'var(--text-3)' }}>
            <Link href="/" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
              ← Back to Inquiry Form
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: '.78rem', marginTop: '1.5rem' }}>
          Protected by JWT authentication
        </p>
      </div>
    </div>
  );
}
