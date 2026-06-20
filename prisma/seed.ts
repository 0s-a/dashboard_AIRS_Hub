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
            where:  { itemNumber: cur.itemNumber },
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

    // ── 6. Sample Product (Test Only) ─────────────────────────
    //
    // هذا المنتج للاختبار فقط — كود المنتج يستخدم "GEN-XX"
    // لأنه لا ينتمي لفئة أو ماركة محددة.
    // في الإنتاج، تُنشأ المنتجات عبر الواجهة مع توليد الكود تلقائياً.

    log('📦', 'Seeding Sample Product...')

    // جلب الوحدة والعملة وتسمية السعر المطلوبة عبر itemNumber (أكثر أماناً من البحث بالاسم)
    const defaultCurrency   = await prisma.currency.findUnique({ where: { itemNumber: 'CUR-001' } })
    const defaultUnit       = await prisma.unit.findUnique({     where: { itemNumber: 'UNIT-001' } })
    const defaultPriceLabel = await prisma.priceLabel.findUnique({ where: { itemNumber: 'PL-003' } })

    if (!defaultCurrency || !defaultUnit || !defaultPriceLabel) {
        throw new Error('❌ Missing required seed records (currency / unit / price label). Run seed again.')
    }

    const sampleProduct = await prisma.product.upsert({
        where:  { productCode: 'GEN-XX-TEST-001' },
        update: {},
        create: {
            productCode: 'GEN-XX-TEST-001',
            itemNumber:  'TEST-001',
            name:        'منتج اختبار',
            description: 'منتج تجريبي — يمكن حذفه بعد التشغيل الأول',
            isAvailable: false,
        },
    })

    await prisma.productUnit.upsert({
        where: {
            productId_unitId: {
                productId: sampleProduct.id,
                unitId:    defaultUnit.id,
            },
        },
        update: {},
        create: {
            productId:        sampleProduct.id,
            unitId:           defaultUnit.id,
            isBase:           true,
            conversionFactor: 1,
        },
    })

    await prisma.productPrice.upsert({
        where: {
            productId_priceLabelId_currencyId_unitId: {
                productId:    sampleProduct.id,
                priceLabelId: defaultPriceLabel.id,
                currencyId:   defaultCurrency.id,
                unitId:       defaultUnit.id,
            },
        },
        update: {},
        create: {
            productId:    sampleProduct.id,
            priceLabelId: defaultPriceLabel.id,
            currencyId:   defaultCurrency.id,
            unitId:       defaultUnit.id,
            value:        100.00,
        },
    })

    logItem(`${sampleProduct.name} (${sampleProduct.productCode})`)

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