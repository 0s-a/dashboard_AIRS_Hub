import { prisma } from '@/lib/prisma'

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\u0600-\u06FF\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') || 'item'
}

export async function uniqueItemSlug(base: string, excludeId?: string): Promise<string> {
    const root = slugify(base)
    let counter = 0
    while (counter < 1000) {
        const candidate = counter === 0 ? root : `${root}-${counter}`
        const existing = await prisma.item.findFirst({
            where: {
                slug: candidate,
                ...(excludeId ? { NOT: { id: excludeId } } : {}),
            },
            select: { id: true },
        })
        if (!existing) return candidate
        counter++
    }
    return `${root}-${Date.now()}`
}

/** @deprecated use uniqueItemSlug */
export const uniqueProductSlug = uniqueItemSlug
