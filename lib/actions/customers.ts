'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'
import type { ContactInput } from '@/lib/customer-types'
import { normalizeContactValue } from '@/lib/config/contact.config'
import type { PersonType } from '@prisma/client'

function contactsForWrite(contacts: ContactInput[] | null | undefined) {
    if (!contacts?.length) return []
    const out: Array<{
        type: string
        value: string
        label: string | null
        isPrimary: boolean
    }> = []
    for (const c of contacts) {
        const value = normalizeContactValue(c.type, c.value ?? '')
        if (!value) continue
        out.push({
            type: c.type,
            value,
            label: c.label || null,
            isPrimary: c.isPrimary || false,
        })
    }
    return out
}

const PATHS = '/customers'

// ─── Delete ─────────────────────────────────────────────────

export async function hardDeleteCustomer(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            await prisma.customer.delete({ where: { id } })
            return null
        },
        PATHS,
        'تعذّر الحذف النهائي للعميل'
    )
}

export async function toggleCustomerActive(id: string, isActive: boolean) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            return prisma.customer.update({
                where: { id },
                data: { isActive },
            })
        },
        PATHS,
        'تعذّر تحديث حالة العميل'
    )
}

// ─── Read ────────────────────────────────────────────────────

export async function getCustomers(options?: {
    page?: number
    pageSize?: number
    search?: string
    type?: PersonType
}) {
    const { page = 1, pageSize = 100, search, type } = options ?? {}

    return safeAction(async () => {
        const where: any = {
            ...(type && { type }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { contacts: { some: { value: { contains: search } } } },
                ],
            }),
        }
        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                orderBy: { lastInteraction: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    name: true,
                    type: true,
                    notes: true,
                    source: true,
                    contacts: { select: { id: true, type: true, value: true, label: true, isPrimary: true } },
                    tags: { include: { tag: { select: { id: true, name: true } } } },
                    customerCurrencies: { include: { currency: { select: { id: true, name: true, code: true, symbol: true } } } },
                    isActive: true,
                    lastInteraction: true,
                    createdAt: true,
                    updatedAt: true,
                    priceLabelId: true,
                    priceLabel: { select: { id: true, name: true, customerType: true } },
                },
            }),
            prisma.customer.count({ where }),
        ])
        return { customers, total, page, pageSize }
    }, 'تعذّر جلب قائمة العملاء')
}

export async function getCustomerById(id: string) {
    return safeAction(
        () => prisma.customer.findUniqueOrThrow({
            where: { id },
            include: {
                contacts: true,
                priceLabel: { select: { id: true, name: true, customerType: true } },
                customerCurrencies: {
                    include: { currency: { select: { id: true, name: true, code: true, symbol: true } } },
                },
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: {
                        items: {
                            select: {
                                quantity: true,
                                unitPrice: true,
                                currency: { select: { symbol: true } },
                                priceLabel: { select: { name: true } },
                                product: {
                                    select: {
                                        id: true,
                                        name: true,
                                        itemNumber: true,
                                        productAttributes: {
                                            include: {
                                                attribute: { select: { code: true, name: true } },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),
        'تعذّر جلب بيانات العميل'
    )
}

export async function getCustomerStats() {
    return safeAction(async () => {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const base = { type: 'customer' as const }
        const [total, newInWeek, disabled] = await Promise.all([
            prisma.customer.count({ where: base }),
            prisma.customer.count({ where: { ...base, createdAt: { gte: sevenDaysAgo } } }),
            prisma.customer.count({ where: { ...base, isActive: false } }),
        ])
        return { total, newInWeek, disabled }
    }, 'تعذّر جلب إحصائيات العملاء')
}

// ─── Create ──────────────────────────────────────────────────

export interface CreateCustomerData {
    name: string
    type?: PersonType
    notes?: string | null
    source?: 'bot' | 'manual' | 'import' | 'api' | null
    contacts?: ContactInput[] | null
    tags?: string[] | null
    priceLabelId?: string | null
    currencyIds?: string[] | null
}

export async function createCustomer(data: CreateCustomerData) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            try {
                const personType = data.type ?? 'customer'
                return await prisma.customer.create({
                    data: {
                        name: data.name.trim(),
                        type: personType,
                        notes: data.notes?.trim() || null,
                        source: data.source || null,
                        contacts: (() => {
                            const rows = contactsForWrite(data.contacts)
                            return rows.length > 0 ? { create: rows } : undefined
                        })(),
                        tags: data.tags?.length ? {
                            create: data.tags.map(name => ({
                                tag: {
                                    connectOrCreate: {
                                        where: { name },
                                        create: { name },
                                    },
                                },
                            })),
                        } : undefined,
                        customerCurrencies: data.currencyIds && data.currencyIds.length > 0 ? {
                            create: data.currencyIds.map(currencyId => ({ currencyId }))
                        } : undefined,
                        priceLabelId: personType === 'supervisor' ? null : (data.priceLabelId || null),
                        lastInteraction: new Date(),
                    },
                })
            } catch (err: any) {
                if (err?.code === 'P2002') {
                    const constraint = err?.meta?.target as string | string[] | undefined
                    const name = Array.isArray(constraint) ? constraint.join(',') : constraint
                    if (name?.includes('value')) {
                        throw new Error('هذا الرقم/البريد مسجّل بالفعل لشخص آخر في النظام')
                    }
                    if (name?.includes('customer_type')) {
                        throw new Error('لا يمكن إضافة أكثر من وسيلة اتصال واحدة من نفس النوع')
                    }
                    throw new Error('بيانات مكررة — تأكد من عدم تكرار المعلومات')
                }
                throw err
            }
        },
        PATHS,
        'تعذّر إنشاء العميل'
    )
}

// ─── Update ──────────────────────────────────────────────────

export interface UpdateCustomerData {
    name?: string
    type?: PersonType
    notes?: string | null
    source?: 'bot' | 'manual' | 'import' | 'api' | null
    contacts?: ContactInput[] | null
    tags?: string[] | null
    priceLabelId?: string | null
    currencyIds?: string[] | null
}

export async function updateCustomer(id: string, data: UpdateCustomerData) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            try {
                const clearPricing = data.type === 'supervisor'
                return await prisma.customer.update({
                    where: { id },
                    data: {
                        name: data.name,
                        ...(data.type !== undefined && { type: data.type }),
                        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
                        source: data.source !== undefined ? data.source || null : undefined,
                        ...(data.contacts !== undefined && {
                            contacts: {
                                deleteMany: {},
                                create: contactsForWrite(data.contacts),
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
                            customerCurrencies: {
                                deleteMany: {},
                                create: clearPricing ? [] : (data.currencyIds || []).map(currencyId => ({ currencyId })),
                            },
                        }),
                        ...(clearPricing
                            ? { priceLabelId: null }
                            : data.priceLabelId !== undefined
                                ? { priceLabelId: data.priceLabelId || null }
                                : {}),
                        lastInteraction: new Date(),
                    },
                })
            } catch (err: any) {
                if (err?.code === 'P2002') {
                    const constraint = err?.meta?.target as string | string[] | undefined
                    const name = Array.isArray(constraint) ? constraint.join(',') : constraint
                    if (name?.includes('value')) {
                        throw new Error('هذا الرقم/البريد مسجّل بالفعل لشخص آخر في النظام')
                    }
                    if (name?.includes('customer_type')) {
                        throw new Error('لا يمكن إضافة أكثر من وسيلة اتصال واحدة من نفس النوع')
                    }
                    throw new Error('بيانات مكررة — تأكد من عدم تكرار المعلومات')
                }
                throw err
            }
        },
        PATHS,
        'تعذّر تحديث بيانات العميل'
    )
}
