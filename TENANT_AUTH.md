# Tenant Authentication

The tenant application uses the Django backend in `../KargoFlow`:

- `POST /api/auth/login/` with email, password, and `identity_type: tenant`.
- `GET /api/tenant/users/me/` validates the session and returns its company, profile, and permission hints.
- `POST /api/auth/logout/` revokes the session.

Tenant accounts cannot switch companies.

### Browser sessions (BFF cookies)

Session tokens never reach browser JavaScript. On sign-in the backend sets the token in an `HttpOnly`, `SameSite=Strict` cookie with no expiry date, so it is removed when the browser closes; the response body carries no token. Each web client has its own cookie, so the apps can share one domain:

| Client | Cookie (dev / production) | `X-KF-Client` |
|---|---|---|
| Tenant app | `kf_tenant_sid` / `__Host-kf_tenant_sid` | `tenant` |
| Support console tab | `kf_support_sid` / `__Host-kf_support_sid` | `support` |
| Platform admin | `kf_platform_sid` / `__Host-kf_platform_sid` | `platform` |

- Every request sends `X-KF-Client`; the server reads only that client's cookie, and only for the identity it was issued to. The header is not a credential.
- State-changing requests send Django's CSRF token (`csrftoken` cookie echoed in `X-CSRFToken`); a cookie-authenticated write without it is refused with 403. Sign-in fetches `GET /api/auth/csrf/` first.
- On start-up the app asks `GET /api/tenant/users/me/` whether a session exists (a 401 means signed out).
- Sessions also end after inactivity: 2 hours for tenant users, 30 minutes for platform staff, besides their absolute expiry.
- The platform admin opens the support console with a single-use code in the URL fragment (`#support_code=`, valid 60 seconds), which the tenant app exchanges at `POST /api/auth/support/exchange/` for its support cookie. No token ever appears in a URL.
- Logout revokes the session server-side and deletes the cookie. API clients that send no `X-KF-Client` header (scripts, Postman) keep receiving a Bearer token in the body.

The backend binds tenant access to the authenticated account's company and checks permissions on each operation. Company IDs supplied by the browser cannot grant membership.

## Local Development

Start the Django backend on port 8000 with its configured database and runtime roles. Use one of the trusted development ports (3000, 4173, 5173, 5174): with `DJANGO_DEBUG=true` the backend trusts those origins for CSRF, because the dev proxies rewrite the Host header. Start the frontend with `npm run dev --workspace=frontend`. Both Vite and the root Node server forward tenant API requests to `http://127.0.0.1:8000`; set `BACKEND_URL` to change that target. Vite uses the next free port if its default port is occupied.

For deployment, serve `/api` from the same origin as the app through the reverse proxy. Do not point `VITE_API_URL` at another origin: cookie sessions rely on same-origin requests. Use an active tenant account provisioned in that backend. Authentication requires both frontend and backend changes in this workspace.

The root Node server no longer supplies mock tenant API responses. Existing legacy business API URLs in the frontend still need migration to the Django tenant routes where their contracts differ. Platform mock routes under `/api/platform/` are outside this tenant authentication change.

## Verification

Frontend: `npm run test --workspace=frontend -- src/services/auth.test.js src/services/axios.test.js src/features/auth/context/AuthContext.test.jsx`

Backend (from `../KargoFlow`): `venv/bin/python manage.py test tests.tenant.test_self_profile tests.core.test_tenant_login_inactive_company tests.security.test_bff_cookie_sessions --noinput`, plus `scripts/bff_cookie_e2e_check.py` against a running disposable server (cookie, CSRF, support handoff and idle timeout over HTTP with the real runtime roles).
