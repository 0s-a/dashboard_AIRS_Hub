/**
 * One-time migration: Category.code 3 chars → 2 chars
 *
 * Run after applying migration:
 *   npx tsx prisma/scripts/migrate-category-codes.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_LENGTH = 2
const PATTERN = /^[A-Z0-9]{2}$/

function candidates(oldCode: string): string[] {
    const upper = oldCode.toUpperCase()
    const result: string[] = []

    if (upper.length >= TARGET_LENGTH) {
        result.push(upper.slice(0, TARGET_LENGTH))
        if (upper.length >= 3) {
            const alt = upper.slice(1, 3)
            if (!result.includes(alt)) result.push(alt)
        }
    }

    return result
}

async function main() {
    const categories = await prisma.category.findMany({
        orderBy: { createdAt: 'asc' },
    })

    const assigned = new Set<string>()
    const mapping = new Map<string, string>()
    const conflicts: { id: string; name: string; oldCode: string }[] = []

    for (const cat of categories) {
        const oldCode = cat.code.toUpperCase()
        let newCode: string | null = null

        if (PATTERN.test(oldCode) && !assigned.has(oldCode)) {
            newCode = oldCode
        } else if (!PATTERN.test(oldCode) || assigned.has(oldCode)) {
            for (const candidate of candidates(oldCode)) {
                if (!assigned.has(candidate)) {
                    newCode = candidate
                    break
                }
            }
        }

        if (!newCode) {
            conflicts.push({ id: cat.id, name: cat.name, oldCode: cat.code })
            continue
        }

        assigned.add(newCode)
        if (newCode !== cat.code) {
            mapping.set(cat.id, newCode)
        }
    }

    if (conflicts.length > 0) {
        console.error('❌ تعارضات — يُرجى تعديل التصنيفات يدوياً ثم إعادة التشغيل:')
        for (const c of conflicts) {
            console.error(`   • ${c.name} (${c.oldCode})`)
        }
        process.exit(1)
    }

    const codeMap = new Map<string, string>()
    for (const cat of categories) {
        const newCode = mapping.get(cat.id) ?? cat.code
        if (cat.code !== newCode) {
            codeMap.set(cat.code, newCode)
        }
    }

    const needsUpdate = categories.filter((c) => mapping.has(c.id))

    if (needsUpdate.length === 0 && codeMap.size === 0) {
        console.log('✅ جميع أكواد التصنيفات بالفعل بخانتين — لا حاجة للترحيل.')
        return
    }

    await prisma.$transaction(async (tx) => {
        for (const cat of needsUpdate) {
            await tx.category.update({
                where: { id: cat.id },
                data: { code: `_${cat.id.slice(0, 8)}` },
            })
        }

        for (const cat of needsUpdate) {
            await tx.category.update({
                where: { id: cat.id },
                data: { code: mapping.get(cat.id)! },
            })
        }
    })

    console.log(`✅ تم ترحيل ${needsUpdate.length} كود تصنيف.`)
    if (codeMap.size > 0) {
        console.log('   الخريطة:')
        for (const [oldCode, newCode] of codeMap) {
            console.log(`   ${oldCode} → ${newCode}`)
        }
    }
}

main()
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
