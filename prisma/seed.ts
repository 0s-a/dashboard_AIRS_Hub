import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Start seeding ...')

    // 1. تعريف المنتجات مع الحقول الجديدة (رقم الصنف، الوحدة، المستوى، العبوة)
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
        // نستخدم upsert بدلاً من create لتجنب تكرار البيانات عند تشغيل الأمر مرتين
        const product = await prisma.product.upsert({
            where: { itemNumber: p.itemNumber }, // البحث برقم الصنف
            update: p, // تحديث البيانات إذا كان موجوداً
            create: p, // إنشاؤه إذا لم يكن موجوداً
        })
        console.log(`  └─ Created/Updated product: ${product.name} (#${product.itemNumber})`)
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