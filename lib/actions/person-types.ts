'use server'

import { prisma } from '@/lib/prisma'
import { safeAction, safeActionWithRevalidation } from '@/lib/action-utils'

const PATHS = '/person-types'

export async function getPersonTypes() {
    return safeAction(
        () => prisma.personType.findMany({ orderBy: { name: 'asc' } }),
        'تعذّر جلب أنواع الأشخاص'
    )
}

export async function getPersonTypeById(id: string) {
    return safeAction(
        () => prisma.personType.findUnique({ where: { id } }),
        'تعذّر جلب نوع الشخص'
    )
}

export async function createPersonType(data: { name: string }) {
    return safeActionWithRevalidation(
        () => prisma.personType.create({ data: { name: data.name } }),
        PATHS,
        'تعذّر إنشاء نوع الشخص'
    )
}

export async function updatePersonType(id: string, data: { name?: string }) {
    return safeActionWithRevalidation(
        () => prisma.personType.update({
            where: { id },
            data: { name: data.name },
        }),
        PATHS,
        'تعذّر تعديل نوع الشخص'
    )
}
