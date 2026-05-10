/**
 * Migration script: Populate productCode for existing products.
 * 
 * Run: npx tsx scripts/migrate-product-codes.ts
 */

import { PrismaClient } from '@prisma/client'
import { PRODUCT_CODE_CONFIG } from '../lib/config/product-code.config'

const prisma = new PrismaClient()

async function migrate() {
    console.log('🚀 Migrating existing products to composite product codes...\n')

    const products = await prisma.product.findMany({
        where: { productCode: { equals: null as any } },
        include: {
            category: { select: { code: true } },
            brandRef: { select: { code: true } },
        },
        orderBy: { createdAt: 'asc' },  // Preserve creation order
    })

    if (products.length === 0) {
        console.log('✅ No products need migration — all already have productCode.')
        return
    }

    console.log(`📦 Found ${products.length} products without productCode\n`)

    const config = PRODUCT_CODE_CONFIG
    const sep = config.separator

    for (const product of products) {
        const catCode = (product as any).category?.code ?? config.category.fallbackCode
        const brCode  = (product as any).brandRef?.code ?? config.brand.fallbackCode

        // Atomic increment via upsert
        const seq = await prisma.productCodeSequence.upsert({
            where: {
                categoryCode_brandCode: { categoryCode: catCode, brandCode: brCode }
            },
            update: { lastSequence: { increment: 1 } },
            create: { categoryCode: catCode, brandCode: brCode, lastSequence: 1 },
        })

        const code = `${catCode}${sep}${brCode}${sep}${
            String(seq.lastSequence).padStart(config.sequence.length, config.sequence.padChar)
        }`

        await prisma.product.update({
            where: { id: product.id },
            data: { productCode: code },
        })

        console.log(`  ✅ ${product.name} → ${code}`)
    }

    console.log(`\n🎉 Migration complete! ${products.length} products updated.`)
}

migrate()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('❌ Migration failed:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
