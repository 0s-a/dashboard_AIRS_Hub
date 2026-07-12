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

const COLORS = [
    { code: 'RD', name: 'أحمر',     hexCode: '#EF4444', order: 1 },
    { code: 'BL', name: 'أزرق',     hexCode: '#3B82F6', order: 2 },
    { code: 'GR', name: 'أخضر',     hexCode: '#22C55E', order: 3 },
    { code: 'YL', name: 'أصفر',     hexCode: '#EAB308', order: 4 },
    { code: 'BK', name: 'أسود',     hexCode: '#171717', order: 5 },
    { code: 'WH', name: 'أبيض',     hexCode: '#FFFFFF', order: 6 },
    { code: 'GY', name: 'رمادي',    hexCode: '#6B7280', order: 7 },
    { code: 'BR', name: 'بني',      hexCode: '#92400E', order: 8 },
    { code: 'OR', name: 'برتقالي',  hexCode: '#F97316', order: 9 },
    { code: 'PK', name: 'وردي',     hexCode: '#EC4899', order: 10 },
    { code: 'PR', name: 'بنفسجي',   hexCode: '#A855F7', order: 11 },
    { code: 'CY', name: 'سماوي',    hexCode: '#06B6D4', order: 12 },
    { code: 'GD', name: 'ذهبي',     hexCode: '#D97706', order: 13 },
    { code: 'SV', name: 'فضي',      hexCode: '#9CA3AF', order: 14 },
    { code: 'NV', name: 'كحلي',     hexCode: '#1E3A5F', order: 15 },
    { code: 'OL', name: 'زيتي',     hexCode: '#65A30D', order: 16 },
    { code: 'IN', name: 'نيلي',     hexCode: '#1D4ED8', order: 17 },
    { code: 'ST', name: 'قياسي',    hexCode: '#9CA3AF', order: 0 },
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

    // ── 5b. Colors ─────────────────────────────────────────────

    log('🎨', 'Seeding Colors...')
    for (const color of COLORS) {
        await prisma.color.upsert({
            where:  { code: color.code },
            update: {},
            create: color,
        })
        logItem(`${color.name} (${color.code})`)
    }

    const defaultColor = await prisma.color.findUniqueOrThrow({ where: { code: 'ST' } })

    // ── 6. Sample Product (Test Only) ─────────────────────────
    //
    // هذا المنتج للاختبار فقط — رقم المنتج "001" (3 خانات يدوية).
    // في الإنتاج، يُدخل رقم المنتج عند الإنشاء من الواجهة.

    log('📦', 'Seeding Sample Product...')

    // جلب الوحدة والعملة وتسمية السعر المطلوبة عبر itemNumber (أكثر أماناً من البحث بالاسم)
    const defaultCurrency   = await prisma.currency.findUnique({ where: { itemNumber: 'CUR-001' } })
    const defaultUnit       = await prisma.unit.findUnique({     where: { itemNumber: 'UNIT-001' } })
    const defaultPriceLabel = await prisma.priceLabel.findUnique({ where: { itemNumber: 'PL-003' } })

    if (!defaultCurrency || !defaultUnit || !defaultPriceLabel) {
        throw new Error('❌ Missing required seed records (currency / unit / price label). Run seed again.')
    }

    const sampleProduct = await prisma.product.upsert({
        where:  { productNumber: '001' },
        update: {},
        create: {
            productNumber: '001',
            slug:        'test-product',
            name:        'منتج اختبار',
            description: 'منتج تجريبي — يمكن حذفه بعد التشغيل الأول',
        },
    })

    const sampleSkc = await prisma.sKC.upsert({
        where: { productId_colorId: { productId: sampleProduct.id, colorId: defaultColor.id } },
        update: {},
        create: {
            productId: sampleProduct.id,
            colorId: defaultColor.id,
            itemNumber: 'TEST-001',
            isDefault: true,
        },
    })

    const sampleSku = await prisma.sKU.upsert({
        where: { skuCode: '001-ST' },
        update: {},
        create: {
            skcId: sampleSkc.id,
            skuCode: '001-ST',
            isDefault: true,
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
            skuId_priceLabelId_currencyId_unitId: {
                skuId:        sampleSku.id,
                priceLabelId: defaultPriceLabel.id,
                currencyId:   defaultCurrency.id,
                unitId:       defaultUnit.id,
            },
        },
        update: {},
        create: {
            skuId:        sampleSku.id,
            priceLabelId: defaultPriceLabel.id,
            currencyId:   defaultCurrency.id,
            unitId:       defaultUnit.id,
            value:        100.00,
        },
    })

    logItem(`${sampleProduct.name} (${sampleProduct.productNumber})`)

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