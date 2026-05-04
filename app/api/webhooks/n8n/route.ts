/**
 * app/api/webhooks/n8n/route.ts
 *
 * Receives per-person delivery callbacks from n8n.
 * Each call = result of ONE person's message delivery attempt.
 *
 * ── Source of Truth Architecture ──────────────────────────────────────────────
 * The Backend owns the message content. AnnouncementMessage records are created
 * BEFORE RabbitMQ publish (status='pending'). n8n only needs to report the
 * outcome — it sends messageId + status, nothing more.
 *
 * Callback payload from n8n:
 * {
 *   messageId:   string    ← AnnouncementMessage.id (the Source of Truth link)
 *   status:      "success" | "failed"
 *   providerId?: string    ← WhatsApp message ID (e.g. from Evolution API)
 *   errorReason?: string   ← Failure reason if status = "failed"
 * }
 *
 * Security modes (controlled by .env):
 *   - N8N_WEBHOOK_SECRET set  → Bearer token / HMAC-SHA256 verification
 *   - N8N_WEBHOOK_SECRET unset → No verification (dev/test mode)
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { prisma }         from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ─── Auth Verification ────────────────────────────────────────────────────────

function verifyAuth(rawBody: string, signatureHeader: string, authHeader: string, apiKeyHeader: string): boolean {
    const secret = process.env.N8N_WEBHOOK_SECRET

    if (!secret) {
        console.warn('[n8n Webhook] ⚠ No N8N_WEBHOOK_SECRET set — running in UNSECURED mode')
        return true
    }

    // 1. Bearer token
    if (authHeader) {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim()
        if (token === secret) return true
    }

    // 2. Custom API key header
    if (apiKeyHeader && apiKeyHeader === secret) return true

    // 3. HMAC-SHA256 signature (legacy)
    if (signatureHeader) {
        const expected  = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
        try {
            const sigBuffer = Buffer.from(signatureHeader.padEnd(expected.length))
            const expBuffer = Buffer.from(expected)
            if (sigBuffer.length === expBuffer.length && timingSafeEqual(sigBuffer, expBuffer)) return true
        } catch { return false }
    }

    console.warn('[n8n Webhook] Missing or invalid authentication headers')
    return false
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    const rawBody      = await req.text()
    const signature    = req.headers.get('x-n8n-signature') ?? ''
    const authHeader   = req.headers.get('authorization') ?? ''
    const apiKeyHeader = req.headers.get('x-n8n-api-key') ?? ''

    if (!verifyAuth(rawBody, signature, authHeader, apiKeyHeader)) {
        console.warn('[n8n Webhook] Invalid auth — request rejected')
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Parse body ─────────────────────────────────────────────────────────────
    let body: {
        // ── New Source of Truth fields ────────────────────────────────────────
        messageId?:   string           // AnnouncementMessage.id (preferred)
        status?:      'success' | 'failed'
        providerId?:  string | null    // WhatsApp message ID from provider
        errorReason?: string | null

        // ── Legacy fields (kept for backward compatibility during transition) ─
        announcementId?: string
        messageIndex?:   number
        totalMessages?:  number
        personId?:       string
        personName?:     string | null
        contact?:        string | null
        success?:        boolean
        error?:          string | null
    }

    try {
        body = JSON.parse(rawBody)
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // ── Route: New messageId-based callback ─────────────────────────────────
    if (body.messageId && body.status !== undefined) {
        return handleNewCallback(body as {
            messageId:    string
            status:       'success' | 'failed'
            providerId?:  string | null
            errorReason?: string | null
        })
    }

    return Response.json({ error: 'Missing required fields: messageId + status' }, { status: 400 })
}

// ─── New Callback Handler (Source of Truth) ────────────────────────────────────

async function handleNewCallback(body: {
    messageId:    string
    status:       'success' | 'failed'
    providerId?:  string | null
    errorReason?: string | null
}) {
    const { messageId, status, providerId = null, errorReason = null } = body
    const success = status === 'success'

    // ① Idempotency Guard — fetch current status before any update
    //    If n8n retries the same messageId, we detect it here and return 200
    //    without touching counters, so no double-counting ever happens.
    const existing = await prisma.announcementMessage.findUnique({
        where:  { id: messageId },
        select: {
            announcementId: true,
            personId:       true,
            personName:     true,
            whatsappNumber: true,
            messageIndex:   true,
            status:         true,
        },
    })

    if (!existing) {
        return Response.json({ error: `AnnouncementMessage not found: ${messageId}` }, { status: 404 })
    }

    // Already processed — return 200 silently (idempotent)
    if (existing.status !== 'pending') {
        console.warn(
            `[n8n Webhook] Duplicate callback ignored: ` +
            `messageId=${messageId} already="${existing.status}"`
        )
        return Response.json({ ok: true, alreadyProcessed: true, currentStatus: existing.status })
    }

    // Safe to update (confirmed status='pending')
    let msg: { announcementId: string; personId: string | null; personName: string | null; whatsappNumber: string | null; messageIndex: number }
    try {
        // WHERE includes status:'pending' as double-safety against race conditions
        msg = await prisma.announcementMessage.update({
            where: { id: messageId, status: 'pending' },
            data: {
                status:      success ? 'sent' : 'failed',
                providerId:  providerId ?? null,
                errorReason: errorReason ?? null,
                sentAt:      new Date(),
            },
            select: {
                announcementId: true,
                personId:       true,
                personName:     true,
                whatsappNumber: true,
                messageIndex:   true,
            },
        })
    } catch {
        // Race condition: another concurrent request updated it first — skip safely
        console.warn(`[n8n Webhook] Race condition on messageId=${messageId} — skipping`)
        return Response.json({ ok: true, alreadyProcessed: true })
    }

    const { announcementId } = msg

    // ② Check completion: no more pending messages → mark as sent
    const pendingCount = await prisma.announcementMessage.count({
        where: { announcementId, status: 'pending' },
    })

    if (pendingCount === 0) {
        await prisma.announcement.update({
            where: { id: announcementId },
            data:  { status: 'sent', sentAt: new Date() },
        })
        revalidatePath('/announcements')
    }

    revalidatePath(`/announcements/${announcementId}`)

    console.log(
        `[n8n Webhook] ${announcementId} | msgId=${messageId} | ` +
        `status=${status} | pending=${pendingCount}`
    )

    return Response.json({
        ok:           true,
        pendingCount,
        isComplete:   pendingCount === 0,
    })
}
