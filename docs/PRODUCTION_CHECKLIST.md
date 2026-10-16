# Dood Cafe — Production Deployment Checklist

## MUST-DO Before Any Production Deploy

- [ ] **Rotate JWT secrets** — Generate cryptographically strong secrets:
      node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
      Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to unique 64-byte values.

- [ ] **Change ADMIN_PASSWORD** — Replace Admin@123 with a strong password (16+ chars, mixed case, symbols, numbers).

- [ ] **Set NODE_ENV=production** — Ensures: secure cookies, HSTS headers active, verbose DB errors hidden, rate limiters active.

- [ ] **Set CLIENT_ORIGIN** — Set to your exact production frontend URL (e.g., https://doodcafe.com). CORS will reject other origins.

- [ ] **Verify DATABASE_URL** — Points to production PostgreSQL instance (not localhost).

- [ ] **Confirm uploads/ directory** — Exists and is writable by the server process. Not committed to git.

## Pre-Deploy Verification

- [ ] 
pm run build at root completes with 0 errors
- [ ] 
pm audit shows 0 critical/high vulnerabilities in production deps
- [ ] Server boots: 
ode server.js shows "PostgreSQL Connected" log line
- [ ] Health check responds: GET /api/v1/health returns 200

## Post-Deploy Smoke Tests

- [ ] GET /api/v1/health → 200 OK
- [ ] POST /api/v1/auth/register → 201, returns access token
- [ ] POST /api/v1/auth/login → 200, sets refreshToken cookie
- [ ] GET /api/v1/menu → 200, returns array of menu items with images
- [ ] GET /images/Quick Bites/French fries.jpeg → 200 (image served)
- [ ] Admin login → admin dashboard loads, Socket.io connected

## Security Headers (verify with securityheaders.com)

- [ ] Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Content-Security-Policy: present
- [ ] Cross-Origin-Resource-Policy: cross-origin

## Remaining Acknowledged Risks

| Risk | Mitigation |
|---|---|
| Refresh tokens stored as plaintext in DB | tokenVersion rotation invalidates all tokens on logout-all. Acceptable for current scale. |
| uuid buffer bounds (via sequelize) | Internal UUID generation only. Not reachable via user input. Monitor for Sequelize patch. |
| nodemon braces DoS (dev dep) | Dev-only. Not included in production bundle. |
