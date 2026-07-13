/**
 * prisma/seed.ts
 * ─────────────────────────────────────────────────────────────
 * Seeds the database with required base data.
 * Run with:  npx prisma db seed
 * ─────────────────────────────────────────────────────────────
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function log(emoji: string, message: string) {
    console.log(`${emoji}  ${message}`)
}

function logItem(label: string) {
    console.log(`     └─ ${label}`)
}

// ─────────────────────────────────────────────────────────────
// Seed Data
// ─────────────────────────────────────────────────────────────

const CURRENCIES = [
    {
        itemNumber: 'CUR-001',
        name: 'الريال اليمني',
        code: 'YER',
        symbol: 'ر.ي',
        isDefault: true,
        exchangeRate: null,   // العملة الأساسية — لا معدل تحويل
    },
    {
        itemNumber: 'CUR-002',
        name: 'الريال السعودي',
        code: 'SAR',
        symbol: 'ر.س',
        isDefault: false,
        exchangeRate: 140,
    },
    {
        itemNumber: 'CUR-003',
        name: 'الدولار الأمريكي',
        code: 'USD',
        symbol: '$',
        isDefault: false,
        exchangeRate: 550,
    },
] as const

const UNITS = [
    { itemNumber: 'UNIT-001', name: 'حبة',   pluralName: 'حبات',    notes: null },
    { itemNumber: 'UNIT-002', name: 'كرتون', pluralName: 'كراتين', notes: null },
    { itemNumber: 'UNIT-003', name: 'درزن',  pluralName: 'درازن',  notes: null },
] as const

const PRICE_LABELS = [
    { itemNumber: 'PL-001', name: 'سعر الجملة',   customerType: 'عميل جملة', isDefault: false },
    { itemNumber: 'PL-002', name: 'سعر الكرتونة', customerType: null,         isDefault: false },
    { itemNumber: 'PL-003', name: 'سعر الحبة',    customerType: 'عميل مفرد', isDefault: true  },
    { itemNumber: 'PL-004', name: 'سعر الرف',     customerType: null,         isDefault: false },
    { itemNumber: 'PL-005', name: 'سعر العرض',    customerType: null,         isDefault: false },
] as const

const PRODUCT_ATTRIBUTES = [
    {
        code: 'color',
        name: 'اللون',
        examples: ['أحمر', 'أزرق', 'أخضر', 'أسود', 'أبيض', 'قياسي'],
    },
    {
        code: 'size',
        name: 'المقاس',
        examples: ['XS', 'S', 'M', 'L', 'XL', '2XL', '36', '38', '40', '42'],
    },
    {
        code: 'capacity',
        name: 'السعة',
        examples: ['30ml', '50ml', '100ml', '250ml', '500ml', '1L'],
    },
    {
        code: 'volume',
        name: 'الحجم',
        examples: ['صغير', 'وسط', 'كبير'],
    },
    {
        code: 'weight',
        name: 'الوزن',
        examples: ['100g', '250g', '500g', '1kg', '2kg', '5kg'],
    },
] as const

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
    console.log()
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🌱  Database Seeding Started')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()

    // ── 1. Admin User ─────────────────────────────────────────

    log('👤', 'Seeding Admin User...')
    const adminPassword = await bcrypt.hash('admin123', 12)
    await prisma.user.upsert({
        where:  { username: 'admin' },
        update: {},
        create: {
            name:     'حسام',
            username: 'admin',
            password: adminPassword,
            isActive: true,
        },
    })
    logItem('admin / admin123')

    // ── 2. Store Settings ─────────────────────────────────────

    log('🏪', 'Seeding Store Settings...')
    await prisma.storeSettings.upsert({
        where:  { id: 'default' },
        update: {},
        create: {
            id:          'default',
            name:        'المتجر الرئيسي',
            description: null,
        },
    })
    logItem('default store settings created')

    // ── 3. Currencies ─────────────────────────────────────────

    log('💵', 'Seeding Currencies...')
    for (const cur of CURRENCIES) {
        await prisma.currency.upsert({
            where:  { code: cur.code },
            update: {},
            create: cur,
        })
        logItem(`${cur.name} (${cur.code})`)
    }

    // ── 4. Units ──────────────────────────────────────────────

    log('⚖️', 'Seeding Units...')
    for (const unit of UNITS) {
        await prisma.unit.upsert({
            where:  { itemNumber: unit.itemNumber },
            update: {},
            create: unit,
        })
        logItem(unit.name)
    }

    // ── 5. Price Labels ───────────────────────────────────────

    log('🏷️', 'Seeding Price Labels...')
    for (const pl of PRICE_LABELS) {
        await prisma.priceLabel.upsert({
            where:  { itemNumber: pl.itemNumber },
            update: {},
            create: pl,
        })
        logItem(pl.name)
    }

    // ── 5b. Product Attributes ─────────────────────────────────

    log('🏷️', 'Seeding Product Attributes...')
    const seededAttributes: Record<string, string> = {}
    for (const attr of PRODUCT_ATTRIBUTES) {
        const row = await prisma.productAttribute.upsert({
            where: { code: attr.code },
            update: {
                name: attr.name,
                examples: [...attr.examples],
            },
            create: {
                code: attr.code,
                name: attr.name,
                examples: [...attr.examples],
            },
        })
        seededAttributes[attr.code] = row.id
        logItem(`${attr.name} (${attr.code})`)
    }

    // ── 6. Sample Brand + Category + Product ───────────────────

    log('🏷️', 'Seeding Sample Brand & Category...')
    const sampleBrand = await prisma.brand.upsert({
        where: { code: 'TS' },
        update: {},
        create: {
            name: 'براند اختبار',
            code: 'TS',
            description: 'براند تجريبي',
        },
    })
    logItem(`${sampleBrand.name} (${sampleBrand.code})`)

    const sampleCategory = await prisma.category.upsert({
        where: { code: 'GEN' },
        update: {},
        create: {
            name: 'عام',
            code: 'GEN',
            description: 'تصنيف تجريبي',
        },
    })
    logItem(`${sampleCategory.name} (${sampleCategory.code})`)

    log('📦', 'Seeding Sample Product...')

    // جلب الوحدة والعملة وتسمية السعر المطلوبة عبر itemNumber (أكثر أماناً من البحث بالاسم)
    const defaultCurrency   = await prisma.currency.findUnique({ where: { itemNumber: 'CUR-001' } })
    const defaultUnit       = await prisma.unit.findUnique({     where: { itemNumber: 'UNIT-001' } })
    const defaultPriceLabel = await prisma.priceLabel.findUnique({ where: { itemNumber: 'PL-003' } })

    if (!defaultCurrency || !defaultUnit || !defaultPriceLabel) {
        throw new Error('❌ Missing required seed records (currency / unit / price label). Run seed again.')
    }

    const sampleProduct = await prisma.product.upsert({
        where: { itemNumber: 'TEST-001' },
        update: {
            brandId: sampleBrand.id,
            categoryId: sampleCategory.id,
        },
        create: {
            itemNumber: 'TEST-001',
            slug: 'test-product-st',
            name: 'منتج اختبار',
            description: 'منتج تجريبي — يمكن حذفه بعد التشغيل الأول',
            brandId: sampleBrand.id,
            categoryId: sampleCategory.id,
            isAvailable: true,
        },
    })

    if (seededAttributes.color) {
        await prisma.productAttributeValue.upsert({
            where: {
                productId_attributeId: {
                    productId: sampleProduct.id,
                    attributeId: seededAttributes.color,
                },
            },
            update: { value: 'قياسي' },
            create: {
                productId: sampleProduct.id,
                attributeId: seededAttributes.color,
                value: 'قياسي',
            },
        })
    }

    await prisma.productUnit.upsert({
        where: {
            productId_unitId: {
                productId: sampleProduct.id,
                unitId: defaultUnit.id,
            },
        },
        update: {},
        create: {
            productId: sampleProduct.id,
            unitId: defaultUnit.id,
            isBase: true,
            conversionFactor: 1,
        },
    })

    await prisma.productPrice.upsert({
        where: {
            productId_priceLabelId_unitId: {
                productId: sampleProduct.id,
                priceLabelId: defaultPriceLabel.id,
                unitId: defaultUnit.id,
            },
        },
        update: {},
        create: {
            productId: sampleProduct.id,
            priceLabelId: defaultPriceLabel.id,
            unitId: defaultUnit.id,
            value: 100.00,
        },
    })

    logItem(`${sampleProduct.name} (${sampleProduct.itemNumber})`)

    // ── 7. Sample Customer (Test Only) ────────────────────────

    log('👥', 'Seeding Sample Customer...')
    const sampleCustomer = await prisma.customer.upsert({
        where:  { id: 'seed-customer-test' },
        update: {},
        create: {
            id:       'seed-customer-test',
            name:     'عميل اختبار',
            isActive: true,
            contacts: {
                create: [
                    {
                        type:      'phone',
                        value:     '+967700000000',
                        label:     'شخصي',
                        isPrimary: true,
                    },
                ],
            },
        },
    })
    logItem(sampleCustomer.name ?? 'عميل اختبار')

    // ─────────────────────────────────────────────────────────

    console.log()
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅  Seeding completed successfully.')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (error) => {
        console.error('❌ Seeding failed:', error)
        await prisma.$disconnect()
        process.exit(1)
    })