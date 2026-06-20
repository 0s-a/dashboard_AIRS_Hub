'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'
import type { WhatsappGroupFormData } from '@/lib/types/whatsapp-groups'

const PATHS = ['/whatsapp-groups']

// ── Prisma include shape ─────────────────────────────────────────────

const GROUP_INCLUDE = {
    customer: {
        select: {
            id: true,
            name: true,
            contacts: {
                select: { id: true, type: true, value: true, label: true, isPrimary: true },
                orderBy: { isPrimary: 'desc' as const },
            },
        },
    },
    supervisors: {
        include: {
            supervisor: {
                select: {
                    id: true,
                    name: true,
                    contacts: {
                        select: { id: true, type: true, value: true, label: true, isPrimary: true },
                        orderBy: { isPrimary: 'desc' as const },
                    },
                },
            },
        },
    },
} as const

// ── Webhook helper — fire-and-forget ────────────────────────────────

function getPrimaryPhone(contacts: { type: string; value: string }[]) {
    return contacts.find(c => c.type === 'phone' || c.type === 'whatsapp')?.value ?? null
}

async function notifyN8n(group: Awaited<ReturnType<typeof prisma.whatsappGroup.findUniqueOrThrow>> & {
    customer: { name: string | null; contacts: { type: string; value: string }[] }
    supervisors: { supervisor: { name: string; contacts: { type: string; value: string }[] } }[]
}, isManualResend: boolean = false) {
    const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL
    if (!webhookUrl) return

    const customerPhone = getPrimaryPhone(group.customer.contacts)
    const supervisorPhones = group.supervisors
        .map(s => getPrimaryPhone(s.supervisor.contacts))
        .filter(Boolean) as string[]

    const suffix = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_SUFFIX || " | بيوتفي"

    const params = new URLSearchParams({
        groupId:      group.id,
        groupCode:    group.code,
        groupName:    group.name,
        groupSuffix:  suffix,
        groupNumber:  group.groupNumber ?? '',
        customerName: group.customer.name ?? '',
        customerPhone:    customerPhone ?? '',
        supervisorPhones: supervisorPhones.join(','),
        allMemberPhones:  [...new Set([customerPhone, ...supervisorPhones].filter(Boolean))].join(','),
        ...(isManualResend && { resent: 'true' })
    })

    const finalUrl = `${webhookUrl}?${params.toString()}`
    console.log('[WhatsappGroup] Sending to n8n:', finalUrl)
    
    if (isManualResend) {
        // في حال الإرسال اليدوي ننتظر النتيجة لنتمكن من عرض خطأ إن لزم
        const response = await fetch(finalUrl, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(10_000) })
        if (!response.ok) throw new Error(`Webhook failed: ${response.status}`)
    } else {
        // fire-and-forget عند الإنشاء
        fetch(finalUrl, { method: 'GET', cache: 'no-store' })
            .catch(err => console.warn('[WhatsappGroup] Webhook failed:', err?.message))
    }
}

// ── Read ─────────────────────────────────────────────────────────────

export async function getWhatsappGroups(options?: {
    activeOnly?: boolean
    search?: string
    page?: number
    pageSize?: number
}) {
    const { activeOnly = false, search, page = 1, pageSize = 100 } = options ?? {}

    return safeAction(async () => {
        const where: any = {
            ...(activeOnly && { isActive: true }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { groupNumber: { contains: search } },
                    { customer: { name: { contains: search, mode: 'insensitive' } } },
                ],
            }),
        }

        const [groups, total] = await Promise.all([
            prisma.whatsappGroup.findMany({
                where,
                include: GROUP_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.whatsappGroup.count({ where }),
        ])

        const suffix = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_SUFFIX || " | بيوتفي"
        const mappedGroups = groups.map(g => ({
            ...g,
            name: `${g.customer?.name || 'بدون عميل'}${suffix}`
        }))

        return { groups: mappedGroups, total, page, pageSize }
    }, 'تعذّر جلب المجموعات')
}

export async function getWhatsappGroupStats() {
    return safeAction(async () => {
        const [total, active, inactive] = await Promise.all([
            prisma.whatsappGroup.count(),
            prisma.whatsappGroup.count({ where: { isActive: true } }),
            prisma.whatsappGroup.count({ where: { isActive: false } }),
        ])
        return { total, active, inactive }
    }, 'تعذّر جلب إحصائيات المجموعات')
}

export async function getWhatsappGroupById(id: string) {
    return safeAction(
        async () => {
            const group = await prisma.whatsappGroup.findUniqueOrThrow({
                where: { id },
                include: GROUP_INCLUDE,
            })
            const suffix = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_SUFFIX || " | بيوتفي"
            return {
                ...group,
                name: `${group.customer?.name || 'بدون عميل'}${suffix}`
            }
        },
        'تعذّر جلب بيانات المجموعة'
    )
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
async function generateUniqueGroupCode(): Promise<string> {
    for (let i = 0; i < 10; i++) {
        let code = ''
        for (let j = 0; j < 3; j++) {
            code += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length))
        }
        const existing = await prisma.whatsappGroup.findUnique({ where: { code } })
        if (!existing) return code
    }
    throw new Error('تعذّر توليد كود مميز للمجموعة')
}

// ── Create ───────────────────────────────────────────────────────────

export async function createWhatsappGroup(data: WhatsappGroupFormData) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()

            const customer = await prisma.customer.findUnique({ 
                where: { id: data.customerId }, 
                select: { name: true } 
            })
            if (!customer) throw new Error('العميل غير موجود')

            const suffix = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_SUFFIX || " | بيوتفي"
            const groupName = `${customer.name}${suffix}`
            
            const groupCode = await generateUniqueGroupCode()

            const group = await prisma.whatsappGroup.create({
                data: {
                    code:        groupCode,
                    name:        groupName,
                    groupNumber: data.groupNumber?.trim() || null,
                    notes:       data.notes?.trim() || null,
                    isActive:    data.isActive ?? true,
                    customerId:  data.customerId,
                    supervisors: data.supervisorIds.length > 0 ? {
                        create: data.supervisorIds.map(supervisorId => ({ supervisorId })),
                    } : undefined,
                },
                include: GROUP_INCLUDE,
            })

            // إرسال webhook لـ n8n — fire-and-forget
            notifyN8n(group as any)

            return group
        },
        PATHS,
        'تعذّر إنشاء المجموعة'
    )
}

// ── Update ───────────────────────────────────────────────────────────

export async function updateWhatsappGroup(id: string, data: Partial<WhatsappGroupFormData>) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()

            let groupName = data.name?.trim()
            const currentGroup = await prisma.whatsappGroup.findUnique({ where: { id }, select: { customerId: true } })
            if (currentGroup) {
                const targetCustomerId = data.customerId || currentGroup.customerId
                const customer = await prisma.customer.findUnique({ where: { id: targetCustomerId }, select: { name: true } })
                if (customer) {
                    const suffix = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_SUFFIX || " | بيوتفي"
                    groupName = `${customer.name}${suffix}`
                }
            }

            return prisma.whatsappGroup.update({
                where: { id },
                data: {
                    ...(groupName !== undefined      && { name: groupName }),
                    ...(data.groupNumber !== undefined && { groupNumber: data.groupNumber?.trim() || null }),
                    ...(data.notes !== undefined     && { notes: data.notes?.trim() || null }),
                    ...(data.isActive !== undefined  && { isActive: data.isActive }),
                    ...(data.customerId !== undefined && { customerId: data.customerId }),
                    // إعادة بناء المشرفين إن أُرسلوا
                    ...(data.supervisorIds !== undefined && {
                        supervisors: {
                            deleteMany: {},
                            create: data.supervisorIds.map(supervisorId => ({ supervisorId })),
                        },
                    }),
                },
                include: GROUP_INCLUDE,
            })
        },
        [...PATHS, `/whatsapp-groups/${id}`],
        'تعذّر تحديث المجموعة'
    )
}

// ── Delete ───────────────────────────────────────────────────────────

export async function deleteWhatsappGroup(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            await prisma.whatsappGroup.delete({ where: { id } })
            return null
        },
        PATHS,
        'تعذّر حذف المجموعة'
    )
}

// ── Toggle Active ────────────────────────────────────────────────────

export async function toggleWhatsappGroupActive(id: string, isActive: boolean) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            return prisma.whatsappGroup.update({
                where: { id },
                data: { isActive },
                select: { id: true, name: true, isActive: true },
            })
        },
        [...PATHS, `/whatsapp-groups/${id}`],
        'تعذّر تغيير حالة المجموعة'
    )
}

// ── Supervisor Management ────────────────────────────────────────────

export async function addSupervisorToGroup(groupId: string, supervisorId: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            return prisma.whatsappGroupSupervisor.create({
                data: { groupId, supervisorId },
            })
        },
        [...PATHS, `/whatsapp-groups/${groupId}`],
        'تعذّر إضافة المشرف'
    )
}

export async function removeSupervisorFromGroup(groupId: string, supervisorId: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            await prisma.whatsappGroupSupervisor.delete({
                where: { groupId_supervisorId: { groupId, supervisorId } },
            })
            return null
        },
        [...PATHS, `/whatsapp-groups/${groupId}`],
        'تعذّر إزالة المشرف'
    )
}

// ── Resend Webhook ───────────────────────────────────────────────────
// يُعيد إرسال بيانات المجموعة إلى n8n — مفيد عند تغيير أرقام الأعضاء

export async function resendWhatsappGroupWebhook(id: string) {
    return safeAction(async () => {
        await requireAuth()

        const group = await prisma.whatsappGroup.findUniqueOrThrow({
            where: { id },
            include: GROUP_INCLUDE,
        })

        // نستخدم نفس الدالة الموحدة
        await notifyN8n(group as any, true) // نمرر true كدليل أنه طلب يدوي إذا لزم

        return { sent: true, memberCount: group.supervisors.length + 1 }
    }, 'تعذّر إعادة إرسال الطلب إلى n8n')
}

