# Dev Server Quick Reference

## Start
```
npm run dev
```
Automatically cleans up ports 5000 and 5174 before starting.
Backend → http://localhost:5000 | Frontend → http://localhost:5174

## Stop
Press **Ctrl+C once** in the terminal that's running `npm run dev`.
Concurrently will stop both backend and frontend together.

## Force-clean stuck ports
```
npm run stop
```
Use this if ports are still occupied after a crash or accidental close.
Only kills `node.exe` processes on ports 5000 and 5174 — never your IDE's node.

## Health checks
- Backend: http://localhost:5000/api/v1/health
- Frontend: http://localhost:5174

## Why the old `npm run dev` kept failing
- `concurrently` was run without `-k`, so if the backend crashed/exited, Vite kept
  holding port 5174 indefinitely.
- The server's `uncaughtException` handler used to call `gracefulShutdown()` (exit 0)
  for `EADDRINUSE`, which looked like a clean exit and was never retried by npm.
- No `predev` hook existed to clean up before starting.

