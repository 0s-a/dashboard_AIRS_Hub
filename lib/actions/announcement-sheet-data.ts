'use server'

import { prisma } from '@/lib/prisma'
import { safeAction } from '@/lib/action-utils'

/** Lightweight data needed to populate the announcement sheet */
export async function getAnnouncementSheetData() {
    return safeAction(async () => {
        const [persons, personTypes, products, categories] = await Promise.all([
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
                select: { id: true, name: true, itemNumber: true, categoryId: true },
                orderBy: { name: 'asc' },
            }),
            prisma.category.findMany({
                where: { isActive: true },
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
        ])
        return { persons, personTypes, products, categories }
    }, 'تعذّر جلب بيانات الإعلان')
}
