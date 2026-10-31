import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../../lib/api';

const CATEGORIES  = ['', 'Scholarship', 'Concert', 'Admission', 'General Query'];
const USER_TYPES  = ['', 'Parent', 'Student', 'School'];
const STATUSES    = ['New', 'In Progress', 'Resolved', 'Closed'];

function badgeClass(type, value) {
  const map = {
    status: { 'New': 'badge-new', 'In Progress': 'badge-in-progress', 'Resolved': 'badge-resolved', 'Closed': 'badge-closed' },
    user:   { 'Parent': 'badge-parent', 'Student': 'badge-student', 'School': 'badge-school' },
    cat:    { 'Scholarship': 'badge-scholarship', 'Concert': 'badge-concert', 'Admission': 'badge-admission', 'General Query': 'badge-general' },
  };
  return `badge ${(map[type] || {})[value] || ''}`;
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
      <span style={{ fontSize: '2rem', fontWeight: 800, color: color || 'var(--text)', lineHeight: 1 }}>{value ?? '–'}</span>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [admin, setAdmin]             = useState(null);
  const [inquiries, setInquiries]     = useState([]);
  const [stats, setStats]             = useState(null);
  const [pagination, setPagination]   = useState({ total: 0, page: 1, totalPages: 1 });
  const [filters, setFilters]         = useState({ category: '', user_type: '', status: '', search: '', page: 1 });
  const [loading, setLoading]         = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedInquiry, setSelected] = useState(null);
  const [updatingId, setUpdatingId]   = useState(null);
  const [search, setSearch]           = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdForm, setPwdForm]         = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdLoading, setPwdLoading]   = useState(false);
  const [pwdMsg, setPwdMsg]           = useState({ type: '', text: '' });

  // Auth guard
  useEffect(() => {
    api.me()
      .then(d => {
        setAdmin(d.admin);
        fetchStats();
        setLoading(false);
      })
      .catch(() => {
        localStorage.clear();
        router.replace('/admin/login');
      });
  }, []);

  const fetchStats = async () => {
    try { const d = await api.getStats(); setStats(d.stats); } catch {}
  };

  const fetchInquiries = useCallback(async (f = filters) => {
    setTableLoading(true);
    try {
      const d = await api.getInquiries({ ...f, limit: 15 });
      setInquiries(d.inquiries);
      setPagination(d.pagination);
    } catch (err) {
      if (err.status === 401) { localStorage.clear(); router.replace('/admin/login'); }
    } finally { setTableLoading(false); }
  }, [filters]);

  useEffect(() => { if (!loading) fetchInquiries(); }, [filters, loading]);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value, page: 1 }));

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters(f => ({ ...f, search: search.trim(), page: 1 }));
  };

  const handleStatusUpdate = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.updateStatus(id, status);
      setInquiries(q => q.map(i => i.id === id ? { ...i, status } : i));
      if (selectedInquiry?.id === id) setSelected(s => ({ ...s, status }));
      fetchStats();
    } catch (err) { alert(err.message); }
    finally { setUpdatingId(null); }
  };

  const logout = async () => {
    try { await api.logout(); } catch {}
    localStorage.clear();
    router.replace('/admin/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setPwdLoading(true);
    try {
      const res = await api.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      if (res.token) {
        localStorage.setItem('admin_token', res.token);
      }
      setPwdMsg({ type: 'success', text: 'Password successfully updated! All other sessions were revoked.' });
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setShowPasswordModal(false), 2000);
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message });
    } finally {
      setPwdLoading(false);
    }
  };

  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner spinner-dark" style={{ width: 36, height: 36 }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ── Top Bar ── */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '.9rem 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              <div style={{ width: 34, height: 34, background: 'var(--brand-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 800 }}>E</span>
              </div>
            </Link>
            <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '1rem' }}>Admin Dashboard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {admin && (
              <span style={{ fontSize: '.85rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <div style={{ width: 30, height: 30, background: 'var(--brand-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '.85rem', fontWeight: 700 }}>
                  {admin.name?.[0] || 'A'}
                </div>
                <span style={{ display: 'none' }}>{admin.name}</span>
              </span>
            )}
            <button onClick={() => setShowPasswordModal(true)} className="btn btn-outline btn-sm">Change Password</button>
            <button onClick={logout} className="btn btn-outline btn-sm">Logout</button>
          </div>
        </div>
      </header>

      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        {/* ── Stats ── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard label="Total Inquiries" value={stats.total_count} color="var(--brand-primary)" />
            <StatCard label="New"             value={stats.new_count}   color="#1e40af" />
            <StatCard label="In Progress"     value={stats.in_progress_count} color="#92400e" />
            <StatCard label="Resolved"        value={stats.resolved_count}    color="#065f46" />
          </div>
        )}

        {/* ── Filters ── */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            {/* Search */}
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '.5rem', flex: '1', minWidth: 200 }}>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or phone…"
                className="form-control" style={{ maxWidth: 280 }}
              />
              <button type="submit" className="btn btn-primary btn-sm">Search</button>
              {filters.search && (
                <button type="button" className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setFilter('search', ''); }}>✕</button>
              )}
            </form>

            {/* Category */}
            <div className="form-group" style={{ minWidth: 160 }}>
              <label className="form-label">Category</label>
              <select className="form-control" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c || 'All Categories'}</option>)}
              </select>
            </div>

            {/* User Type */}
            <div className="form-group" style={{ minWidth: 150 }}>
              <label className="form-label">User Type</label>
              <select className="form-control" value={filters.user_type} onChange={e => setFilter('user_type', e.target.value)}>
                {USER_TYPES.map(u => <option key={u} value={u}>{u || 'All Types'}</option>)}
              </select>
            </div>

            {/* Status */}
            <div className="form-group" style={{ minWidth: 150 }}>
              <label className="form-label">Status</label>
              <select className="form-control" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Reset */}
            {(filters.category || filters.user_type || filters.status || filters.search) && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: '1.4rem' }}
                onClick={() => { setSearch(''); setFilters({ category: '', user_type: '', status: '', search: '', page: 1 }); }}>
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>
              Inquiries
              <span style={{ marginLeft: '.5rem', fontSize: '.8rem', color: 'var(--text-3)', fontWeight: 400 }}>
                {pagination.total} total
              </span>
            </div>
            {tableLoading && <span className="spinner spinner-dark" style={{ width: 18, height: 18 }} />}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {['Name', 'Phone', 'Email', 'User Type', 'Category', 'Date', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-2)', fontSize: '.78rem', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inquiries.length === 0 && !tableLoading && (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
                      No inquiries found.
                    </td>
                  </tr>
                )}
                {inquiries.map((inq, i) => (
                  <tr key={inq.id}
                    style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)', transition: 'background .15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,70,229,.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)'}
                  >
                    <td style={{ padding: '.8rem 1rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setSelected(inq)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--brand-primary)', fontSize: '.875rem', padding: 0 }}>
                        {inq.name}
                      </button>
                    </td>
                    <td style={{ padding: '.8rem 1rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{inq.phone}</td>
                    <td style={{ padding: '.8rem 1rem', color: 'var(--text-2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inq.email}</td>
                    <td style={{ padding: '.8rem 1rem' }}><span className={badgeClass('user', inq.user_type)}>{inq.user_type}</span></td>
                    <td style={{ padding: '.8rem 1rem' }}><span className={badgeClass('cat', inq.category)}>{inq.category}</span></td>
                    <td style={{ padding: '.8rem 1rem', color: 'var(--text-3)', whiteSpace: 'nowrap', fontSize: '.8rem' }}>{fmt(inq.created_at)}</td>
                    <td style={{ padding: '.8rem 1rem' }}><span className={badgeClass('status', inq.status)}>{inq.status}</span></td>
                    <td style={{ padding: '.8rem 1rem' }}>
                      <select
                        value={inq.status}
                        onChange={e => handleStatusUpdate(inq.id, e.target.value)}
                        disabled={updatingId === inq.id}
                        className="form-control"
                        style={{ padding: '.3rem .6rem', fontSize: '.8rem', width: 'auto', minWidth: 120 }}
                      >
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '.83rem', color: 'var(--text-3)' }}>
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} results
              </span>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                >← Prev</button>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                >Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selectedInquiry && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{selectedInquiry.name}</h3>
                <p style={{ fontSize: '.83rem', color: 'var(--text-3)', marginTop: '.2rem' }}>{fmt(selectedInquiry.created_at)}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-3)', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {[
                { label: 'Email', value: selectedInquiry.email },
                { label: 'Phone', value: selectedInquiry.phone },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '.75rem 1rem' }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '.25rem' }}>{label}</div>
                  <div style={{ color: 'var(--text)', fontSize: '.9rem', wordBreak: 'break-all' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem' }}>
              <span className={badgeClass('user', selectedInquiry.user_type)}>{selectedInquiry.user_type}</span>
              <span className={badgeClass('cat', selectedInquiry.category)}>{selectedInquiry.category}</span>
              <span className={badgeClass('status', selectedInquiry.status)}>{selectedInquiry.status}</span>
            </div>

            <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '.5rem' }}>Message</div>
              <p style={{ color: 'var(--text)', lineHeight: 1.7, fontSize: '.9rem' }}>{selectedInquiry.message}</p>
            </div>

            <div className="form-group">
              <label className="form-label">Update Status</label>
              <select
                value={selectedInquiry.status}
                onChange={e => handleStatusUpdate(selectedInquiry.id, e.target.value)}
                disabled={updatingId === selectedInquiry.id}
                className="form-control"
              >
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      {/* ── Change Password Modal ── */}
      {showPasswordModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: 440, width: '100%', padding: '2rem' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>Change Admin Password</h3>
              <button onClick={() => setShowPasswordModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-3)' }}>✕</button>
            </div>

            {pwdMsg.text && (
              <div style={{ padding: '.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontSize: '.85rem', background: pwdMsg.type === 'error' ? 'rgba(239,68,68,.1)' : 'rgba(16,185,129,.1)', color: pwdMsg.type === 'error' ? '#dc2626' : '#059669', border: `1px solid ${pwdMsg.type === 'error' ? '#fca5a5' : '#6ee7b7'}` }}>
                {pwdMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  required
                  value={pwdForm.currentPassword}
                  onChange={e => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                  className="form-control"
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  required
                  value={pwdForm.newPassword}
                  onChange={e => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  className="form-control"
                  placeholder="Min 8 chars, uppercase, lowercase, number, symbol"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={pwdForm.confirmPassword}
                  onChange={e => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                  className="form-control"
                  placeholder="Confirm new password"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.75rem', marginTop: '.5rem' }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="btn btn-outline btn-sm">Cancel</button>
                <button type="submit" disabled={pwdLoading} className="btn btn-primary btn-sm">
                  {pwdLoading ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
