// Shared types and helpers for CRM module (non-server-action)

export interface ContactItem {
    type: 'phone' | 'email' | 'whatsapp'
    value: string
    label: string
    isPrimary: boolean
}

// Helper: extract primary contact of a given type from contacts array
export function getPrimaryContact(contacts: ContactItem[] | null | undefined, type: 'phone' | 'email' | 'whatsapp'): string | null {
    if (!contacts || !Array.isArray(contacts)) return null
    const primary = contacts.find(c => c.type === type && c.isPrimary)
    if (primary) return primary.value
    const first = contacts.find(c => c.type === type)
    return first?.value || null
}
