'use server'

import { prisma, generateProductCode } from './inventory/_shared'
import { revalidatePath } from 'next/cache'

export type ImportRow = {
    _id: string // Client-side unique ID for the row
    name: string
    itemNumber: string
    categoryCode: string
    brandCode: string
}

export type ValidatedRow = ImportRow & {
    isValid: boolean
    errors: string[]
    productCodePreview: string
    resolvedCategoryId?: string
    resolvedBrandId?: string
}

export async function validateImportData(rows: ImportRow[]): Promise<ValidatedRow[]> {
    if (!rows || rows.length === 0) return []

    // Fetch all needed data for validation to avoid N+1 queries
    const itemNumbers = rows.map(r => r.itemNumber).filter(Boolean)
    const categoryCodes = Array.from(new Set(rows.map(r => r.categoryCode).filter(Boolean)))
    const brandCodes = Array.from(new Set(rows.map(r => r.brandCode).filter(Boolean)))

    const [existingCategories, existingBrands] = await Promise.all([
        prisma.category.findMany({
            where: { code: { in: categoryCodes } },
            select: { id: true, code: true }
        }),
        prisma.brand.findMany({
            where: { code: { in: brandCodes } },
            select: { id: true, code: true }
        })
    ])

    // Map code -> id
    const categoryMap = new Map(existingCategories.map(c => [c.code, c.id]))
    const brandMap = new Map(existingBrands.map(b => [b.code, b.id]))

    // Build conditions for name+brandId checking
    const nameBrandConditions = rows
        .map(r => ({ name: r.name, brandId: brandMap.get(r.brandCode) }))
        .filter(c => c.name && c.brandId) as { name: string, brandId: string }[]

    const [existingProductsByItemNumber, existingProductsByNameBrand] = await Promise.all([
        prisma.product.findMany({
            where: { itemNumber: { in: itemNumbers } },
            select: { itemNumber: true }
        }),
        nameBrandConditions.length > 0 ? prisma.product.findMany({
            where: { OR: nameBrandConditions },
            select: { name: true, brandId: true }
        }) : []
    ])

    const existingItemNumbersSet = new Set(existingProductsByItemNumber.map(p => p.itemNumber))
    const existingNameBrandSet = new Set(existingProductsByNameBrand.map(p => `${p.name}::${p.brandId}`))

    // We also need to check for duplicates within the current batch
    const batchItemNumbers = new Set<string>()
    const batchNameBrands = new Set<string>()

    const validatedRows: ValidatedRow[] = rows.map(row => {
        const errors: string[] = []
        let isValid = true

        if (!row.name || row.name.trim() === '') {
            errors.push('الاسم مطلوب')
            isValid = false
        }

        if (!row.itemNumber || row.itemNumber.trim() === '') {
            errors.push('رقم المنتج مطلوب')
            isValid = false
        } else {
            if (existingItemNumbersSet.has(row.itemNumber)) {
                errors.push('رقم المنتج موجود مسبقاً في النظام')
                isValid = false
            } else if (batchItemNumbers.has(row.itemNumber)) {
                errors.push('رقم المنتج مكرر في هذا الملف')
                isValid = false
            } else {
                batchItemNumbers.add(row.itemNumber)
            }
        }

        let resolvedCategoryId: string | undefined
        let resolvedBrandId: string | undefined

        if (!row.categoryCode) {
            errors.push('كود الصنف مطلوب')
            isValid = false
        } else if (!categoryMap.has(row.categoryCode)) {
            errors.push('كود الصنف غير موجود')
            isValid = false
        } else {
            resolvedCategoryId = categoryMap.get(row.categoryCode)
        }

        if (!row.brandCode) {
            errors.push('كود الماركة مطلوب')
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
            isValid,
            errors,
            productCodePreview: `${row.categoryCode || '***'}-${row.brandCode || '***'}-***`,
            resolvedCategoryId,
            resolvedBrandId
        }
    })

    return validatedRows
}

export async function importProductsBatch(rows: ValidatedRow[]) {
    const validRows = rows.filter(r => r.isValid)
    if (validRows.length === 0) {
        return { success: false, message: 'لا توجد بيانات صحيحة لاستيرادها' }
    }

    let successCount = 0
    let errorCount = 0

    // Process sequentially or in a transaction. We'll do it in a transaction
    // to ensure partial failure is handled or we just loop.
    // Product code generation needs atomic sequences, so sequential loop is safer here.
    for (const row of validRows) {
        try {
            await prisma.$transaction(async (tx) => {
                const productCode = await generateProductCode(row.categoryCode, row.brandCode, tx)

                await tx.product.create({
                    data: {
                        name: row.name,
                        itemNumber: row.itemNumber || null,
                        categoryId: row.resolvedCategoryId!,
                        brandId: row.resolvedBrandId!,
                        productCode,
                        isAvailable: false, // New products have no prices/units, so they must be unavailable by default
                    }
                })
            })
            successCount++
        } catch (error) {
            console.error('Error importing row', row, error)
            errorCount++
        }
    }

    revalidatePath('/inventory')
    
    return {
        success: true,
        successCount,
        errorCount,
        message: `تم استيراد ${successCount} منتج بنجاح${errorCount > 0 ? `، وفشل ${errorCount}` : ''}.`
    }
}
