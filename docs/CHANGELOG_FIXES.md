# Dood Cafe — QA Fix Changelog
**Session Date:** 2026-10-16

---

## [server/server.js]

### FIX-001: Added missing s import
- **What:** Added const fs = require('fs') at line 3.
- **Why:** s.existsSync() was called at line 206 to check for client/dist. Without the import, this crashes the server with ReferenceError: fs is not defined when client/dist exists (i.e., all production deployments).

### FIX-002: Fixed Express 5 incompatible wildcard catch-all route
- **What:** Changed pp.get('*', ...) to pp.get('/{*path}', ...).
- **Why:** Express 5 uses path-to-regexp v8+ which no longer accepts bare *. This threw PathError: Missing parameter name at index 1 at startup, making the server completely unusable.

### FIX-003: Fixed CORS rejection dead-code branch
- **What:** Changed eturn callback(null, true) in the rejection branch to eturn callback(new Error(...), false).
- **Why:** Both branches of the origin callback returned 	rue — making CORS effectively open to all origins. The allowlist was purely cosmetic.

---

## [server/controllers/order.controller.js]

### FIX-004: Fixed order initial status from 'delivered' to 'pending'
- **What:** Changed const initialStatus = 'delivered' to const initialStatus = 'pending'.
- **Why:** Every newly placed order was born in a delivered state. This broke the entire order lifecycle — admin couldn't manage orders, cancellation logic was unreachable (only pending/confirmed can be cancelled), and order history showed all orders as already delivered instantly.

---

## [server/routes/adminMenu.route.js]

### FIX-005: Hardened file upload validation (MIME type + extension dual check)
- **What:** Replaced extension-only regex filter with a dual check using both MIME type (strict Set allowlist) and extension regex.
- **Why:** Extension-only filtering can be trivially bypassed by renaming files (e.g., webshell.php → webshell.php.jpg or exploit.svg). SVG was also removed from the allowlist as SVG files can embed executable JavaScript.
- **Also:** Normalized file size limit from 10MB to 5MB (matches upload.js).

---

## [.gitignore]

### FIX-006: Extended .gitignore to cover all subdirectory .env files
- **What:** Added **/.env and **/.env.* glob patterns. Added uploads/ exclusion.
- **Why:** Previous patterns only excluded .env at the monorepo root. server/.env and server/.env.production (containing real secrets) were not covered and could be accidentally committed.

---

## [Dependencies — npm audit fix]

### FIX-007: Applied npm audit fix on server
- **Packages fixed:** proxy-addr (critical CORS/IP spoof), engine.io (DoS), morgan (log injection), brace-expansion, ip-address
- **Result:** Reduced from 10 vulnerabilities to 5 (remaining 5 are dev-only nodemon/braces chain and uuid/sequelize internal chain with no exploitable vector in production)

### FIX-008: Applied npm audit fix on client
- **Packages fixed:** axios (prototype pollution, SSRF, ReDoS), dompurify (XSS), source-map-js (DoS)
- **Result:** 0 vulnerabilities remaining
