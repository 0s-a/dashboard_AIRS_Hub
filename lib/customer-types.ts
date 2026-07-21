// Shared types and helpers for CRM module (non-server-action)

// Input type — derived from central contact config
export type { ContactInput } from '@/lib/config/contact.config'

// Re-export useful helpers from contact config
export {
    getContactTypeLabel,
    getContactTypeIcon,
    getContactTypeConfig,
    normalizeContactValue,
    CONTACT_TYPE_KEYS,
    CONTACT_TYPE_OPTIONS,
    PHONE_CONTACT_TYPES,
} from '@/lib/config/contact.config'

export { canonicalizePhone } from '@/lib/phone-utils'

// Record type (from DB — has id)
export interface ContactRecord {
    id: string
    type: string
    value: string
    label: string | null
    isPrimary: boolean
}
