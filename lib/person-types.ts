// Shared types and helpers for CRM module (non-server-action)

// Input type (for forms and API — no id)
export interface ContactInput {
    type: 'phone' | 'email' | 'whatsapp'
    value: string
    label: string
    isPrimary: boolean
}

// Record type (from DB — has id)
export interface ContactRecord {
    id: string
    type: string
    value: string
    label: string | null
    isPrimary: boolean
}

// Keep backward compatibility
export type ContactItem = ContactInput

// Helper: extract primary contact of a given type from contacts array
export function getPrimaryContact(contacts: ContactRecord[] | ContactInput[] | null | undefined, type: 'phone' | 'email' | 'whatsapp'): string | null {
    if (!contacts || !Array.isArray(contacts)) return null
    const primary = contacts.find(c => c.type === type && c.isPrimary)
    if (primary) return primary.value
    const first = contacts.find(c => c.type === type)
    return first?.value || null
}

