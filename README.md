# EdTech CRM & Inquiry System

A full-stack CRM inquiry system built with **Next.js**, **Express.js**, and **Supabase PostgreSQL**. Anyone can submit a public inquiry; admins can log in to view, filter, search, and manage all inquiries.

---

## ✅ Features

- **Public Inquiry Form** — responsive, validated form with User Type and Category dropdowns
- **Supabase PostgreSQL** — all data stored via `pg` connection string (no Supabase client SDK)
- **Custom JWT Auth** — bcrypt password hashing, JWT generation, protected middleware — no Supabase Auth
- **Admin Dashboard** — tabular view with filter by Category, User Type, Status + name/phone search
- **Status Management** — update inquiry status (New / In Progress / Resolved / Closed) inline
- **Stats Summary** — at-a-glance counts on the dashboard
- **Pagination** — 15 results per page
- **Rate Limiting** — 10 inquiry submissions/hour per IP; 100 general requests per 15 min
- **Deploy-ready** — frontend on Vercel, backend on Render

---

## 🗂 Project Structure

```
edtech-crm/
├── backend/
│   ├── src/
│   │   ├── db/index.js          # pg pool (Supabase connection)
│   │   ├── middleware/auth.js   # JWT verification middleware
│   │   ├── routes/auth.js       # POST /api/auth/login, /register, GET /me
│   │   └── routes/inquiries.js  # CRUD + filter/search + stats
│   ├── scripts/
│   │   └── seed-admin.js        # One-time admin seeder
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── pages/
│   │   ├── index.js             # Public inquiry form
│   │   └── admin/
│   │       ├── login.js         # Admin login
│   │       └── dashboard.js     # Protected admin dashboard
│   ├── lib/api.js               # Fetch wrapper
│   ├── styles/globals.css
│   ├── .env.example
│   └── package.json
├── schema.sql                   # Full DB schema (run in Supabase SQL Editor)
└── README.md
```

---

## ⚡ Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-username/edtech-crm.git
cd edtech-crm
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection string → URI**
3. Copy the connection string (use the **Transaction pooler** URL, port `6543`)
4. Go to **SQL Editor** and run the contents of `schema.sql`

### 3. Configure and run the Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
JWT_SECRET=generate_with_node_-e_require_crypto_randomBytes_64_toString_hex
JWT_EXPIRES_IN=8h
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
ADMIN_REGISTER_SECRET=your_secret_registration_key
```

```bash
npm install
npm run seed        # Creates default admin: admin@edtech.com / Admin@123456
npm run dev         # Starts on http://localhost:4000
```

### 4. Configure and run the Frontend

```bash
cd ../frontend
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

```bash
npm install
npm run dev         # Starts on http://localhost:3000
```

---

## 🔑 Custom JWT Auth (Implementation Details)

The backend implements authentication entirely from scratch — **no Supabase Auth**.

| Component | Implementation |
|-----------|----------------|
| Password storage | `bcrypt` with 12 salt rounds |
| Token generation | `jsonwebtoken` — HS256, expires in 8h |
| Protected routes | `src/middleware/auth.js` verifies `Authorization: Bearer <token>` |
| Admin creation | `POST /api/auth/register` requires `ADMIN_REGISTER_SECRET` env var |

### Test the auth flow

```bash
# 1. Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@edtech.com","password":"Admin@123456"}'

# 2. Use the returned token
TOKEN="<paste token here>"

# 3. Access protected route
curl http://localhost:4000/api/inquiries \
  -H "Authorization: Bearer $TOKEN"

# 4. Verify token
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🌐 Deployment

### Backend → Render

1. Push the repo to GitHub
2. New Web Service on [render.com](https://render.com) → connect repo
3. **Root directory**: `backend`
4. **Build command**: `npm install`
5. **Start command**: `npm start`
6. Add environment variables (same as `.env` but with `NODE_ENV=production`)
7. Set `ALLOWED_ORIGINS` to your Vercel frontend URL

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. **Root directory**: `frontend`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your Render backend URL (e.g. `https://edtech-crm-api.onrender.com`)
4. Deploy

---

## 📋 API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/login` | No | Admin login → returns JWT |
| `POST` | `/api/auth/register` | Requires `secret` | Create admin (seeding) |
| `GET`  | `/api/auth/me` | JWT | Current admin info |
| `POST` | `/api/inquiries` | No | Submit public inquiry |
| `GET`  | `/api/inquiries` | JWT | List inquiries with filters/search/pagination |
| `PATCH`| `/api/inquiries/:id/status` | JWT | Update inquiry status |
| `GET`  | `/api/inquiries/stats` | JWT | Dashboard stats |

### Inquiry filters (GET `/api/inquiries`)

| Query param | Values |
|-------------|--------|
| `category` | Scholarship, Concert, Admission, General Query |
| `user_type` | Parent, Student, School |
| `status` | New, In Progress, Resolved, Closed |
| `search` | Name or phone substring |
| `page` | integer (default 1) |
| `limit` | integer (default 15) |

---

## 🗄 Database Schema

See [`schema.sql`](./schema.sql) for the complete schema. Key tables:

- **`admins`** — id (UUID), name, email, password_hash, timestamps
- **`inquiries`** — id (UUID), name, email, phone, user_type (enum), category (enum), message, status (enum), timestamps

Run the schema in **Supabase → SQL Editor** before starting the backend.

---

## 🔒 Security

- Passwords hashed with `bcrypt` (12 rounds)
- JWTs expire after 8 hours
- Helmet.js security headers
- CORS restricted to configured origins
- Rate limiting on all routes + stricter limits on inquiry submission
- Input validation on both frontend and backend
- Parameterized queries (no SQL injection)
