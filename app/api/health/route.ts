/**
 * GET /api/health
 * ─────────────────────────────────────────────────────────────
 * Lightweight health check — used by Docker healthcheck.
 * Runs on Edge Runtime: no DB connection, no Node.js overhead.
 * Returns 200 OK instantly.
 * ─────────────────────────────────────────────────────────────
 */

export const runtime = 'edge'

export function GET() {
    return Response.json(
        { status: 'ok', timestamp: new Date().toISOString() },
        { status: 200 },
    )
}
