# Hostinger Production Deployment Guide — Dood Cafe

This guide outlines the production deployment blueprint for hosting the Dood Cafe full-stack application on Hostinger (Hostinger VPS or Hostinger Cloud Node.js Application).

---

## 1. Architecture Overview

- **Backend runtime**: Node.js v18+ / v20+ / v22+
- **Entry point**: `server/server.js`
- **Frontend distribution**: `client/dist/` (pre-compiled Vite production bundle)
- **Database**: PostgreSQL (cloud-hosted via Render or Hostinger VPS PostgreSQL)
- **Static Assets**:
  - `/images/*` maps to `client/dist/*`, `client/public/*`, and `client/src/images/*`
  - `/uploads/*` maps to `server/uploads/*`

---

## 2. Production Files & Artifacts to Upload

When uploading via Hostinger File Manager, FTP, or Git:

```
doodcafe/
├── package.json
├── package-lock.json
├── DEPLOYMENT_HOSTINGER.md
├── client/
│   └── dist/                  <-- Upload the entire pre-compiled client/dist folder
│       ├── assets/
│       ├── index.html
│       ├── quick-bites/
│       ├── burger/
│       └── ...
└── server/
    ├── .env.production        <-- Rename to .env on Hostinger
    ├── server.js
    ├── package.json
    ├── package-lock.json
    ├── force_reseed.js
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── src/
    ├── utils/
    └── uploads/               <-- Runtime user uploads folder
```

> **IMPORTANT**: DO NOT upload `node_modules/`. Run `npm install` on the server runtime so native binary bindings (e.g. `bcrypt`, `pg`) compile against the host OS (Linux).

---

## 3. Production Environment Variables (`.env`)

Set these environment variables in Hostinger's Node.js Environment section or create `server/.env`:

```env
DATABASE_URL=postgresql://dossadmin:C2KKRiuW9EdrgF8QTWlovyTH5nazy2na@://render.com
JWT_ACCESS_SECRET=your_super_secret_access_key_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production
NODE_ENV=production
PORT=5000
```

---

## 4. Hostinger Node.js Application Setup Steps

### Option A: Hostinger Cloud / Shared Web Hosting (Node.js Selector)
1. In hPanel, go to **Advanced > Node.js**.
2. Click **Create Application**.
3. Set parameters:
   - **Node.js version**: `20.x` or `22.x`
   - **Application mode**: `Production`
   - **Application root**: `doodcafe/server` (or `doodcafe` if running from root)
   - **Application startup file**: `server.js`
4. Upload files via File Manager / Git / FTP as shown in Section 2.
5. In the Node.js control panel, click **Run NPM Install**.
6. Click **Restart Application**.

### Option B: Hostinger VPS (Ubuntu / Debian + Nginx + PM2)
1. SSH into VPS:
   ```bash
   ssh root@<YOUR_VPS_IP>
   ```
2. Clone repository & install dependencies:
   ```bash
   git clone https://github.com/Doss0802/Doodcafe.git /var/www/doodcafe
   cd /var/www/doodcafe
   npm install
   npm run build
   ```
3. Start backend with PM2:
   ```bash
   npm install -g pm2
   cd /var/www/doodcafe/server
   cp .env.production .env
   pm2 start server.js --name doodcafe-api
   pm2 save
   pm2 startup
   ```

---

## 5. Automated Verification Checklist

- [x] Client compiled bundle in `client/dist/`
- [x] `resolveImageUrl.js` supports relative `/api` paths and explicit domains
- [x] Helmet configured with `crossOriginResourcePolicy: { policy: 'cross-origin' }`
- [x] Multi-path Express image resolution active for `/images/*`
- [x] SPA HTML5 routing fallback enabled for non-API routes
