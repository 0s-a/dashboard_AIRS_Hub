'use server'

import { prisma } from './inventory/_shared'
import { uniqueProductSlug } from '@/lib/utils/slug'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { BRAND_CODE_CONFIG } from '@/lib/config/product-number.config'

const ATTR_CODES = ['color', 'size', 'capacity', 'volume', 'weight'] as const
type AttrCode = (typeof ATTR_CODES)[number]

const FAMILY_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,31}$/

export type ImportRow = {
    _id: string
    name: string
    itemNumber: string
    familyCode: string
    brandCode: string
    color?: string
    size?: string
    capacity?: string
    volume?: string
    weight?: string
}

export type ValidatedRow = ImportRow & {
    isValid: boolean
    errors: string[]
    resolvedFamilyId?: string
    resolvedBrandId?: string
    attributeValues?: { attributeId: string; value: string }[]
}

export async function validateImportData(rows: ImportRow[]): Promise<ValidatedRow[]> {
    await requireAuth()
    if (!rows || rows.length === 0) return []

    const itemNumbers = rows.map(r => r.itemNumber).filter(Boolean)
    const familyCodes = Array.from(
        new Set(rows.map(r => r.familyCode?.trim().toUpperCase()).filter(Boolean))
    )
    const brandCodes = Array.from(
        new Set(rows.map(r => r.brandCode?.trim().toUpperCase()).filter(Boolean))
    )

    const [existingFamilies, existingBrands, attributes, existingByItemNumber] =
        await Promise.all([
            prisma.productFamily.findMany({
                where: { code: { in: familyCodes } },
                select: { id: true, code: true },
            }),
            prisma.brand.findMany({
                where: { code: { in: brandCodes } },
                select: { id: true, code: true },
            }),
            prisma.productAttribute.findMany({
                where: { code: { in: [...ATTR_CODES] } },
                select: { id: true, code: true },
            }),
            itemNumbers.length > 0
                ? prisma.product.findMany({
                      where: { itemNumber: { in: itemNumbers } },
                      select: { itemNumber: true },
                  })
                : [],
        ])

    const familyMap = new Map(existingFamilies.map(f => [f.code, f.id]))
    const brandMap = new Map(existingBrands.map(b => [b.code, b.id]))
    const attrByCode = new Map(attributes.map(a => [a.code, a.id]))

    const existingItemNumbersSet = new Set(
        existingByItemNumber.map(p => p.itemNumber).filter(Boolean) as string[]
    )

    const batchItemNumbers = new Set<string>()

    return rows.map(row => {
        const errors: string[] = []
        let isValid = true

        if (!row.name?.trim()) {
            errors.push('الاسم مطلوب')
            isValid = false
        }

        if (!row.itemNumber?.trim()) {
            errors.push('رقم الصنف مطلوب')
            isValid = false
        } else if (existingItemNumbersSet.has(row.itemNumber.trim())) {
            errors.push('رقم الصنف موجود مسبقاً في النظام')
            isValid = false
        } else if (batchItemNumbers.has(row.itemNumber.trim())) {
            errors.push('رقم الصنف مكرر في هذا الملف')
            isValid = false
        } else {
            batchItemNumbers.add(row.itemNumber.trim())
        }

        let resolvedFamilyId: string | undefined
        let resolvedBrandId: string | undefined

        const familyCode = row.familyCode?.trim().toUpperCase()
        if (!familyCode) {
            errors.push('كود المنتج الرئيسي مطلوب')
            isValid = false
        } else if (!FAMILY_CODE_PATTERN.test(familyCode)) {
            errors.push(
                'كود المنتج الرئيسي: حروف/أرقام إنجليزية، ويمكن شرطة أو شرطة سفلية (حتى 32 خانة)'
            )
            isValid = false
        } else if (!familyMap.has(familyCode)) {
            errors.push('كود المنتج الرئيسي غير موجود')
            isValid = false
        } else {
            resolvedFamilyId = familyMap.get(familyCode)
        }

        const brandCode = row.brandCode?.trim().toUpperCase()
        if (!brandCode) {
            errors.push('كود البراند مطلوب')
            isValid = false
        } else if (!BRAND_CODE_CONFIG.pattern.test(brandCode)) {
            errors.push(
                `كود البراند يجب أن يكون ${BRAND_CODE_CONFIG.length} خانات (أحرف أو أرقام)`
            )
            isValid = false
        } else if (!brandMap.has(brandCode)) {
            errors.push('كود البراند غير موجود')
            isValid = false
        } else {
            resolvedBrandId = brandMap.get(brandCode)
        }

        const attributeValues: { attributeId: string; value: string }[] = []
        for (const code of ATTR_CODES) {
            const raw = row[code as AttrCode]?.trim()
            if (!raw) continue
            const attributeId = attrByCode.get(code)
            if (!attributeId) {
                errors.push(`صفة «${code}» غير موجودة في الكتالوج — شغّل db:seed`)
                isValid = false
                continue
            }
            attributeValues.push({ attributeId, value: raw })
        }

        return {
            ...row,
            isValid,
            errors,
            resolvedFamilyId,
            resolvedBrandId,
            attributeValues,
        }
    })
}

export async function importProductsBatch(rows: ValidatedRow[]) {
    await requireAuth()
    const validRows = rows.filter(r => r.isValid)
    if (validRows.length === 0) {
        return { success: false, message: 'لا توجد بيانات صحيحة لاستيرادها' }
    }

    let successCount = 0
    let errorCount = 0

    for (const row of validRows) {
        try {
            await prisma.$transaction(async tx => {
                const slug = await uniqueProductSlug(row.name)

                const created = await tx.product.create({
                    data: {
                        name: row.name.trim(),
                        slug,
                        itemNumber: row.itemNumber.trim(),
                        familyId: row.resolvedFamilyId!,
                        brandId: row.resolvedBrandId!,
                    },
                })

                if (row.attributeValues?.length) {
                    await tx.productAttributeValue.createMany({
                        data: row.attributeValues.map(a => ({
                            productId: created.id,
                            attributeId: a.attributeId,
                            value: a.value,
                        })),
                    })
                }
            })
            successCount++
        } catch (error) {
            console.error('Error importing row', row, error)
            errorCount++
        }
    }

    revalidatePath('/products')
    revalidatePath('/products')

    return {
        success: successCount > 0,
        message: `تم استيراد ${successCount} منتج${errorCount > 0 ? `، وفشل ${errorCount}` : ''}`,
    }
}
