// ── WhatsApp Groups — Types ─────────────────────────────────────────
// Shared TypeScript types for the WhatsApp Groups module

export type GroupContact = {
    id: string
    type: string
    value: string
    label: string | null
    isPrimary: boolean
}

export type GroupCustomer = {
    id: string
    name: string | null
    contacts: GroupContact[]
}

export type GroupSupervisor = {
    supervisorId: string
    supervisor: {
        id: string
        name: string
        contacts: GroupContact[]
    }
}

export type WhatsappGroupRow = {
    id: string
    name: string
    groupNumber: string | null
    notes: string | null
    isActive: boolean
    createdAt: Date | string
    updatedAt: Date | string
    customerId: string
    customer: GroupCustomer
    supervisors: GroupSupervisor[]
}

export type WhatsappGroupFormData = {
    name: string
    groupNumber?: string | null
    notes?: string | null
    isActive?: boolean
    customerId: string
    supervisorIds: string[]
}
