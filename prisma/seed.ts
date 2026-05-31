import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Start seeding ...')

    // 0. إنشاء حساب Admin افتراضي
    const adminPassword = await bcrypt.hash('admin123', 12)
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            name: 'حسام',
            username: 'admin',
            password: adminPassword,
            isActive: true,
        },
    })
    console.log('👤 Admin user created/verified (username: admin, password: admin123)')

    // 1. تعريف العملات (Currencies)
    const currencies = [
        { itemNumber: 'CUR-001', name: 'الريال السعودي', code: 'SAR', symbol: 'ر.س', isDefault: false, isActive: true, exchangeRate: 140 },
        { itemNumber: 'CUR-002', name: 'الدولار الأمريكي', code: 'USD', symbol: '$', isDefault: false, isActive: true, exchangeRate: 550 },
        { itemNumber: 'CUR-003', name: 'الريال اليمني', code: 'YER', symbol: 'ر.ي', isDefault: true, isActive: true }
    ];
    console.log('💵 Seeding Currencies...');
    for (const cur of currencies) {
        await prisma.currency.upsert({
            where: { itemNumber: cur.itemNumber },
            update: {},
            create: cur
        });
    }

    // 2. تعريف وحدات القياس (Units)
    const units = [
        { itemNumber: 'UNIT-001', name: 'حبة', pluralName: 'حبات', isActive: true },
        { itemNumber: 'UNIT-002', name: 'كرتون', pluralName: 'كراتين', isActive: true },
        { itemNumber: 'UNIT-003', name: 'درزن', pluralName: 'درازن', isActive: true }
    ];
    console.log('⚖️ Seeding Units...');
    for (const unit of units) {
        await prisma.unit.upsert({
            where: { itemNumber: unit.itemNumber },
            update: {},
            create: unit
        });
    }

    // 3. تعريف مسميات الأسعار (Price Labels)
    const priceLabels = [
        { itemNumber: 'PL-001', name: 'سعر الجملة' },
        { itemNumber: 'PL-002', name: 'سعر الكرتونة' },
        { itemNumber: 'PL-003', name: 'سعر الحبة' },
        { itemNumber: 'PL-004', name: 'سعر الرف' },
        { itemNumber: 'PL-005', name: 'سعر العرض' },
        
    ];
    console.log('🏷️ Seeding Price Labels...');
    for (const pl of priceLabels) {
        await prisma.priceLabel.upsert({
            where: { itemNumber: pl.itemNumber },
            update: {},
            create: pl
        });
    }

    // 4. تعريف المنتجات
    const products = [
        {
            itemNumber: 'TEST-001',
            name: 'اختبار',
            description: 'منتج اختبار',
            prices: [{ label: 'سعر الحبة', value: 100.00 }],
            unit: 'حبة',
            packaging: '1x1',
            isAvailable: true,
        }
    ]

    console.log('📦 Seeding Products...')
    
    // جلب العملة الافتراضية والوحدة الافتراضية للربط
    const defaultCurrency = await prisma.currency.findUnique({ where: { code: 'YER' } })
    const defaultUnit = await prisma.unit.findUnique({ where: { name: 'حبة' } })
    const defaultPriceLabel = await prisma.priceLabel.findUnique({ where: { name: 'سعر الحبة' } })

    for (const p of products) {
        const { prices: _prices, unit: _unit, packaging: _packaging, ...productData } = p as any
        
        // 1. إنشاء أو تحديث المنتج
        const product = await prisma.product.upsert({
            where: { productCode: `GEN-XX-${p.itemNumber}` },
            update: {},
            create: { ...productData, productCode: `GEN-XX-${p.itemNumber}` },
        })

        // 2. ربط وحدة المنتج (ProductUnit)
        if (defaultUnit) {
            await prisma.productUnit.upsert({
                where: {
                    productId_unitId: {
                        productId: product.id,
                        unitId: defaultUnit.id
                    }
                },
                update: {},
                create: {
                    productId: product.id,
                    unitId: defaultUnit.id,
                    isBase: true,
                    conversionFactor: 1
                }
            })
        }

        // 3. ربط سعر المنتج (ProductPrice)
        if (defaultCurrency && defaultUnit && defaultPriceLabel && _prices && _prices.length > 0) {
            const priceValue = _prices[0].value;
            
            await prisma.productPrice.upsert({
                where: {
                    productId_priceLabelId_currencyId_unitId: {
                        productId: product.id,
                        priceLabelId: defaultPriceLabel.id,
                        currencyId: defaultCurrency.id,
                        unitId: defaultUnit.id
                    }
                },
                update: {},
                create: {
                    productId: product.id,
                    priceLabelId: defaultPriceLabel.id,
                    currencyId: defaultCurrency.id,
                    unitId: defaultUnit.id,
                    value: priceValue
                }
            })
        }

        console.log(`  └─ Created/Updated product: ${product.name} (#${product.productCode})`)
    }

    // 2. تعريف الأشخاص
    const persons = [
        {
            id: 'seed-customer-test',
            name: 'اختبار',
            isActive: true,
        }
    ]

    const personContacts: Record<string, { type: string; value: string; label: string; isPrimary: boolean }[]> = {
        'seed-customer-test': [{ type: 'phone', value: '+966500000000', label: 'شخصي', isPrimary: true }],
    }

    console.log('\n👥 Seeding Persons...')
    for (const c of persons) {
        const person = await prisma.customer.upsert({
            where: { id: c.id },
            update: {},
            create: {
                ...c,
                contacts: {
                    create: personContacts[c.id] || []
                }
            },
        })
        console.log(`  └─ Created/Updated person: ${person.name}`)
    }

    console.log('\n✅ Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })