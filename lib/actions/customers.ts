'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'
import type { ContactInput } from '@/lib/customer-types'

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
}) {
    const { page = 1, pageSize = 100, search } = options ?? {}

    return safeAction(async () => {
        const where: any = {
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
        'تعذّر جلب بيانات العميل'
    )
}

// ─── Create ──────────────────────────────────────────────────

export interface CreateCustomerData {
    name: string
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
                return await prisma.customer.create({
                    data: {
                        name: data.name.trim(),
                        source: data.source || null,
                        contacts: data.contacts && data.contacts.length > 0 ? {
                            create: data.contacts
                                .filter(c => c.value?.trim())
                                .map(c => ({
                                    type: c.type,
                                    value: c.value.trim(),
                                    label: c.label || null,
                                    isPrimary: c.isPrimary || false,
                                }))
                        } : undefined,
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
                        priceLabelId: data.priceLabelId || null,
                        lastInteraction: new Date(),
                    },
                })
            } catch (err: any) {
                if (err?.code === 'P2002') {
                    const constraint = err?.meta?.target as string | string[] | undefined
                    const name = Array.isArray(constraint) ? constraint.join(',') : constraint
                    if (name?.includes('value')) {
                        throw new Error('هذا الرقم/البريد مسجّل بالفعل في النظام لعميل أو مشرف آخر')
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
    source?: 'bot' | 'manual' | 'import' | 'api' | null
    contacts?: ContactInput[] | null
    tags?: string[] | null
    priceLabelId?: string | null
    currencyIds?: string[] | null
}

export async function updateCustomer(id: string, data: UpdateCustomerData) {
    return safeActionWithRevalidation(
        async () => {
            try {
                return await prisma.customer.update({
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
                            customerCurrencies: {
                                deleteMany: {},
                                create: (data.currencyIds || []).map(currencyId => ({ currencyId })),
                            },
                        }),
                        ...(data.priceLabelId !== undefined && {
                            priceLabelId: data.priceLabelId || null,
                        }),
                        lastInteraction: new Date(),
                    },
                })
            } catch (err: any) {
                if (err?.code === 'P2002') {
                    const constraint = err?.meta?.target as string | string[] | undefined
                    const name = Array.isArray(constraint) ? constraint.join(',') : constraint
                    if (name?.includes('value')) {
                        throw new Error('هذا الرقم/البريد مسجّل بالفعل في النظام لعميل أو مشرف آخر')
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
