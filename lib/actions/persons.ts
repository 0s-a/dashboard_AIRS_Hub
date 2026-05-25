'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAdmin } from '@/lib/auth-utils'
import type { ContactInput } from '@/lib/person-types'

const PATHS = '/persons'

// ─── Delete ─────────────────────────────────────────────────

export async function softDeletePerson(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAdmin()
            return prisma.person.update({
                where: { id },
                data: { isActive: false },
            })
        },
        PATHS,
        'تعذّر أرشفة الشخص'
    )
}

export async function hardDeletePerson(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAdmin()
            await prisma.person.delete({ where: { id } })
            return null
        },
        PATHS,
        'تعذّر الحذف النهائي للشخص'
    )
}

export async function togglePersonActive(id: string, isActive: boolean) {
    return safeActionWithRevalidation(
        async () => {
            await requireAdmin()
            return prisma.person.update({
                where: { id },
                data: { isActive },
            })
        },
        PATHS,
        'تعذّر تحديث حالة الشخص'
    )
}

// ─── Read ────────────────────────────────────────────────────

export async function getPersons(options?: {
    page?: number
    pageSize?: number
    search?: string
}) {
    const { page = 1, pageSize = 100, search } = options ?? {}

    return safeAction(async () => {
        const where: any = {
            isActive: true,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { contacts: { some: { value: { contains: search } } } },
                ],
            }),
        }
        const [persons, total] = await Promise.all([
            prisma.person.findMany({
                where,
                orderBy: { lastInteraction: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    name: true,
                    source: true,
                    contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
                    tags: { include: { tag: { select: { id: true, name: true } } } },
                    personCurrencies: { include: { currency: { select: { id: true, name: true, code: true, symbol: true } } } },
                    groupName: true,
                    groupNumber: true,
                    isActive: true,
                    lastInteraction: true,
                    createdAt: true,
                    updatedAt: true,
                    priceLabels: { include: { priceLabel: true } },
                },
            }),
            prisma.person.count({ where }),
        ])
        return { persons, total, page, pageSize }
    }, 'تعذّر جلب قائمة الأشخاص')
}

export async function getArchivedPersons() {
    return safeAction(
        () => prisma.person.findMany({
            where: { isActive: false },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                source: true,
                contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
                updatedAt: true,
                createdAt: true,
            },
        }),
        'تعذّر جلب الأشخاص المؤرشفين'
    )
}

export async function getPersonById(id: string) {
    return safeAction(
        () => prisma.person.findUniqueOrThrow({
            where: { id },
            include: {
                contacts: true,
                priceLabels: { include: { priceLabel: true } },
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: {
                        items: {
                            include: {
                                product: { select: { id: true, name: true, itemNumber: true } },
                                variant: { select: { id: true, name: true, hex: true } },
                                currency: { select: { id: true, symbol: true, code: true } },
                                priceLabel: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
        }),
        'تعذّر جلب بيانات الشخص'
    )
}

// --- Create Logic Removed ---
// ─── Update ──────────────────────────────────────────────────

export interface UpdatePersonData {
    name?: string
    source?: 'bot' | 'manual' | 'import' | 'api' | null
    contacts?: ContactInput[] | null
    tags?: string[] | null
    priceLabelIds?: string[] | null
    currencyIds?: string[] | null
    groupName?: string | null
    groupNumber?: string | null
}

export async function updatePerson(id: string, data: UpdatePersonData) {
    return safeActionWithRevalidation(
        async () => {
            try {
                return await prisma.person.update({
                    where: { id },
                    data: {
                        name: data.name,
                        source: data.source !== undefined ? data.source || null : undefined,
                        ...(data.contacts !== undefined && {
                            contacts: {
                                deleteMany: {},
                                create: (data.contacts || []).filter(c => c.value?.trim()).map(c => ({
                                    type: c.type,
                                    value: c.value.trim(),
                                    label: c.label || null,
                                    isPrimary: c.isPrimary || false,
                                })),
                            },
                        }),
                        ...(data.tags !== undefined && {
                            tags: {
                                deleteMany: {},
                                create: (data.tags || []).map(name => ({
                                    tag: {
                                        connectOrCreate: {
                                            where: { name },
                                            create: { name },
                                        },
                                    },
                                })),
                            },
                        }),
                        ...(data.currencyIds !== undefined && {
                            personCurrencies: {
                                deleteMany: {},
                                create: (data.currencyIds || []).map(currencyId => ({ currencyId })),
                            },
                        }),
                        groupName: data.groupName !== undefined ? data.groupName || null : undefined,
                        groupNumber: data.groupNumber !== undefined ? data.groupNumber || null : undefined,
                        lastInteraction: new Date(),
                        ...(data.priceLabelIds !== undefined && {
                            priceLabels: {
                                deleteMany: {},
                                create: data.priceLabelIds ? data.priceLabelIds.map(pid => ({
                                    priceLabel: { connect: { id: pid } },
                                })) : [],
                            },
                        }),
                    },
                })
            } catch (err: any) {
                if (err?.code === 'P2002') {
                    const target = err?.meta?.target
                    if (Array.isArray(target) && target.includes('value')) {
                        throw new Error('هذا الرقم/البريد مسجّل بالفعل في النظام لشخص أو مستخدم آخر')
                    }
                    throw new Error('بيانات مكررة — تأكد من عدم تكرار المعلومات')
                }
                throw err
            }
        },
        PATHS,
        'تعذّر تحديث بيانات الشخص'
    )
}
