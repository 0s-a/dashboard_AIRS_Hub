'use server'

import { prisma } from '@/lib/prisma'
import { safeAction } from '@/lib/action-utils'
import { toDisplayUrl } from '@/lib/utils/image-paths'

/** Lightweight data needed to populate the announcement sheet */
export async function getAnnouncementSheetData() {
    return safeAction(async () => {
        const [persons, personTypes, products, categories, rawTags] = await Promise.all([
            prisma.person.findMany({
                where: { isActive: true },
                select: { id: true, name: true, groupName: true },
                orderBy: { name: 'asc' },
            }),
            prisma.personType.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
            prisma.product.findMany({
                where: { isAvailable: true },
                select: {
                    id: true, name: true, itemNumber: true, categoryId: true,
                    productImages: {
                        select: { url: true },
                        orderBy: { order: 'asc' },
                        take: 1,
                    },
                },
                orderBy: { name: 'asc' },
            }),


            prisma.category.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
            // Fetch distinct tags from active persons via PersonTag relation
            prisma.personTag.findMany({
                where:  { person: { isActive: true } },
                select: { tag: { select: { name: true } } },
                distinct: ['tagId'],
            }),
        ])

        // Collect unique tag names
        const personTags: string[] = [
            ...new Set(rawTags.map((pt: any) => pt.tag.name))
        ].sort()

        // Map products to include first image URL
        const mappedProducts = products.map(p => ({
            id:         p.id,
            name:       p.name,
            itemNumber: p.itemNumber,
            categoryId: p.categoryId,
            mainImage:  (p as any).productImages?.[0]?.url ? toDisplayUrl((p as any).productImages[0].url) : null,
        }))


        return { persons, personTypes, products: mappedProducts, categories, personTags }
    }, 'تعذّر جلب بيانات الإعلان')
}

