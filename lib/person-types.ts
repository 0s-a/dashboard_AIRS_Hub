// Shared types and helpers for CRM module (non-server-action)

// Input type — derived from Zod schema to stay in sync automatically
export type { ContactInput } from '@/lib/validations/person'

// Record type (from DB — has id)
export interface ContactRecord {
    id: string
    type: string
    value: string
    label: string | null
    isPrimary: boolean
}

// Helper: extract primary contact of a given type from contacts array
export function getPrimaryContact(
    contacts: ContactRecord[] | { type: string; value: string; isPrimary: boolean }[] | null | undefined,
    type: 'phone' | 'email' | 'whatsapp'
): string | null {
    if (!contacts || !Array.isArray(contacts)) return null
    const primary = contacts.find(c => c.type === type && c.isPrimary)
    if (primary) return primary.value
    const first = contacts.find(c => c.type === type)
    return first?.value || null
}

