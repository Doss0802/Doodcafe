#!/usr/bin/env node
/**
 * free-ports.js — Kill node.exe processes listening on target ports.
 *
 * Never uses `taskkill /IM node.exe`. Only kills by specific PID.
 * Never kills non-node processes. Skips its own PID.
 * Always exits 0 so `predev` never blocks npm run dev.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Resolve target ports ───────────────────────────────────────────────────
function readEnvPort() {
  try {
    const envPath = path.resolve(__dirname, '..', 'server', '.env');
    const raw = fs.readFileSync(envPath, 'utf8');
    const match = raw.match(/^PORT\s*=\s*(\d+)/m);
    return match ? parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

const BACKEND_PORT = readEnvPort() || 5000;
const FRONTEND_PORT = 5174;
const TARGET_PORTS = [BACKEND_PORT, FRONTEND_PORT];
const OWN_PID = process.pid;

// ── Platform helpers ────────────────────────────────────────────────────────
function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    return '';
  }
}

// ── Windows implementation ──────────────────────────────────────────────────
function getPidsOnPortWindows(port) {
  const out = run('netstat -ano');
  const pids = new Set();
  for (const line of out.split('\n')) {
    // Match lines with LISTENING state on the exact port
    const m = line.match(/\s+(?:0\.0\.0\.0|127\.0\.0\.1|::)[:.](\d+)\s+\S+\s+LISTENING\s+(\d+)/i);
    if (m && parseInt(m[1], 10) === port) {
      pids.add(parseInt(m[2], 10));
    }
  }
  return [...pids];
}

function isNodeProcessWindows(pid) {
  const out = run(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
  return out.toLowerCase().includes('node.exe');
}

function killPidWindows(pid) {
  run(`taskkill /PID ${pid} /T /F`);
}

// ── POSIX implementation ────────────────────────────────────────────────────
function getPidsOnPortPosix(port) {
  const out = run(`lsof -ti tcp:${port} -sTCP:LISTEN`);
  return out.split('\n').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

function isNodeProcessPosix(pid) {
  const out = run(`ps -p ${pid} -o comm=`);
  return /node/i.test(out);
}

function killPidPosix(pid) {
  run(`kill -9 ${pid}`);
}

// ── Main ───────────────────────────────────────────────────────────────────
const isWindows = process.platform === 'win32';
const getPids = isWindows ? getPidsOnPortWindows : getPidsOnPortPosix;
const isNode  = isWindows ? isNodeProcessWindows  : isNodeProcessPosix;
const killPid = isWindows ? killPidWindows        : killPidPosix;

let anythingKilled = false;

for (const port of TARGET_PORTS) {
  const pids = getPids(port);
  for (const pid of pids) {
    if (pid === OWN_PID) continue;
    if (!isNode(pid)) {
      console.log(`  Port ${port}: PID ${pid} is NOT node.exe — skipping.`);
      continue;
    }
    try {
      killPid(pid);
      console.log(`  Killed node PID ${pid} on port ${port}.`);
      anythingKilled = true;
    } catch (e) {
      console.warn(`  Could not kill PID ${pid} on port ${port}: ${e.message}`);
    }
  }
}

if (!anythingKilled) {
  console.log('  Ports already free (nothing to kill).');
}

process.exit(0);

