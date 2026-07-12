'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { requireAuth } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

const PATHS = '/units'

// ── Raw SQL helpers ───────────────────────────────────────────
// All operations use $queryRawUnsafe / $executeRawUnsafe to bypass
// the stale Prisma global client cache (model accessor issue after prisma generate).

export async function getUnits() {
    return safeAction(
        async () => {
            await requireAuth()
            return prisma.$queryRawUnsafe<any[]>(
            `SELECT id, "itemNumber", name, "pluralName", notes, "createdAt", "updatedAt"
             FROM "Unit" ORDER BY name ASC`
            )
        },
        'تعذّر جلب الوحدات'
    )
}

export async function getActiveUnits() {
    return safeAction(
        async () => {
            await requireAuth()
            return prisma.$queryRawUnsafe<any[]>(
            `SELECT id, "itemNumber", name, "pluralName" FROM "Unit" ORDER BY name ASC`
            )
        },
        'تعذّر جلب الوحدات النشطة'
    )
}

export async function createUnit(data: {
    name: string
    pluralName?: string | null
    notes?: string | null
}) {
    try {
        await requireAuth()
        // Atomic item number generation — safely ignores non-numeric characters in existing data
        const rows = await prisma.$queryRawUnsafe<{ id: string; itemNumber: string }[]>(
            `INSERT INTO "Unit" (id, "itemNumber", name, "pluralName", notes, "createdAt", "updatedAt")
             VALUES (
                 gen_random_uuid(),
                 LPAD((COALESCE((SELECT MAX(NULLIF(REGEXP_REPLACE("itemNumber", '\\D', '', 'g'), '')::int) FROM "Unit"), 0) + 1)::text, 4, '0'),
                 $1, $2, $3, NOW(), NOW()
             )
             RETURNING id, "itemNumber"`,
            data.name.trim(),
            data.pluralName || null,
            data.notes || null
        )

        revalidatePath(PATHS)
        return { success: true, data: { id: rows[0].id, itemNumber: rows[0].itemNumber, name: data.name } }
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
}) {
    try {
        await requireAuth()
        const now = new Date()

        // Build SET clauses dynamically — only update provided fields
        const setClauses: string[] = ['"updatedAt" = $2']
        const params: any[] = [id, now]
        let paramIndex = 3

        if (data.name !== undefined) {
            setClauses.push(`name = $${paramIndex}`)
            params.push(data.name.trim())
            paramIndex++
        }
        if (data.pluralName !== undefined) {
            setClauses.push(`"pluralName" = $${paramIndex}`)
            params.push(data.pluralName)
            paramIndex++
        }
        if (data.notes !== undefined) {
            setClauses.push(`notes = $${paramIndex}`)
            params.push(data.notes)
            paramIndex++
        }

        await prisma.$executeRawUnsafe(
            `UPDATE "Unit" SET ${setClauses.join(', ')} WHERE id = $1`,
            ...params
        )

        revalidatePath(PATHS)
        return { success: true }
    } catch (error: any) {
        if (error?.code === 'P2002' || error?.message?.includes('unique')) {
            return { success: false, error: 'اسم الوحدة موجود بالفعل' }
        }
        console.error('[updateUnit]', error?.message)
        return { success: false, error: 'تعذّر تعديل الوحدة' }
    }
}

export async function deleteUnit(id: string) {
    return safeActionWithRevalidation(
        async () => {
            await requireAuth()
            // Check both ProductPrice AND ProductUnit references
            const rows = await prisma.$queryRawUnsafe<any[]>(
                `SELECT
                    (SELECT count(*)::int FROM "ProductPrice" WHERE "unitId" = $1) AS price_count,
                    (SELECT count(*)::int FROM "ProductUnit"  WHERE "unitId" = $1) AS unit_count`,
                id
            )
            if (rows[0]?.price_count > 0) {
                throw Object.assign(
                    new Error('لا يمكن حذف الوحدة لأنها مستخدمة في أسعار المنتجات'),
                    { code: 'P2003' }
                )
            }
            if (rows[0]?.unit_count > 0) {
                throw Object.assign(
                    new Error('لا يمكن حذف الوحدة لأنها مرتبطة بمنتجات'),
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
