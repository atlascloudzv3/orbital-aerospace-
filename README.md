# ORBITAL — Aerospace Advancement Forum

This repository implements a minimal forum with server-backed user accounts and posting.

What’s included
- Node/Express server (server.js) using SQLite (better-sqlite3) as a simple datastore
- Session-based authentication (express-session) with optional Redis session store (connect-redis)
- Front-end single-file UI (index.html) that talks to the server API (/api/*)
- Dockerfile + docker-compose.yml to run the app and Redis locally
- Kubernetes manifest (k8s/manifest.yaml) for a basic deployment
- Health & readiness endpoints (/healthz, /readyz)

Quick start — local (no Docker)
1. Copy .env.example to .env and set SESSION_SECRET (a long random string). Optionally set REDIS_URL.
2. Install dependencies:
   npm install
3. Start the server:
   npm start
4. Open http://localhost:3000

Quick start — Docker Compose (recommended)
1. Copy .env.example to .env and set SESSION_SECRET.
2. Build and run:
   docker compose up --build
3. Open http://localhost:3000

Notes
- The app writes the SQLite DB to ./data/data.db when run with docker-compose (persisted on host).
- The compose file includes healthchecks: the app must respond to /healthz and Redis must respond to PING.

Kubernetes (basic example)
- See k8s/manifest.yaml for a simple Deployment and Service setup. You must build and push a container image for the app before deploying (replace image placeholder in the manifest).

Deploy to Cloud Run / other providers
- Build an image and push to your registry (Docker Hub / GCR / ECR), then deploy to Cloud Run or your preferred host.
- Ensure you set environment variables (SESSION_SECRET, REDIS_URL) using the platform's secrets management.

Production considerations
- Use a strong SESSION_SECRET and secure storage for secrets.
- Run behind HTTPS and configure cookie.secure = true (server does this when NODE_ENV=production).
- Use a managed Redis or secure the Redis instance.
- Add input validation, CSP, rate limiting (basic rate limiter included), and monitoring.

Troubleshooting
- If Redis is not reachable, check REDIS_URL and that redis is running.
- If better-sqlite3 fails during npm install, ensure native build tools are installed on your OS (or use the prebuilt binaries on supported platforms).
