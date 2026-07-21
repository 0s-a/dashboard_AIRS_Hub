import { prisma } from '@/lib/prisma'

export interface BrandListItem {
    name: string
    code: string
}

/** List all brands with name + code only, ordered alphabetically. */
export async function listBrands(): Promise<BrandListItem[]> {
    return prisma.brand.findMany({
        select: { name: true, code: true },
        orderBy: { name: 'asc' },
    })
}
