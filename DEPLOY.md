# Render Deployment Guide (Dood Cafe)

This project has two services and one managed database on Render:
1. **PostgreSQL Database** (`doodcafe-db`)
2. **Backend Web Service** (`doodcafe-backend`)
3. **Frontend Static Site** (`doodcafe-frontend`)

---

## 1. Database Setup (Render Postgres)
- Service name: `doodcafe-db` (Virginia or your preferred region)
- In Render Dashboard under `doodcafe-db`:
  - Copy the **Internal Database URL** (for the backend web service).
  - Copy the **External Database URL** (for running one-time seed/management commands from your computer).

---

## 2. Backend Web Service (`doodcafe-backend`)
1. Click **New +** → **Web Service** → Connect your `Doss0802/Doodcafe` repo.
2. Configure settings:
   - **Name**: `doodcafe-backend` (or your choice)
   - **Region**: Same region as `doodcafe-db` (e.g. Virginia / Oregon)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Health Check Path**: `/health`
3. Environment Variables:
   - Click **Add from .env**
   - Paste the contents of your local `render-env.local.txt` file.
   - Replace `PASTE_INTERNAL_DATABASE_URL_HERE` with the **Internal Database URL** from `doodcafe-db`.
4. Deploy the service.
   - On boot, `server.js` automatically synchronizes PostgreSQL tables and seeds default categories and items.
   - Copy the backend URL (e.g., `https://doodcafe-backend.onrender.com`).

---

## 3. Frontend Static Site (`doodcafe-frontend`)
1. In your existing Static Site `doodcafe-frontend`:
2. Go to **Settings** → **Environment Variables**:
   - Add/Update: `VITE_API_URL` = `https://<your-backend-service-name>.onrender.com`
   - Add/Update: `VITE_SOCKET_URL` = `https://<your-backend-service-name>.onrender.com`
3. Click **Manual Deploy** → **Clear build cache & deploy**.

---

## 4. One-Time Data Loading / Admin Management
Run these commands from your local computer from the project root:

### Load / Update Menu Data into Render PostgreSQL:
```bash
cd server
DATABASE_URL="<EXTERNAL_DATABASE_URL_FROM_RENDER>" node scripts/import-menu.js
```

### Create / Update Admin User in Render PostgreSQL:
```bash
cd server
DATABASE_URL="<EXTERNAL_DATABASE_URL_FROM_RENDER>" node scripts/create-user.js --email "admin@doodcafe.com" --password "<YOUR_NEW_PASSWORD>" --role admin
```

---

## Important Architecture Notes
- **Ephemeral Storage**: Menu images uploaded via Admin dashboard (`/uploads`) are stored on Render's ephemeral local disk and will reset on service redeploys. Built-in cafe images located in the frontend/backend repository are permanent. For uploaded images in high-scale production, integrate cloud object storage (e.g., AWS S3 / Cloudinary).
