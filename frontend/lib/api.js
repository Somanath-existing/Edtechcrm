const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Automatically send and receive secure httpOnly auth cookies
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || `Request failed: ${res.status}`);
    err.status = res.status;
    err.errors = data.errors;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  changePassword: (body) => request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),

  // Public
  submitInquiry: (body) => request('/api/inquiries', { method: 'POST', body: JSON.stringify(body) }),

  // Admin
  getInquiries: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/api/inquiries${qs ? '?' + qs : ''}`);
  },

  updateStatus: (id, status) =>
    request(`/api/inquiries/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getStats: () => request('/api/inquiries/stats'),
};
