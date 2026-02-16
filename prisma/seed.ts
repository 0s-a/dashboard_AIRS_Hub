import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Start seeding ...')

    // 1. تعريف المنتجات مع الحقول الجديدة (رقم الصنف، الوحدة، المستوى، العبوة)
    const products = [
        {
            itemNumber: 'APPLE-001', // ضروري للربط والبحث
            name: 'آيفون 15 برو ماكس',
            description: 'أحدث هاتف آيفون بتصميم من التيتانيوم.',
            price: 5499.00,
            unit: 'حبة',
            tier: 'A', // صنف عالي الأهمية
            packaging: '1x1',
            isAvailable: true,
            // imagePath: '/images/iphone15.png' // يمكنك إضافة مسار صورة حقيقي هنا
        },
        {
            itemNumber: 'APPLE-002',
            name: 'ساعة آبل الترا 2',
            description: 'ساعة رياضية متطورة للغواصين والرياضيين.',
            price: 3299.00,
            unit: 'حبة',
            tier: 'B',
            packaging: '1x1',
            isAvailable: true,
        },
        {
            itemNumber: 'APPLE-003',
            name: 'ماك بوك اير M3',
            description: 'لابتوب نحيف وقوي بمعالج M3 الجديد.',
            price: 4999.00,
            unit: 'كرتون',
            tier: 'A',
            packaging: '6 حبات', // مثال لو كان يباع بالجملة أو وصف للتغليف
            isAvailable: false, // لنجرب حالة غير متوفر
        },
        {
            itemNumber: 'ACC-101',
            name: 'شاحن 20 واط أصلي',
            description: 'شاحن سريع من آبل.',
            price: 99.00,
            unit: 'حبة',
            tier: 'C',
            packaging: '24x1',
            isAvailable: true,
        }
    ]

    console.log('📦 Seeding Products...')
    for (const p of products) {
        // نستخدم upsert بدلاً من create لتجنب تكرار البيانات عند تشغيل الأمر مرتين
        const product = await prisma.product.upsert({
            where: { itemNumber: p.itemNumber }, // البحث برقم الصنف
            update: p, // تحديث البيانات إذا كان موجوداً
            create: p, // إنشاؤه إذا لم يكن موجوداً
        })
        console.log(`  └─ Created/Updated product: ${product.name} (#${product.itemNumber})`)
    }

    // 2. تعريف العملاء
    const customers = [
        {
            phoneNumber: '+966500000001',
            name: 'أحمد القحطاني',
            totalOrders: 5,
            isActive: true,

        },
        {
            phoneNumber: '+966500000002',
            name: 'سارة العتيبي',
            totalOrders: 12,
            isActive: true,

        }
    ]

    console.log('\n👥 Seeding Customers...')
    for (const c of customers) {
        const customer = await prisma.customer.upsert({
            where: { phoneNumber: c.phoneNumber },
            update: {},
            create: c,
        })
        console.log(`  └─ Created/Updated customer: ${customer.name}`)
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