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
}) {
    const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL
    if (!webhookUrl) return

    const customerPhone = getPrimaryPhone(group.customer.contacts)
    const supervisorPhones = group.supervisors
        .map(s => getPrimaryPhone(s.supervisor.contacts))
        .filter(Boolean) as string[]

    const params = new URLSearchParams({
        groupId:      group.id,
        groupName:    group.name,
        groupNumber:  group.groupNumber ?? '',
        customerName: group.customer.name ?? '',
        customerPhone:    customerPhone ?? '',
        supervisorPhones: supervisorPhones.join(','),
        allMemberPhones:  [...new Set([customerPhone, ...supervisorPhones].filter(Boolean))].join(','),
    })

    // fire-and-forget — فشل الـ webhook لا يؤثر على العملية الرئيسية
    fetch(`${webhookUrl}?${params.toString()}`, { method: 'GET' })
        .catch(err => console.warn('[WhatsappGroup] Webhook failed:', err?.message))
}

// ── Read ─────────────────────────────────────────────────────────────

export async function getWhatsappGroups(options?: {
    activeOnly?: boolean
    search?: string
}) {
    const { activeOnly = false, search } = options ?? {}

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
            }),
            prisma.whatsappGroup.count({ where }),
        ])

        return { groups, total }
    }, 'تعذّر جلب المجموعات')
}

export async function getWhatsappGroupById(id: string) {
    return safeAction(
        () => prisma.whatsappGroup.findUniqueOrThrow({
            where: { id },
            include: GROUP_INCLUDE,
        }),
        'تعذّر جلب بيانات المجموعة'
    )
}

// ── Create ───────────────────────────────────────────────────────────

export async function createWhatsappGroup(data: WhatsappGroupFormData) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()

            const group = await prisma.whatsappGroup.create({
                data: {
                    name:        data.name.trim(),
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

            return prisma.whatsappGroup.update({
                where: { id },
                data: {
                    ...(data.name !== undefined      && { name: data.name.trim() }),
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

        const webhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL
        if (!webhookUrl) throw new Error('N8N_WHATSAPP_WEBHOOK_URL غير مضبوط في متغيرات البيئة')

        const group = await prisma.whatsappGroup.findUniqueOrThrow({
            where: { id },
            include: GROUP_INCLUDE,
        })

        const customerPhone = getPrimaryPhone(group.customer.contacts)
        const supervisorPhones = group.supervisors
            .map(s => getPrimaryPhone(s.supervisor.contacts))
            .filter(Boolean) as string[]

        const allPhones = [...new Set([customerPhone, ...supervisorPhones].filter(Boolean))]

        const params = new URLSearchParams({
            groupId:         group.id,
            groupName:       group.name,
            groupNumber:     group.groupNumber ?? '',
            customerName:    group.customer.name ?? '',
            customerPhone:   customerPhone ?? '',
            supervisorPhones: supervisorPhones.join(','),
            allMemberPhones:  allPhones.join(','),
            resent:          'true',
        })

        // ننتظر الرد لنُبلّغ المستخدم بنتيجة الإرسال
        const response = await fetch(`${webhookUrl}?${params.toString()}`, {
            method: 'GET',
            signal: AbortSignal.timeout(10_000),
        })

        if (!response.ok) {
            throw new Error(`فشل الإرسال — رمز الاستجابة: ${response.status}`)
        }

        return { sent: true, memberCount: allPhones.length }
    }, 'تعذّر إعادة إرسال الطلب إلى n8n')
}

