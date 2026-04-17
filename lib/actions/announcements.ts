'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'
import { getCurrentUser } from '@/lib/actions/auth'
import { requireAdmin } from '@/lib/auth-utils'

const PATHS = '/announcements'

// ─── Types ──────────────────────────────────────────────────

export interface PersonFilters {
    all?: boolean
    typeIds?: string[]
    groupNames?: string[]
    tags?: string[]
    [key: string]: unknown  // required for Prisma Json compatibility
}

export interface ProductFilters {
    all?: boolean
    categoryIds?: string[]
    tags?: string[]
    [key: string]: unknown  // required for Prisma Json compatibility
}

export interface AnnouncementInput {
    title: string
    description?: string
    scheduledAt: string // ISO date string
    personIds?: string[]
    productIds?: string[]
    personFilters?: PersonFilters
    productFilters?: ProductFilters
}

// ─── Resolve Audience ───────────────────────────────────────

async function resolvePersonIds(
    filters: PersonFilters,
    manualIds: string[]
): Promise<string[]> {
    if (filters.all) {
        const persons = await prisma.person.findMany({
            where: { isActive: true },
            select: { id: true },
        })
        return persons.map(p => p.id)
    }

    const conditions: any[] = []

    if (filters.typeIds?.length) {
        conditions.push({ personTypeId: { in: filters.typeIds } })
    }
    if (filters.groupNames?.length) {
        conditions.push({ groupName: { in: filters.groupNames } })
    }
    if (filters.tags?.length) {
        // Tags is stored as JSON array — filter persons containing any of the tags
        conditions.push({
            OR: filters.tags.map(tag => ({
                tags: { array_contains: tag },
            })),
        })
    }

    if (conditions.length > 0) {
        const persons = await prisma.person.findMany({
            where: { isActive: true, OR: conditions },
            select: { id: true },
        })
        const filtered = persons.map(p => p.id)
        // Merge with manually selected IDs (deduplicated)
        return [...new Set([...filtered, ...manualIds])]
    }

    return [...new Set(manualIds)]
}

async function resolveProductIds(
    filters: ProductFilters,
    manualIds: string[]
): Promise<string[]> {
    if (filters.all) {
        const products = await prisma.product.findMany({
            where: { isAvailable: true },
            select: { id: true },
        })
        return products.map(p => p.id)
    }

    const conditions: any[] = []

    if (filters.categoryIds?.length) {
        conditions.push({ categoryId: { in: filters.categoryIds } })
    }
    if (filters.tags?.length) {
        conditions.push({
            OR: filters.tags.map(tag => ({
                tags: { array_contains: tag },
            })),
        })
    }

    if (conditions.length > 0) {
        const products = await prisma.product.findMany({
            where: { isAvailable: true, OR: conditions },
            select: { id: true },
        })
        const filtered = products.map(p => p.id)
        return [...new Set([...filtered, ...manualIds])]
    }

    return [...new Set(manualIds)]
}

// ─── Preview Count ──────────────────────────────────────────

export async function previewAudience(
    personFilters: PersonFilters,
    manualPersonIds: string[],
    productFilters: ProductFilters,
    manualProductIds: string[]
) {
    return safeAction(async () => {
        const [personIds, productIds] = await Promise.all([
            resolvePersonIds(personFilters, manualPersonIds),
            resolveProductIds(productFilters, manualProductIds),
        ])
        return { personCount: personIds.length, productCount: productIds.length }
    }, 'تعذّر حساب الجمهور')
}

// ─── Read ───────────────────────────────────────────────────

export async function getAnnouncements() {
    return safeAction(
        () => prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' },
        }),
        'تعذّر جلب الإعلانات'
    )
}

export async function getAnnouncement(id: string) {
    return safeAction(
        () => prisma.announcement.findUnique({ where: { id } }),
        'تعذّر جلب الإعلان'
    )
}

// ─── Create ─────────────────────────────────────────────────

export async function createAnnouncement(data: AnnouncementInput) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()
        const userRes = await getCurrentUser()
        const userId = userRes.success ? (userRes.data as any)?.userId : null
        return prisma.announcement.create({
            data: {
                title:          data.title.trim(),
                description:    data.description?.trim() || null,
                scheduledAt:    new Date(data.scheduledAt),
                personIds:      (data.personIds      ?? []) as any,
                productIds:     (data.productIds     ?? []) as any,
                personFilters:  (data.personFilters  ?? {}) as any,
                productFilters: (data.productFilters ?? {}) as any,
                createdBy:      userId,
            },
        })
    }, PATHS, 'تعذّر إنشاء الإعلان')
}

// ─── Update ─────────────────────────────────────────────────

export async function updateAnnouncement(id: string, data: Partial<AnnouncementInput>) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()
        const updateData: any = {}
        if (data.title)          updateData.title          = data.title.trim()
        if (data.description !== undefined) updateData.description = data.description?.trim() || null
        if (data.scheduledAt)    updateData.scheduledAt    = new Date(data.scheduledAt)
        if (data.personIds)      updateData.personIds      = data.personIds
        if (data.productIds)     updateData.productIds     = data.productIds
        if (data.personFilters)  updateData.personFilters  = data.personFilters
        if (data.productFilters) updateData.productFilters = data.productFilters
        return prisma.announcement.update({ where: { id }, data: updateData })
    }, PATHS, 'تعذّر تحديث الإعلان')
}

// ─── Delete ─────────────────────────────────────────────────

export async function deleteAnnouncement(id: string) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()
        const ann = await prisma.announcement.findUnique({ where: { id } })
        if (ann?.status === 'sent') {
            throw new Error('لا يمكن حذف إعلان تم إرساله بالفعل')
        }
        await prisma.announcement.delete({ where: { id } })
        return null
    }, PATHS, 'تعذّر حذف الإعلان')
}

// ─── Execute ────────────────────────────────────────────────

export async function executeAnnouncement(id: string) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()

        const ann = await prisma.announcement.findUnique({ where: { id } })
        if (!ann) throw new Error('الإعلان غير موجود')
        if (ann.status === 'sent') throw new Error('تم إرسال هذا الإعلان مسبقاً')

        // Resolve final audience
        const [resolvedPersonIds, resolvedProductIds] = await Promise.all([
            resolvePersonIds(
                ann.personFilters as PersonFilters,
                ann.personIds as string[]
            ),
            resolveProductIds(
                ann.productFilters as ProductFilters,
                ann.productIds as string[]
            ),
        ])

        // Fetch full person details
        const persons = await prisma.person.findMany({
            where: { id: { in: resolvedPersonIds } },
            select: {
                id: true,
                name: true,
                groupName: true,
                groupNumber: true,
                contacts: { select: { type: true, value: true } },
            },
        })

        // Fetch full product details
        const products = await prisma.product.findMany({
            where: { id: { in: resolvedProductIds } },
            select: {
                id: true,
                name: true,
                itemNumber: true,
                description: true,
                variants: { select: { id: true, name: true, hex: true, variantNumber: true } },
            },
        })

        // Build payload
        const payload = {
            id: ann.id,
            title: ann.title,
            description: ann.description,
            scheduledAt: ann.scheduledAt.toISOString(),
            persons,
            products,
        }

        try {
            // Call ADS_API directly (same as batch sending)
            const adsApi = process.env.ADS_API
            if (!adsApi) throw new Error('ADS_API غير محدد في .env')

            const res = await fetch(adsApi, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) throw new Error(`API Error: ${res.status}`)

            // Update status
            await prisma.announcement.update({
                where: { id },
                data: {
                    status:    'sent',
                    sentAt:    new Date(),
                    sentCount: persons.length,
                },
            })

            return { sentCount: persons.length, productCount: products.length }
        } catch (err: any) {
            await prisma.announcement.update({
                where: { id },
                data: { status: 'failed' },
            })
            throw new Error(`فشل الإرسال: ${err.message}`)
        }
    }, PATHS, 'تعذّر تنفيذ الإعلان')
}

// ─── Batch Types ─────────────────────────────────────────────

export interface BatchEntry {
    index: number
    count: number
    status: 'pending' | 'sending' | 'sent' | 'failed'
    sentAt?: string
    error?: string
}

export interface BatchProgress {
    resolvedPersonIds: string[]
    totalPersons: number
    totalBatches: number
    currentBatch: number
    sentCount: number
    batches: BatchEntry[]
    nextBatchAt: string | null
    startedAt: string
}

// ─── Init Batch Execution ────────────────────────────────────

export async function initBatchExecution(
    id: string,
    batchSize: number,
    intervalMinutes: number
) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()

        const ann = await prisma.announcement.findUnique({ where: { id } })
        if (!ann) throw new Error('الإعلان غير موجود')
        if (ann.status === 'sent') throw new Error('تم إرسال هذا الإعلان مسبقاً')

        // Resolve full audience
        const personIds = await resolvePersonIds(
            ann.personFilters as PersonFilters,
            ann.personIds as string[]
        )
        const total = personIds.length
        if (total === 0) throw new Error('لا يوجد أشخاص لإرسال الإعلان إليهم')

        const totalBatches = Math.ceil(total / batchSize)
        const batches: BatchEntry[] = Array.from({ length: totalBatches }, (_, i) => ({
            index: i + 1,
            count: Math.min(batchSize, total - i * batchSize),
            status: 'pending',
        }))

        const progress: BatchProgress = {
            resolvedPersonIds: personIds,
            totalPersons: total,
            totalBatches,
            currentBatch: 0,
            sentCount: 0,
            batches,
            nextBatchAt: null,
            startedAt: new Date().toISOString(),
        }

        // Save plan to DB — client will drive the actual sends from mount
        await prisma.announcement.update({
            where: { id },
            data: {
                status:               'running',
                batchSize,
                batchIntervalMinutes: intervalMinutes,
                batchProgress:        progress as any,
            },
        })

        return { totalPersons: total, totalBatches }
    }, PATHS, 'تعذّر بدء الإرسال')
}

// ─── Process Next Batch ──────────────────────────────────────

export async function processBatch(id: string) {
    return safeActionWithRevalidation(async () => {
        const ann = await prisma.announcement.findUnique({ where: { id } })
        if (!ann) throw new Error('الإعلان غير موجود')
        if (ann.status !== 'running') throw new Error('الإعلان ليس في وضع التشغيل')

        const progress = ann.batchProgress as unknown as BatchProgress
        const nextIdx = progress.batches.findIndex(b => b.status === 'pending')
        if (nextIdx === -1) throw new Error('لا توجد دُفعات متبقية')

        // Fetch products once from already-resolved IDs stored in batchProgress
        // Fall back to re-resolving if not present (backward compat)
        const resolvedProductIds = progress.resolvedPersonIds
            ? await resolveProductIds(
                ann.productFilters as ProductFilters,
                ann.productIds as string[]
            )
            : []

        const products = await prisma.product.findMany({
            where: { id: { in: resolvedProductIds } },
            select: { id: true, name: true, itemNumber: true, description: true },
        })

        return _sendBatch(id, ann.title, ann.description, progress, products, nextIdx)
    }, PATHS, 'تعذّر إرسال الدُفعة')
}

// ─── Internal: Send a Single Batch ──────────────────────────

async function _sendBatch(
    announcementId: string,
    title: string,
    description: string | null,
    _progress: BatchProgress,  // used for typing; we always re-read from DB for freshness
    products: any[],
    batchIdx: number
) {
    const ann = await prisma.announcement.findUnique({ where: { id: announcementId } })
    if (!ann) throw new Error('الإعلان غير موجود')

    // Always use the freshest progress from DB to avoid stale-closures on resume
    const progress = (Object.keys(ann.batchProgress as object).length > 0
        ? ann.batchProgress
        : _progress) as unknown as BatchProgress

    const batchSize = ann.batchSize
    const start = batchIdx * batchSize
    const batchPersonIds = progress.resolvedPersonIds.slice(start, start + batchSize)

    // Fetch person details for this batch
    const persons = await prisma.person.findMany({
        where: { id: { in: batchPersonIds } },
        select: { id: true, name: true, groupName: true, contacts: { select: { type: true, value: true } } },
    })

    const payload = {
        announcementId,
        batchIndex: batchIdx + 1,
        totalBatches: progress.totalBatches,
        title,
        description,
        persons,
        products,
    }

    // Mark batch as sending
    const updatedBatches = [...progress.batches]
    updatedBatches[batchIdx] = { ...updatedBatches[batchIdx], status: 'sending' }

    await prisma.announcement.update({
        where: { id: announcementId },
        data: { batchProgress: { ...progress, batches: updatedBatches, currentBatch: batchIdx + 1 } as any },
    })

    try {
        const adsApi = process.env.ADS_API
        if (!adsApi) throw new Error('ADS_API غير محدد في .env')

        const res = await fetch(adsApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error(`API responded with ${res.status}`)

        const sentAt = new Date().toISOString()
        updatedBatches[batchIdx] = { ...updatedBatches[batchIdx], status: 'sent', sentAt }

        const newSentCount = progress.sentCount + persons.length
        const isLast = batchIdx + 1 >= progress.totalBatches
        const nextBatchAt = isLast
            ? null
            : new Date(Date.now() + ann.batchIntervalMinutes * 60 * 1000).toISOString()

        const newProgress: BatchProgress = {
            ...progress,
            batches: updatedBatches,
            currentBatch: batchIdx + 1,
            sentCount: newSentCount,
            nextBatchAt,
        }

        await prisma.announcement.update({
            where: { id: announcementId },
            data: {
                batchProgress: newProgress as any,
                sentCount: newSentCount,
                ...(isLast ? { status: 'sent', sentAt: new Date() } : {}),
            },
        })

        return {
            batchIndex: batchIdx + 1,
            sentCount: newSentCount,
            totalPersons: progress.totalPersons,
            isComplete: isLast,
            nextBatchAt,
        }
    } catch (err: any) {
        updatedBatches[batchIdx] = { ...updatedBatches[batchIdx], status: 'failed', error: err.message }
        await prisma.announcement.update({
            where: { id: announcementId },
            data: { batchProgress: { ...progress, batches: updatedBatches } as any },
        })
        throw err
    }
}

// ─── Get Progress (lightweight for polling) ──────────────────

export async function getAnnouncementProgress(id: string) {
    return safeAction(async () => {
        const ann = await prisma.announcement.findUnique({
            where: { id },
            select: {
                status: true,
                sentCount: true,
                batchSize: true,
                batchIntervalMinutes: true,
                batchProgress: true,
            },
        })
        if (!ann) throw new Error('الإعلان غير موجود')
        return ann
    }, 'تعذّر جلب التقدم')
}

// ─── Pause ───────────────────────────────────────────────────

export async function pauseBatchExecution(id: string) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()
        const ann = await prisma.announcement.findUnique({ where: { id } })
        if (!ann || ann.status !== 'running') throw new Error('الإعلان ليس في وضع التشغيل')
        await prisma.announcement.update({ where: { id }, data: { status: 'paused' } })
        return null
    }, PATHS, 'تعذّر إيقاف الإعلان')
}

// ─── Resume ──────────────────────────────────────────────────

export async function resumeBatchExecution(id: string) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()
        const ann = await prisma.announcement.findUnique({ where: { id } })
        if (!ann || ann.status !== 'paused') throw new Error('الإعلان ليس في وضع الإيقاف')
        await prisma.announcement.update({ where: { id }, data: { status: 'running' } })
        return null
    }, PATHS, 'تعذّر استئناف الإعلان')
}

// ─── Cancel ──────────────────────────────────────────────────

export async function cancelBatchExecution(id: string) {
    return safeActionWithRevalidation(async () => {
        await requireAdmin()
        await prisma.announcement.update({
            where: { id },
            data: { status: 'cancelled', batchProgress: {} as any },
        })
        return null
    }, PATHS, 'تعذّر إلغاء الإعلان')
}

// ─── Re-export resolve helpers (needed by detail page) ───────

export { resolvePersonIds, resolveProductIds }
