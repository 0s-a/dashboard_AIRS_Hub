'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

const PATHS = '/units'

// ── Raw SQL helpers ───────────────────────────────────────────
// All operations use $queryRawUnsafe / $executeRawUnsafe to bypass
// the stale Prisma global client cache (model accessor issue after prisma generate).

export async function getUnits() {
    return safeAction(
        () => prisma.$queryRawUnsafe<any[]>(
            `SELECT id, "itemNumber", name, "pluralName", notes, "isActive", "createdAt", "updatedAt"
             FROM "Unit" ORDER BY name ASC`
        ),
        'تعذّر جلب الوحدات'
    )
}

export async function getActiveUnits() {
    return safeAction(
        () => prisma.$queryRawUnsafe<any[]>(
            `SELECT id, "itemNumber", name, "pluralName" FROM "Unit" WHERE "isActive" = true ORDER BY name ASC`
        ),
        'تعذّر جلب الوحدات النشطة'
    )
}

export async function createUnit(data: {
    name: string
    pluralName?: string | null
    notes?: string | null
    isActive?: boolean
}) {
    try {
        const id = randomUUID()
        const itemNumber = await generateUnitItemNumber()
        const now = new Date()

        await prisma.$executeRawUnsafe(
            `INSERT INTO "Unit" (id, "itemNumber", name, "pluralName", notes, "isActive", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            id,
            itemNumber,
            data.name.trim(),
            data.pluralName || null,
            data.notes || null,
            data.isActive ?? true,
            now,
            now
        )

        revalidatePath(PATHS)
        return { success: true, data: { id, itemNumber, name: data.name } }
    } catch (error: any) {
        if (error?.code === 'P2002' || error?.message?.includes('unique')) {
            return { success: false, error: 'اسم الوحدة موجود بالفعل' }
        }
        console.error('[createUnit]', error?.message || error)
        return { success: false, error: 'تعذّر إنشاء الوحدة' }
    }
}

export async function updateUnit(id: string, data: {
    name?: string
    pluralName?: string | null
    notes?: string | null
    isActive?: boolean
}) {
    try {
        const now = new Date()
        await prisma.$executeRawUnsafe(
            `UPDATE "Unit" SET
                name = COALESCE($2, name),
                "pluralName" = $3,
                notes = $4,
                "isActive" = COALESCE($5, "isActive"),
                "updatedAt" = $6
             WHERE id = $1`,
            id,
            data.name?.trim() ?? null,
            data.pluralName ?? null,
            data.notes ?? null,
            data.isActive ?? null,
            now
        )
        revalidatePath(PATHS)
        return { success: true }
    } catch (error: any) {
        console.error('[updateUnit]', error?.message)
        return { success: false, error: 'تعذّر تعديل الوحدة' }
    }
}

export async function deleteUnit(id: string) {
    return safeActionWithRevalidation(
        async () => {
            const rows = await prisma.$queryRawUnsafe<any[]>(
                `SELECT (SELECT count(*)::int FROM "ProductPrice" WHERE "unitId" = $1) AS price_count`, id
            )
            if (rows[0]?.price_count > 0) {
                throw Object.assign(
                    new Error('لا يمكن حذف الوحدة لأنها مستخدمة في أسعار المنتجات'),
                    { code: 'P2003' }
                )
            }
            await prisma.$executeRawUnsafe(`DELETE FROM "Unit" WHERE id = $1`, id)
            return { deleted: true }
        },
        PATHS,
        'تعذّر حذف الوحدة'
    )
}

export async function generateUnitItemNumber(): Promise<string> {
    const rows = await prisma.$queryRawUnsafe<{ itemNumber: string }[]>(
        `SELECT "itemNumber" FROM "Unit" ORDER BY "itemNumber" DESC LIMIT 1`
    )
    const last = rows[0]?.itemNumber ?? null
    const next = last ? parseInt(last, 10) + 1 : 1
    return String(next).padStart(4, '0')
}
