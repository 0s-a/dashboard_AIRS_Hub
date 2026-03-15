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

export async function createPersonType(data: {
    name: string
    description?: string | null
    color?: string | null
    icon?: string | null
    notes?: string | null
    isDefault?: boolean
}) {
    return safeActionWithRevalidation(
        async () => {
            if (data.isDefault) {
                await prisma.personType.updateMany({
                    where: { isDefault: true },
                    data: { isDefault: false },
                })
            }
            return prisma.personType.create({
                data: {
                    name: data.name,
                    description: data.description,
                    color: data.color,
                    icon: data.icon,
                    notes: data.notes,
                    isDefault: data.isDefault || false,
                },
            })
        },
        PATHS,
        'تعذّر إنشاء نوع الشخص'
    )
}

export async function updatePersonType(id: string, data: {
    name?: string
    description?: string | null
    color?: string | null
    icon?: string | null
    notes?: string | null
    isDefault?: boolean
}) {
    return safeActionWithRevalidation(
        async () => {
            if (data.isDefault) {
                await prisma.personType.updateMany({
                    where: { id: { not: id }, isDefault: true },
                    data: { isDefault: false },
                })
            }
            return prisma.personType.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                    color: data.color,
                    icon: data.icon,
                    notes: data.notes,
                    ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
                },
            })
        },
        PATHS,
        'تعذّر تعديل نوع الشخص'
    )
}
