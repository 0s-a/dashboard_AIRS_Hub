import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPersonSchema } from '@/lib/validations/person'
import {
    validateApiKey,
    apiError,
    apiSuccess,
    PERSON_INCLUDE,
    normalizePhonePatterns,
} from '@/lib/api-utils'

// POST /api/v1/bot/persons — Create or Update (Upsert) a person
export async function POST(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const rawBody = await req.json()
        
        // Zod Validation
        const validationResult = createPersonSchema.safeParse(rawBody)
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

        const finalPriceLabelIds = body.priceLabelIds !== undefined 
            ? body.priceLabelIds 
            : (defaultPriceLabel ? [defaultPriceLabel.id] : [])

        // ── Check for existing person (single OR query) ──────────────────────
        // Priority: contact match takes precedence over groupNumber match.
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
        if (body.groupNumber?.trim()) {
            orClauses.push({ groupNumber: body.groupNumber.trim() })
        }

        const existingPerson = orClauses.length > 0
            ? await prisma.person.findFirst({ where: { OR: orClauses }, include: PERSON_INCLUDE })
            : null

        // ── UPDATE existing person ──
        if (existingPerson) {
            const existingContactValues = new Set(
                (existingPerson.contacts || []).map((c: any) => c.value)
            )
            const newContacts = (body.contacts || [])
                .filter(c => c.value?.trim() && !existingContactValues.has(c.value.trim()))

            // Check if any new contacts already exist globally (for another person/user)
            if (newContacts.length > 0) {
                const newValues = newContacts.map(c => c.value.trim())
                const conflicting = await prisma.contact.findFirst({
                    where: {
                        value: { in: newValues },
                        personId: { not: existingPerson.id },
                    },
                    select: { value: true, type: true },
                })
                if (conflicting) {
                    return apiError(
                        `الرقم/البريد "${conflicting.value}" مسجّل بالفعل في النظام لشخص أو مستخدم آخر`,
                        409,
                        { code: 'DUPLICATE_CONTACT', details: `${conflicting.type}:${conflicting.value}` }
                    )
                }
            }

            const existingCurrencyIds = (existingPerson.personCurrencies || []).map((pc: any) => pc.currencyId)
            const existingPriceLabelIds = (existingPerson.priceLabels || []).map((pl: any) => pl.priceLabelId)

            const shouldUpdateCurrencies = body.currencyIds !== undefined || (existingCurrencyIds.length === 0 && finalCurrencyIds.length > 0)
            const shouldUpdatePriceLabels = body.priceLabelIds !== undefined || (existingPriceLabelIds.length === 0 && finalPriceLabelIds.length > 0)

            const updatedPerson = await prisma.person.update({
                where: { id: existingPerson.id },
                data: {
                    // Name write-once policy: preserve existing name if already set.
                    // The bot cannot overwrite a name entered via the dashboard.
                    // To update the name explicitly, use PUT /persons/[id].
                    name: existingPerson.name ?? body.name?.trim() ?? existingPerson.name,
                    source: body.source || existingPerson.source || null,
                    groupName: body.groupName || existingPerson.groupName,
                    groupNumber: body.groupNumber || existingPerson.groupNumber,
                    lastInteraction: new Date(),
                    contacts: newContacts.length > 0 ? {
                        create: newContacts.map(c => ({
                            type: c.type,
                            value: c.value.trim(),
                            label: c.label || null,
                            isPrimary: c.isPrimary || false,
                        }))
                    } : undefined,
                    personCurrencies: shouldUpdateCurrencies ? {
                        deleteMany: {},
                        create: finalCurrencyIds.map((id: string) => ({ currencyId: id }))
                    } : undefined,
                    priceLabels: shouldUpdatePriceLabels ? {
                        deleteMany: {},
                        create: finalPriceLabelIds.map((id: string) => ({
                            priceLabel: { connect: { id } }
                        }))
                    } : undefined,
                },
                include: PERSON_INCLUDE,
            })

            return apiSuccess(updatedPerson, 200, { action: 'updated' })
        }

        // ── CREATE new person ──
        const person = await prisma.person.create({
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
                personCurrencies: finalCurrencyIds.length > 0 ? {
                    create: finalCurrencyIds.map((currencyId: string) => ({ currencyId }))
                } : undefined,
                groupName: body.groupName || null,
                groupNumber: body.groupNumber || null,
                lastInteraction: new Date(),
                priceLabels: finalPriceLabelIds.length > 0 ? {
                    create: finalPriceLabelIds.map((id: string) => ({
                        priceLabel: { connect: { id } }
                    }))
                } : undefined,
            },
            include: PERSON_INCLUDE,
        })

        return apiSuccess(person, 201, { action: 'created' })
    } catch (error: any) {
        console.error('API Error [POST /persons]:', error)
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
            return apiError('تنسيق بيانات JSON غير صالح', 400, {
                code: 'INVALID_JSON',
                details: error.message
            })
        }
        if (error?.code === 'P2002') {
            const target = error?.meta?.target
            if (target?.includes('value')) {
                return apiError('رقم الهاتف أو البريد مسجل بالفعل لشخص آخر', 409, {
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
