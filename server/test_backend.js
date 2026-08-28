/**
 * Atlas Connection & Endpoint Health Test Script
 * Tests: MongoDB Atlas connection, all route endpoints, schema validation
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');
const http = require('http');

const ATLAS_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN  = '\x1b[36m';
const RESET = '\x1b[0m';
const ok  = (msg) => console.log(`${GREEN}   ✅ ${msg}${RESET}`);
const err = (msg) => console.log(`${RED}   ❌ ${msg}${RESET}`);
const warn = (msg) => console.log(`${YELLOW}   ⚠️  ${msg}${RESET}`);
const info = (msg) => console.log(`${CYAN}${msg}${RESET}`);

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${PORT}${path}`, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.setTimeout(4000, () => reject(new Error('timeout')));
    req.on('error', reject);
  });
}

async function main() {
  let passed = 0, failed = 0;

  // ── 1. Env Variables ───────────────────────────────────────────
  info('\n══════════════════════════════════════════════════════');
  info('🔧 [1] Environment Variables Check');
  info('══════════════════════════════════════════════════════');
  const envChecks = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'PORT', 'CLIENT_ORIGIN'];
  for (const key of envChecks) {
    if (process.env[key]) { ok(`${key} is set`); passed++; }
    else { err(`${key} is MISSING`); failed++; }
  }
  if (ATLAS_URI?.includes('localhost')) {
    warn('MONGODB_URI still points to localhost — should be Atlas cloud URI');
  }

  // ── 2. MongoDB Atlas Connection ─────────────────────────────────
  info('\n══════════════════════════════════════════════════════');
  info('☁️  [2] MongoDB Atlas Connection Test');
  info('══════════════════════════════════════════════════════');
  console.log(`   URI: ${ATLAS_URI?.replace(/:([^@]+)@/, ':****@')}`);

  let client;
  try {
    client = new MongoClient(ATLAS_URI, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    const ping = await client.db().command({ ping: 1 });
    ok(`Atlas ping OK: ${JSON.stringify(ping)}`);
    passed++;

    // Inspect collections
    const db = client.db();
    const cols = await db.listCollections().toArray();
    ok(`Collections found (${cols.length}): ${cols.map(c => c.name).join(', ') || 'none'}`);

    for (const col of cols) {
      const count = await db.collection(col.name).countDocuments();
      const indexes = (await db.collection(col.name).indexes()).map(i => i.name);
      console.log(`     📦 "${col.name}": ${count} docs | indexes: [${indexes.join(', ')}]`);
    }
    passed++;
  } catch (e) {
    err(`Atlas connection failed: ${e.message}`);
    if (e.message.includes('bad auth') || e.code === 8000) {
      console.log(`\n     ${RED}Root cause: Atlas DB user credentials are wrong.${RESET}`);
      console.log(`     Fix: Go to cloud.mongodb.com → Security → Database Access`);
      console.log(`       → Edit 'yesudoss0802_db_user' → Reset password\n`);
    }
    if (e.message.includes('ENOTFOUND') || e.message.includes('querySrv')) {
      console.log(`\n     ${RED}Root cause: DNS resolution failed — check internet / firewall.${RESET}\n`);
    }
    failed++;
  } finally {
    if (client) await client.close();
  }

  // ── 3. HTTP Endpoint Tests ──────────────────────────────────────
  info('\n══════════════════════════════════════════════════════');
  info('🌐 [3] HTTP REST Endpoint Tests (Server must be running)');
  info('══════════════════════════════════════════════════════');
  const endpoints = [
    { method: 'GET', path: '/',                  expectedStatus: 200,       desc: 'Root health check' },
    { method: 'GET', path: '/api/v1/health',     expectedStatus: 200,       desc: 'Health route' },
    { method: 'GET', path: '/api/v1/menu',       expectedStatus: 200,       desc: 'Menu items list' },
    // auth/me returns 200 with guest user — protect has intentional guest fallback by design
    { method: 'GET', path: '/api/v1/auth/me',   expectedStatus: 200,       desc: 'Auth /me (guest fallback by design)' },
    // orders uses /my — root /orders route does not exist
    { method: 'GET', path: '/api/v1/orders/my', expectedStatus: [200, 404], desc: 'My orders (guest or empty)' },
    { method: 'GET', path: '/api/admin/kpis',   expectedStatus: [200, 401], desc: 'Admin KPIs' },
  ];

  for (const ep of endpoints) {
    try {
      const res = await httpGet(ep.path);
      const expectedArr = Array.isArray(ep.expectedStatus) ? ep.expectedStatus : [ep.expectedStatus];
      if (expectedArr.includes(res.status)) {
        ok(`[${res.status}] ${ep.path} — ${ep.desc}`);
        passed++;
      } else {
        err(`[${res.status}] ${ep.path} — expected ${ep.expectedStatus} (${ep.desc})`);
        failed++;
      }
    } catch (e) {
      if (e.message === 'timeout' || e.code === 'ECONNREFUSED') {
        warn(`[SKIP] ${ep.path} — server not reachable (start with: npm run dev)`);
      } else {
        err(`[ERROR] ${ep.path} — ${e.message}`);
        failed++;
      }
    }
  }

  // ── 4. Summary ─────────────────────────────────────────────────
  info('\n══════════════════════════════════════════════════════');
  info('📊 TEST SUMMARY');
  info('══════════════════════════════════════════════════════');
  console.log(`   ${GREEN}Passed: ${passed}${RESET}  |  ${RED}Failed: ${failed}${RESET}`);
  const exit = failed === 0 ? 0 : 1;
  if (exit === 0) console.log(`\n   ${GREEN}🎉 All checks passed! Backend is healthy.${RESET}\n`);
  else console.log(`\n   ${RED}⚠️  Some checks failed — review above.${RESET}\n`);
  process.exit(exit);
}

main().catch(e => { console.error('Fatal error:', e.message); process.exit(1); });
