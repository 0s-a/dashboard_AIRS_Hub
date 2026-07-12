'use server'

import { prisma, validateProductNumber, normalizeProductNumber, buildSkuCode, getDefaultColorId } from './inventory/_shared'
import { uniqueProductSlug } from '@/lib/utils/slug'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'

export type ImportRow = {
    _id: string
    name: string
    productNumber: string
    itemNumber: string
    categoryCode: string
    brandCode: string
}

export type ValidatedRow = ImportRow & {
    isValid: boolean
    errors: string[]
    resolvedCategoryId?: string
    resolvedBrandId?: string
}

export async function validateImportData(rows: ImportRow[]): Promise<ValidatedRow[]> {
    await requireAuth()
    if (!rows || rows.length === 0) return []

    const itemNumbers = rows.map(r => r.itemNumber).filter(Boolean)
    const productNumbers = rows.map(r => normalizeProductNumber(r.productNumber || '')).filter(Boolean)
    const categoryCodes = Array.from(new Set(rows.map(r => r.categoryCode).filter(Boolean)))
    const brandCodes = Array.from(new Set(rows.map(r => r.brandCode).filter(Boolean)))

    const [existingCategories, existingBrands, existingSkcsByItemNumber, existingProductsByNumber] = await Promise.all([
        prisma.category.findMany({
            where: { code: { in: categoryCodes } },
            select: { id: true, code: true }
        }),
        prisma.brand.findMany({
            where: { code: { in: brandCodes } },
            select: { id: true, code: true }
        }),
        itemNumbers.length > 0 ? prisma.sKC.findMany({
            where: { itemNumber: { in: itemNumbers } },
            select: { itemNumber: true }
        }) : [],
        productNumbers.length > 0 ? prisma.product.findMany({
            where: { productNumber: { in: productNumbers } },
            select: { productNumber: true }
        }) : [],
    ])

    const categoryMap = new Map(existingCategories.map(c => [c.code, c.id]))
    const brandMap = new Map(existingBrands.map(b => [b.code, b.id]))

    const nameBrandConditions = rows
        .map(r => ({ name: r.name, brandId: brandMap.get(r.brandCode) }))
        .filter(c => c.name && c.brandId) as { name: string, brandId: string }[]

    const existingProductsByNameBrand = nameBrandConditions.length > 0
        ? await prisma.product.findMany({
            where: { OR: nameBrandConditions },
            select: { name: true, brandId: true }
        })
        : []

    const existingItemNumbersSet = new Set(
        existingSkcsByItemNumber.map(s => s.itemNumber).filter(Boolean) as string[]
    )
    const existingProductNumbersSet = new Set(
        existingProductsByNumber.map(p => p.productNumber.toUpperCase())
    )
    const existingNameBrandSet = new Set(existingProductsByNameBrand.map(p => `${p.name}::${p.brandId}`))

    const batchItemNumbers = new Set<string>()
    const batchProductNumbers = new Set<string>()
    const batchNameBrands = new Set<string>()

    const validatedRows: ValidatedRow[] = rows.map(row => {
        const errors: string[] = []
        let isValid = true

        if (!row.name || row.name.trim() === '') {
            errors.push('الاسم مطلوب')
            isValid = false
        }

        const pnResult = validateProductNumber(row.productNumber || '')
        if (!pnResult.ok) {
            errors.push(pnResult.error)
            isValid = false
        } else if (existingProductNumbersSet.has(pnResult.value)) {
            errors.push('رقم المنتج موجود مسبقاً في النظام')
            isValid = false
        } else if (batchProductNumbers.has(pnResult.value)) {
            errors.push('رقم المنتج مكرر في هذا الملف')
            isValid = false
        } else {
            batchProductNumbers.add(pnResult.value)
        }

        if (!row.itemNumber || row.itemNumber.trim() === '') {
            errors.push('رقم الصنف مطلوب')
            isValid = false
        } else {
            if (existingItemNumbersSet.has(row.itemNumber)) {
                errors.push('رقم الصنف موجود مسبقاً في النظام')
                isValid = false
            } else if (batchItemNumbers.has(row.itemNumber)) {
                errors.push('رقم الصنف مكرر في هذا الملف')
                isValid = false
            } else {
                batchItemNumbers.add(row.itemNumber)
            }
        }

        let resolvedCategoryId: string | undefined
        let resolvedBrandId: string | undefined

        if (!row.categoryCode) {
            errors.push('كود التصنيف مطلوب')
            isValid = false
        } else if (row.categoryCode.length !== 2) {
            errors.push('كود التصنيف يجب أن يكون حرفين')
            isValid = false
        } else if (!categoryMap.has(row.categoryCode)) {
            errors.push('كود التصنيف غير موجود')
            isValid = false
        } else {
            resolvedCategoryId = categoryMap.get(row.categoryCode)
        }

        if (!row.brandCode) {
            errors.push('كود الماركة مطلوب')
            isValid = false
        } else if (row.brandCode.length !== 1) {
            errors.push('كود الماركة يجب أن يكون حرفاً أو رقماً واحداً')
            isValid = false
        } else if (!brandMap.has(row.brandCode)) {
            errors.push('كود الماركة غير موجود')
            isValid = false
        } else {
            resolvedBrandId = brandMap.get(row.brandCode)
        }

        if (row.name && resolvedBrandId) {
            const nameBrandKey = `${row.name}::${resolvedBrandId}`
            if (existingNameBrandSet.has(nameBrandKey)) {
                errors.push(`المنتج بالاسم (${row.name}) والماركة (${row.brandCode}) موجود مسبقاً في النظام`)
                isValid = false
            } else if (batchNameBrands.has(nameBrandKey)) {
                errors.push(`الاسم (${row.name}) مع الماركة (${row.brandCode}) مكرر في هذا الملف`)
                isValid = false
            } else {
                batchNameBrands.add(nameBrandKey)
            }
        }

        return {
            ...row,
            productNumber: pnResult.ok ? pnResult.value : normalizeProductNumber(row.productNumber || ''),
            isValid,
            errors,
            resolvedCategoryId,
            resolvedBrandId
        }
    })

    return validatedRows
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
            await prisma.$transaction(async (tx) => {
                const pnResult = validateProductNumber(row.productNumber)
                if (!pnResult.ok) throw new Error(pnResult.error)

                const slug = await uniqueProductSlug(row.name)

                const product = await tx.product.create({
                    data: {
                        name: row.name,
                        slug,
                        categoryId: row.resolvedCategoryId!,
                        brandId: row.resolvedBrandId!,
                        productNumber: pnResult.value,
                    }
                })

                const defaultColorId = await getDefaultColorId(tx)
                const defaultColor = await tx.color.findUniqueOrThrow({
                    where: { id: defaultColorId },
                    select: { code: true },
                })

                const defaultSkc = await tx.sKC.create({
                    data: {
                        productId: product.id,
                        colorId: defaultColorId,
                        itemNumber: row.itemNumber || null,
                        isDefault: true,
                        order: 0,
                    }
                })

                await tx.sKU.create({
                    data: {
                        skcId: defaultSkc.id,
                        skuCode: buildSkuCode(pnResult.value, defaultColor.code),
                        isDefault: true,
                        order: 0,
                    }
                })
            })
            successCount++
        } catch (error) {
            console.error('Error importing row', row, error)
            errorCount++
        }
    }

    revalidatePath('/products')
    revalidatePath('/inventory')
    revalidatePath('/items')

    return {
        success: successCount > 0,
        message: `تم استيراد ${successCount} منتج${errorCount > 0 ? `، وفشل ${errorCount}` : ''}`,
    }
}
