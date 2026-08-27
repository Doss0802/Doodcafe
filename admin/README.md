# Dood Cafe — Full-Stack Admin Module

This directory contains the full-stack admin infrastructure for Dood Cafe.

## Structure
- `backend/`:
  - `admin.service.js`: Direct MongoDB database aggregations querying the customer `Order`, `MenuItem`, and `User` collections.
  - `admin.controller.js`: Express controller handling requests and formatting responses.
  - `admin.routes.js`: Express router exposing `/kpis`, `/trends`, `/top-items`, `/live-orders`, and `/orders/:id/status`.
  - `index.js`: Exporter linking routes, controller, service, and models.
- `frontend/`: React Admin Dashboard with live customer order stream, trend charts, and top-selling dishes leaderboard.
- `models/`: Database schemas used for admin order processing, sales analytics, and user metrics.

## API Endpoints
1. `GET /api/admin/kpis`: Aggregated Daily (Today), Weekly (7D), Monthly (30D), and All-Time totals from `Order` collection.
2. `GET /api/admin/trends?period=daily|weekly|monthly`: Revenue, 38% COGS, and 62% net profit trend time-series buckets.
3. `GET /api/admin/top-items?limit=8`: Top dishes ranked by total units sold and revenue contribution.
4. `GET /api/admin/live-orders?status=all|pending|preparing|ready`: Customer order stream populated with customer contact details.
5. `PATCH /api/admin/orders/:id/status`: Status update pipeline (`Placed` → `Preparing` → `Ready for Pickup` → `Completed`).
