import { prisma } from '@/lib/prisma'
import {
    CUSTOMER_INCLUDE,
    BOT_CUSTOMER_WHERE,
    normalizePhonePatterns,
    validatePhoneInput,
} from '@/lib/api-utils'
import {
    getContactTypeConfig,
    normalizeContactValue,
} from '@/lib/config/contact.config'
import { CustomerServiceError } from './errors'
import type {
    CreateCustomerInput,
    UpdateCustomerInput,
} from './schemas'

type NormalizedContact = {
    type: string
    value: string
    label: string | null
    isPrimary: boolean
}

function normalizeContactsForWrite(
    contacts: Array<{
        type: string
        value?: string | null
        label?: string | null
        isPrimary?: boolean
    }> | null | undefined
): NormalizedContact[] {
    if (!contacts?.length) return []
    const out: NormalizedContact[] = []
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

/** Prisma OR clauses to find customers by phone patterns and/or exact emails */
function contactLookupOr(normalized: NormalizedContact[]) {
    const phonePatterns = Array.from(
        new Set(
            normalized
                .filter(c => getContactTypeConfig(c.type)?.isPhoneType)
                .flatMap(c => normalizePhonePatterns(c.value))
        )
    )
    const emailValues = normalized
        .filter(c => c.type === 'email')
        .map(c => c.value)

    const or: Array<{ contacts: { some: { value: { in: string[] } } } }> = []
    if (phonePatterns.length > 0) {
        or.push({ contacts: { some: { value: { in: phonePatterns } } } })
    }
    if (emailValues.length > 0) {
        or.push({ contacts: { some: { value: { in: emailValues } } } })
    }
    return or
}

export async function upsertCustomer(body: CreateCustomerInput) {
    const [defaultCurrency, defaultPriceLabel] = await Promise.all([
        prisma.currency.findFirst({ where: { isDefault: true } }),
        prisma.priceLabel.findFirst({ where: { isDefault: true } }),
    ])

    const finalCurrencyIds =
        body.currencyIds !== undefined
            ? body.currencyIds
            : defaultCurrency
              ? [defaultCurrency.id]
              : []

    const finalPriceLabelId =
        body.priceLabelId !== undefined
            ? body.priceLabelId
            : defaultPriceLabel
              ? defaultPriceLabel.id
              : null

    const normalizedContacts = normalizeContactsForWrite(body.contacts)
    const lookupOr = contactLookupOr(normalizedContacts)

    if (lookupOr.length > 0) {
        const supervisorHit = await prisma.customer.findFirst({
            where: {
                type: 'supervisor',
                OR: lookupOr,
            },
            select: { id: true, name: true },
        })
        if (supervisorHit) {
            throw new CustomerServiceError(
                'هذا الرقم مسجّل كمشرف وليس كعميل',
                409,
                'SUPERVISOR_CONTACT',
                { id: supervisorHit.id, name: supervisorHit.name }
            )
        }
    }

    const existingCustomer =
        lookupOr.length > 0
            ? await prisma.customer.findFirst({
                  where: {
                      ...BOT_CUSTOMER_WHERE,
                      OR: lookupOr,
                  },
                  include: CUSTOMER_INCLUDE,
              })
            : null

    if (existingCustomer) {
        const existingContactValues = new Set(
            (existingCustomer.contacts || []).map(c => c.value)
        )
        const newContacts = normalizedContacts.filter(
            c => !existingContactValues.has(c.value)
        )

        if (newContacts.length > 0) {
            const newValues = newContacts.map(c => c.value)
            const conflicting = await prisma.contact.findFirst({
                where: {
                    value: { in: newValues },
                    customerId: { not: existingCustomer.id },
                },
                select: {
                    value: true,
                    type: true,
                    customer: { select: { type: true } },
                },
            })
            if (conflicting) {
                if (conflicting.customer?.type === 'supervisor') {
                    throw new CustomerServiceError(
                        `الرقم/البريد "${conflicting.value}" مسجّل كمشرف`,
                        409,
                        'SUPERVISOR_CONTACT',
                        `${conflicting.type}:${conflicting.value}`
                    )
                }
                throw new CustomerServiceError(
                    `الرقم/البريد "${conflicting.value}" مسجّل بالفعل لشخص آخر في النظام`,
                    409,
                    'DUPLICATE_CONTACT',
                    `${conflicting.type}:${conflicting.value}`
                )
            }
        }

        const existingCurrencyIds = (existingCustomer.customerCurrencies || []).map(
            pc => pc.currencyId
        )
        const hasExistingPriceLabel = !!existingCustomer.priceLabelId

        const shouldUpdateCurrencies =
            body.currencyIds !== undefined ||
            (existingCurrencyIds.length === 0 && finalCurrencyIds.length > 0)
        const shouldUpdatePriceLabel =
            body.priceLabelId !== undefined ||
            (!hasExistingPriceLabel && finalPriceLabelId)

        const updatedCustomer = await prisma.customer.update({
            where: { id: existingCustomer.id },
            data: {
                name: existingCustomer.name ?? body.name?.trim() ?? existingCustomer.name,
                source: body.source || existingCustomer.source || null,
                lastInteraction: new Date(),
                contacts:
                    newContacts.length > 0
                        ? {
                              create: newContacts.map(c => ({
                                  type: c.type,
                                  value: c.value,
                                  label: c.label,
                                  isPrimary: c.isPrimary,
                              })),
                          }
                        : undefined,
                customerCurrencies: shouldUpdateCurrencies
                    ? {
                          deleteMany: {},
                          create: finalCurrencyIds.map((id: string) => ({
                              currencyId: id,
                          })),
                      }
                    : undefined,
                ...(shouldUpdatePriceLabel && {
                    priceLabelId: finalPriceLabelId || null,
                }),
            },
            include: CUSTOMER_INCLUDE,
        })

        return { customer: updatedCustomer, action: 'updated' as const }
    }

    const customer = await prisma.customer.create({
        data: {
            name: body.name.trim(),
            type: 'customer',
            source: body.source || null,
            contacts:
                normalizedContacts.length > 0
                    ? {
                          create: normalizedContacts.map(c => ({
                              type: c.type,
                              value: c.value,
                              label: c.label,
                              isPrimary: c.isPrimary,
                          })),
                      }
                    : undefined,
            tags: body.tags?.length
                ? {
                      create: body.tags.map((name: string) => ({
                          tag: {
                              connectOrCreate: {
                                  where: { name },
                                  create: { name },
                              },
                          },
                      })),
                  }
                : undefined,
            customerCurrencies:
                finalCurrencyIds.length > 0
                    ? {
                          create: finalCurrencyIds.map((currencyId: string) => ({
                              currencyId,
                          })),
                      }
                    : undefined,
            lastInteraction: new Date(),
            priceLabelId: finalPriceLabelId || null,
        },
        include: CUSTOMER_INCLUDE,
    })

    return { customer, action: 'created' as const }
}

export async function getCustomerById(id: string) {
    const customer = await prisma.customer.findFirst({
        where: { id, type: 'customer' },
        include: CUSTOMER_INCLUDE,
    })
    if (!customer) {
        throw new CustomerServiceError('العميل غير موجود', 404, 'NOT_FOUND')
    }
    return customer
}

export async function updateCustomer(id: string, body: UpdateCustomerInput) {
    const existing = await prisma.customer.findFirst({
        where: { id, type: 'customer' },
    })
    if (!existing) {
        throw new CustomerServiceError('العميل غير موجود', 404, 'NOT_FOUND')
    }

    return prisma.customer.update({
        where: { id },
        data: {
            ...(body.name !== undefined && { name: body.name }),
            ...(body.source !== undefined && { source: body.source || null }),
            ...(body.contacts !== undefined && {
                contacts: {
                    deleteMany: {},
                    create: normalizeContactsForWrite(body.contacts).map(c => ({
                        type: c.type,
                        value: c.value,
                        label: c.label,
                        isPrimary: c.isPrimary,
                    })),
                },
            }),
            ...(body.tags !== undefined && {
                tags: {
                    deleteMany: {},
                    create: (body.tags || []).map((name: string) => ({
                        tag: {
                            connectOrCreate: {
                                where: { name },
                                create: { name },
                            },
                        },
                    })),
                },
            }),
            ...(body.currencyIds !== undefined && {
                customerCurrencies: {
                    deleteMany: {},
                    create: (body.currencyIds || []).map((currencyId: string) => ({
                        currencyId,
                    })),
                },
            }),
            ...(body.priceLabelId !== undefined && {
                priceLabelId: body.priceLabelId || null,
            }),
            lastInteraction: new Date(),
        },
        include: CUSTOMER_INCLUDE,
    })
}

export async function deleteCustomer(id: string) {
    const existing = await prisma.customer.findFirst({
        where: { id, type: 'customer' },
    })
    if (!existing) {
        throw new CustomerServiceError('العميل غير موجود', 404, 'NOT_FOUND')
    }

    const ordersCount = await prisma.order.count({ where: { customerId: id } })
    if (ordersCount > 0) {
        throw new CustomerServiceError(
            `لا يمكن حذف العميل — لديه ${ordersCount} طلب مرتبط`,
            409,
            'HAS_ORDERS',
            { ordersCount }
        )
    }

    await prisma.customer.delete({ where: { id } })
    return { message: 'تم حذف العميل بنجاح' }
}

export async function searchCustomerByPhone(rawPhone: string) {
    const raw = rawPhone.trim()
    if (!raw) {
        throw new CustomerServiceError(
            'يجب تمرير رقم الهاتف عبر المعامل phone',
            400,
            'MISSING_PHONE'
        )
    }

    const cleaned = validatePhoneInput(raw)
    if (!cleaned) {
        throw new CustomerServiceError(
            'رقم الهاتف غير صالح — يجب أن يحتوي على أرقام فقط ولا يقل عن 7 خانات',
            400,
            'INVALID_PHONE'
        )
    }

    const patterns = normalizePhonePatterns(raw)

    const customer = await prisma.customer.findFirst({
        where: {
            type: 'customer',
            contacts: {
                some: {
                    value: { in: patterns },
                    type: { in: ['phone', 'whatsapp'] },
                },
            },
        },
        select: {
            id: true,
            name: true,
            type: true,
            isActive: true,
            source: true,
            lastInteraction: true,
            createdAt: true,
            contacts: {
                select: {
                    id: true,
                    type: true,
                    value: true,
                    label: true,
                    isPrimary: true,
                },
                orderBy: { isPrimary: 'desc' },
            },
            priceLabel: {
                select: { id: true, name: true, customerType: true },
            },
            customerCurrencies: {
                include: {
                    currency: {
                        select: { id: true, name: true, code: true, symbol: true },
                    },
                },
            },
            tags: {
                include: {
                    tag: { select: { id: true, name: true } },
                },
            },
            _count: {
                select: { orders: true },
            },
            orders: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                    createdAt: true,
                    status: true,
                },
            },
        },
    })

    if (!customer) {
        return {
            found: false as const,
            data: null,
            meta: { phone: raw, patterns },
        }
    }

    return {
        found: true as const,
        data: {
            id: customer.id,
            name: customer.name,
            isActive: customer.isActive,
            source: customer.source,
            lastInteraction: customer.lastInteraction,
            createdAt: customer.createdAt,
            contacts: customer.contacts,
            priceLabel: customer.priceLabel,
            currencies: customer.customerCurrencies.map(pc => pc.currency),
            tags: customer.tags.map(t => t.tag),
            stats: {
                totalOrders: customer._count.orders,
                lastOrderAt: customer.orders[0]?.createdAt ?? null,
                lastOrderStatus: customer.orders[0]?.status ?? null,
            },
        },
        meta: { phone: raw, patterns },
    }
}

export async function getCustomerPricing(id: string) {
    const customer = await prisma.customer.findFirst({
        where: { id, type: 'customer' },
        select: {
            id: true,
            name: true,
            customerCurrencies: {
                include: {
                    currency: {
                        select: {
                            id: true,
                            itemNumber: true,
                            name: true,
                            code: true,
                            symbol: true,
                            isDefault: true,
                        },
                    },
                },
            },
            priceLabel: {
                select: {
                    id: true,
                    itemNumber: true,
                    name: true,
                    customerType: true,
                    notes: true,
                },
            },
        },
    })

    if (!customer) {
        throw new CustomerServiceError('العميل غير موجود', 404, 'NOT_FOUND')
    }

    return {
        customerId: customer.id,
        customerName: customer.name,
        currencies: customer.customerCurrencies.map(pc => pc.currency),
        priceLabel: customer.priceLabel,
    }
}

export async function setCustomerStatus(id: string, isActive: boolean) {
    const existing = await prisma.customer.findFirst({
        where: { id, type: 'customer' },
        select: { id: true, isActive: true, name: true },
    })

    if (!existing) {
        throw new CustomerServiceError('العميل غير موجود', 404, 'NOT_FOUND')
    }

    if (existing.isActive === isActive) {
        return {
            customer: existing,
            message: isActive ? 'العميل مفعل مسبقاً' : 'العميل معطل مسبقاً',
        }
    }

    const customer = await prisma.customer.update({
        where: { id },
        data: { isActive },
        select: { id: true, name: true, isActive: true },
    })

    return {
        customer,
        message: isActive ? 'تم تفعيل العميل بنجاح' : 'تم تعطيل العميل بنجاح',
    }
}
