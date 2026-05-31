import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCustomerSchema } from '@/lib/validations/customer'
import {
    validateApiKey,
    apiError,
    apiSuccess,
    CUSTOMER_INCLUDE,
    normalizePhonePatterns,
} from '@/lib/api-utils'

// POST /api/v1/bot/customers — Create or Update (Upsert) a customer
export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const rawBody = await req.json()
        
        // Zod Validation
        const validationResult = createCustomerSchema.safeParse(rawBody)
        if (!validationResult.success) {
            return apiError('البيانات غير صالحة', 400, {
                code: 'VALIDATION_ERROR',
                details: validationResult.error.format(),
            })
        }
        
        const body = validationResult.data

        // ── Fetch Defaults ──
        const [defaultCurrency, defaultPriceLabel] = await Promise.all([
            prisma.currency.findFirst({ where: { isDefault: true } }),
            prisma.priceLabel.findFirst({ where: { isDefault: true } })
        ])

        const finalCurrencyIds = body.currencyIds !== undefined 
            ? body.currencyIds 
            : (defaultCurrency ? [defaultCurrency.id] : [])

        const finalPriceLabelId = body.priceLabelId !== undefined 
            ? body.priceLabelId 
            : (defaultPriceLabel ? defaultPriceLabel.id : null)

        // ── Check for existing customer (single OR query) ──────────────────────

        // Both criteria are evaluated in one DB round-trip.

        const contactValues = (body.contacts || [])
            .map(c => c.value?.trim())
            .filter(Boolean) as string[]

        const allPatterns: string[] = contactValues.length > 0
            ? Array.from(new Set(contactValues.flatMap(normalizePhonePatterns)))
            : []

        const orClauses: object[] = []
        if (allPatterns.length > 0) {
            orClauses.push({ contacts: { some: { value: { in: allPatterns } } } })
        }
        const existingCustomer = orClauses.length > 0
            ? await prisma.customer.findFirst({ where: { OR: orClauses }, include: CUSTOMER_INCLUDE })
            : null

        // ── UPDATE existing customer ──
        if (existingCustomer) {
            const existingContactValues = new Set(
                (existingCustomer.contacts || []).map((c: any) => c.value)
            )
            const newContacts = (body.contacts || [])
                .filter(c => c.value?.trim() && !existingContactValues.has(c.value.trim()))

            // Check if any new contacts already exist globally (for another customer/user)
            if (newContacts.length > 0) {
                const newValues = newContacts.map(c => c.value.trim())
                const conflicting = await prisma.contact.findFirst({
                    where: {
                        value: { in: newValues },
                        customerId: { not: existingCustomer.id },
                    },
                    select: { value: true, type: true },
                })
                if (conflicting) {
                    return apiError(
                        `الرقم/البريد "${conflicting.value}" مسجّل بالفعل في النظام لعميل أو مستخدم آخر`,
                        409,
                        { code: 'DUPLICATE_CONTACT', details: `${conflicting.type}:${conflicting.value}` }
                    )
                }
            }

            const existingCurrencyIds = (existingCustomer.customerCurrencies || []).map((pc: any) => pc.currencyId)
            const hasExistingPriceLabel = !!(existingCustomer as any).priceLabelId

            const shouldUpdateCurrencies = body.currencyIds !== undefined || (existingCurrencyIds.length === 0 && finalCurrencyIds.length > 0)
            const shouldUpdatePriceLabel = body.priceLabelId !== undefined || (!hasExistingPriceLabel && finalPriceLabelId)

            const updatedCustomer = await prisma.customer.update({
                where: { id: existingCustomer.id },
                data: {
                    // Name write-once policy: preserve existing name if already set.
                    // The bot cannot overwrite a name entered via the dashboard.
                    // To update the name explicitly, use PUT /customers/[id].
                    name: existingCustomer.name ?? body.name?.trim() ?? existingCustomer.name,
                    source: body.source || existingCustomer.source || null,
                    lastInteraction: new Date(),
                    contacts: newContacts.length > 0 ? {
                        create: newContacts.map(c => ({
                            type: c.type,
                            value: c.value.trim(),
                            label: c.label || null,
                            isPrimary: c.isPrimary || false,
                        }))
                    } : undefined,
                    customerCurrencies: shouldUpdateCurrencies ? {
                        deleteMany: {},
                        create: finalCurrencyIds.map((id: string) => ({ currencyId: id }))
                    } : undefined,
                    ...(shouldUpdatePriceLabel && {
                        priceLabelId: finalPriceLabelId || null,
                    }),
                },
                include: CUSTOMER_INCLUDE,
            })

            return apiSuccess(updatedCustomer, 200, { action: 'updated' })
        }

        // ── CREATE new customer ──
        const customer = await prisma.customer.create({
            data: {
                name: body.name.trim(),
                source: body.source || null,
                contacts: body.contacts && body.contacts.length > 0 ? {
                    create: body.contacts
                        .filter(c => c.value?.trim())
                        .map(c => ({
                            type: c.type,
                            value: c.value.trim(),
                            label: c.label || null,
                            isPrimary: c.isPrimary || false,
                        }))
                } : undefined,
                tags: body.tags?.length ? {
                    create: body.tags.map((name: string) => ({
                        tag: {
                            connectOrCreate: {
                                where: { name },
                                create: { name },
                            },
                        },
                    })),
                } : undefined,
                customerCurrencies: finalCurrencyIds.length > 0 ? {
                    create: finalCurrencyIds.map((currencyId: string) => ({ currencyId }))
                } : undefined,
                lastInteraction: new Date(),
                priceLabelId: finalPriceLabelId || null,
            },
            include: CUSTOMER_INCLUDE,
        })

        return apiSuccess(customer, 201, { action: 'created' })
    } catch (error: any) {
        console.error('API Error [POST /customers]:', error)
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
            return apiError('تنسيق بيانات JSON غير صالح', 400, {
                code: 'INVALID_JSON',
                details: error.message
            })
        }
        if (error?.code === 'P2002') {
            const target = error?.meta?.target
            if (target?.includes('value')) {
                return apiError('رقم الهاتف أو البريد مسجل بالفعل لعميل آخر', 409, {
                    code: 'DUPLICATE_CONTACT',
                    details: `Duplicate contact: ${target}`,
                })
            }
            return apiError('بيانات مكررة', 409, {
                code: 'DUPLICATE_FIELD',
                details: `Duplicate field: ${target}`,
            })
        }
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
