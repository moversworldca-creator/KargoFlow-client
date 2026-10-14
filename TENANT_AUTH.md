# Tenant Authentication

The tenant application uses the Django backend in `../KargoFlow`:

- `POST /api/auth/login/` with email, password, and `identity_type: tenant`.
- `GET /api/tenant/users/me/` validates the session and returns its company, profile, and permission hints.
- `POST /api/auth/logout/` revokes the session.

The backend binds tenant access to the authenticated account's company and checks permissions on each operation. Company IDs supplied by the browser cannot grant membership. Tenant accounts cannot switch companies.

The browser keeps the opaque bearer token in sessionStorage. It is validated on reload; cached profiles and legacy demo tokens never grant access. Sessions expire according to backend policy. There is no JWT refresh endpoint or 30-day remember-device option. Logout clears local access immediately and attempts server revocation; offline revocation cannot be guaranteed.

## Local Development

Start the Django backend on port 8000 with its configured database and runtime roles. Start the frontend with `npm run dev --workspace=frontend`. Both Vite and the root Node server forward tenant API requests to `http://127.0.0.1:8000`; set `BACKEND_URL` to change that target. Vite uses the next free port if its default port is occupied.

For deployment, serve `/api` through the Django backend, or configure `VITE_API_URL` when building the frontend. Use an active tenant account provisioned in that backend. Authentication requires both frontend and backend changes in this workspace.

The root Node server no longer supplies mock tenant API responses. Existing legacy business API URLs in the frontend still need migration to the Django tenant routes where their contracts differ. Platform mock routes under `/api/platform/` are outside this tenant authentication change.

## Verification

Frontend: `npm run test --workspace=frontend -- src/services/auth.test.js src/services/axios.test.js src/features/auth/context/AuthContext.test.jsx`

Backend (from `../KargoFlow`): `venv/bin/python manage.py test tests.tenant.test_self_profile tests.core.test_tenant_login_inactive_company --noinput`
