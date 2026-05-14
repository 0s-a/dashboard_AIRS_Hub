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
        { itemNumber: 'CUR-001', name: 'الريال السعودي', code: 'SAR', symbol: 'ر.س', isDefault: true, isActive: true },
        { itemNumber: 'CUR-002', name: 'الدولار الأمريكي', code: 'USD', symbol: '$', isDefault: false, isActive: true, exchangeRate: 3.75 },
        { itemNumber: 'CUR-003', name: 'الدرهم الإماراتي', code: 'AED', symbol: 'د.إ', isDefault: false, isActive: true, exchangeRate: 1.02 }
    ];
    console.log('💵 Seeding Currencies...');
    for (const cur of currencies) {
        await prisma.currency.upsert({
            where: { code: cur.code },
            update: cur,
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
            where: { name: unit.name },
            update: unit,
            create: unit
        });
    }

    // 3. تعريف مسميات الأسعار (Price Labels)
    const priceLabels = [
        { itemNumber: 'PL-001', name: 'سعر الجملة' },
        { itemNumber: 'PL-002', name: 'سعر المفرد' },
        { itemNumber: 'PL-003', name: 'سعر خاص' }
    ];
    console.log('🏷️ Seeding Price Labels...');
    for (const pl of priceLabels) {
        await prisma.priceLabel.upsert({
            where: { name: pl.name },
            update: pl,
            create: pl
        });
    }

    // 4. تعريف المنتجات
    const products = [
        {
            itemNumber: 'APPLE-001',
            name: 'آيفون 15 برو ماكس',
            description: 'أحدث هاتف آيفون بتصميم من التيتانيوم.',
            prices: [{ label: 'سعر المفرد', value: 5499.00 }],
            unit: 'حبة',
            packaging: '1x1',
            isAvailable: true,
        },
        {
            itemNumber: 'APPLE-002',
            name: 'ساعة آبل الترا 2',
            description: 'ساعة رياضية متطورة للغواصين والرياضيين.',
            prices: [{ label: 'سعر المفرد', value: 3299.00 }],
            unit: 'حبة',
            packaging: '1x1',
            isAvailable: true,
        },
        {
            itemNumber: 'APPLE-003',
            name: 'ماك بوك اير M3',
            description: 'لابتوب نحيف وقوي بمعالج M3 الجديد.',
            prices: [{ label: 'سعر المفرد', value: 4999.00 }],
            unit: 'كرتون',
            packaging: '6 حبات',
            isAvailable: false,
        },
        {
            itemNumber: 'ACC-101',
            name: 'شاحن 20 واط أصلي',
            description: 'شاحن سريع من آبل.',
            prices: [{ label: 'سعر المفرد', value: 99.00 }, { label: 'سعر الجملة', value: 80.00 }],
            unit: 'حبة',
            packaging: '24x1',
            isAvailable: true,
        }
    ]

    console.log('📦 Seeding Products...')
    for (const p of products) {
        const { prices: _prices, unit: _unit, packaging: _packaging, ...productData } = p as any
        // نستخدم upsert بدلاً من create لتجنب تكرار البيانات عند تشغيل الأمر مرتين
        const product = await prisma.product.upsert({
            where: { productCode: `GEN-XX-${p.itemNumber}` }, // البحث بالرقم المركب
            update: productData,
            create: { ...productData, productCode: `GEN-XX-${p.itemNumber}` },
        })
        console.log(`  └─ Created/Updated product: ${product.name} (#${product.productCode})`)
    }

    // 2. تعريف الأشخاص
    const persons = [
        {
            id: 'seed-customer-001',
            name: 'أحمد القحطاني',
            isActive: true,
        },
        {
            id: 'seed-customer-002',
            name: 'سارة العتيبي',
            isActive: true,
        }
    ]

    const personContacts: Record<string, { type: string; value: string; label: string; isPrimary: boolean }[]> = {
        'seed-customer-001': [{ type: 'phone', value: '+966500000001', label: 'شخصي', isPrimary: true }],
        'seed-customer-002': [{ type: 'phone', value: '+966500000002', label: 'شخصي', isPrimary: true }],
    }

    console.log('\n👥 Seeding Persons...')
    for (const c of persons) {
        const person = await prisma.person.upsert({
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