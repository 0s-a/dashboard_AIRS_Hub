/**
 * lib/actions/announcements/types.ts
 *
 * Shared types and constants for the Announcement Server Actions layer.
 * Import from here — never duplicate across sibling files.
 */

// ─── Route ────────────────────────────────────────────────────────────────────

/** Next.js revalidation path for all announcement actions. */
export const ANNOUNCEMENTS_PATH = '/announcements'

// ─── Pagination & Batch ───────────────────────────────────────────────────────

/** Customers processed per DB+RabbitMQ batch inside executeAnnouncementToQueue. */
export const BATCH_SIZE = 200

/** Default number of rendered previews returned by dryRunAnnouncement. */
export const DEFAULT_SAMPLE_SIZE = 3

/** Default page size for getAnnouncementMessages. */
export const DEFAULT_PAGE_LIMIT = 50

/** Max customers/products shown in getAudienceSnapshot. */
export const SNAPSHOT_SAMPLE_SIZE = 20

// ─── Status ───────────────────────────────────────────────────────────────────

export const ANNOUNCEMENT_STATUSES = [
    'pending',
    'queueing',
    'queued',
    'sent',
    'failed',
    'cancelled',
] as const

export type AnnouncementStatus = typeof ANNOUNCEMENT_STATUSES[number]

/** Statuses that mean the announcement is already being / has been processed. */
export const ALREADY_PROCESSED_STATUSES: AnnouncementStatus[] = [
    'sent',
    'queued',
    'queueing',
]

// ─── Input DTOs ───────────────────────────────────────────────────────────────

import type { CustomerFilters, ProductFilters } from '@/lib/types/announcements'

/** Data required to create or update an Announcement record. */
export interface AnnouncementInput {
    title:                string
    description?:         string
    scheduledAt:          string
    customerFilters?:       CustomerFilters
    productFilters?:      ProductFilters
    templateId?:          string | null
    delayBetweenSeconds?: number
    sendWindowStart?:     string | null
    sendWindowEnd?:       string | null
}
