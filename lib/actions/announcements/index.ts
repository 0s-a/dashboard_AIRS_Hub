/**
 * lib/actions/announcements/index.ts
 *
 * Public entry point for the Announcement system.
 *
 * All consumers import from '@/lib/actions/announcements' as before —
 * this barrel file makes the internal split transparent.
 */

export * from './announce'
export * from './execute'

// Types & constants available for consumers that need them
export type { AnnouncementInput, AnnouncementStatus } from './types'
export {
    BATCH_SIZE,
    DEFAULT_SAMPLE_SIZE,
    DEFAULT_PAGE_LIMIT,
    ANNOUNCEMENT_STATUSES,
} from './types'
