/**
 * migrate-image-paths.mjs
 * 
 * Migrates image paths in the database from full URL paths (e.g. "/uploads/products/...")
 * to sub-paths only (e.g. "products/...").
 * 
 * Uses Prisma client — no extra dependencies needed.
 * 
 * Usage: npx tsx scripts/migrate-image-paths.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('✓ Connected to database\n')

    // ── Pre-migration counts ──────────────────────────────────────────────────
    console.log('═══ PRE-MIGRATION STATUS ═══')

    const totalMedia = await prisma.mediaImage.count()
    console.log(`MediaImage total: ${totalMedia}`)

    const withPrefix = await prisma.mediaImage.count({
        where: { url: { startsWith: '/uploads/' } }
    })
    console.log(`MediaImage with /uploads/ prefix: ${withPrefix}`)

    const samples = await prisma.mediaImage.findMany({ take: 3, select: { url: true } })
    console.log('Sample URLs:', samples.map(s => s.url))

    const store = await prisma.storeSettings.findUnique({ where: { id: 'default' }, select: { logo: true, favicon: true } })
    console.log('StoreSettings logo:', store?.logo ?? '(none)')

    const brands = await prisma.brand.findMany({ where: { logo: { not: null } }, take: 3, select: { name: true, logo: true } })
    console.log('Brands with logos:', brands.map(b => `${b.name}: ${b.logo}`))

    // ── Execute migration ─────────────────────────────────────────────────────
    console.log('\n═══ EXECUTING MIGRATION ═══')

    const r1 = await prisma.$executeRawUnsafe(
        `UPDATE "MediaImage" SET url = REPLACE(url, '/uploads/', '') WHERE url LIKE '/uploads/%'`
    )
    console.log(`✓ MediaImage updated: ${r1} rows`)

    const r2 = await prisma.$executeRawUnsafe(
        `UPDATE "StoreSettings" SET logo = REGEXP_REPLACE(logo, '^/uploads/', '') WHERE logo LIKE '/uploads/%'`
    )
    console.log(`✓ StoreSettings.logo updated: ${r2} rows`)

    const r3 = await prisma.$executeRawUnsafe(
        `UPDATE "StoreSettings" SET favicon = REGEXP_REPLACE(favicon, '^/uploads/', '') WHERE favicon LIKE '/uploads/%'`
    )
    console.log(`✓ StoreSettings.favicon updated: ${r3} rows`)

    const r4 = await prisma.$executeRawUnsafe(
        `UPDATE "Brand" SET logo = REGEXP_REPLACE(logo, '^/uploads/', '') WHERE logo LIKE '/uploads/%'`
    )
    console.log(`✓ Brand.logo updated: ${r4} rows`)

    // ── Post-migration verification ───────────────────────────────────────────
    console.log('\n═══ POST-MIGRATION VERIFICATION ═══')

    const mediaPost = await prisma.mediaImage.count({
        where: { url: { startsWith: '/uploads/' } }
    })
    console.log(`MediaImage with /uploads/ prefix: ${mediaPost} (should be 0)`)

    const samplesPost = await prisma.mediaImage.findMany({ take: 3, select: { url: true } })
    console.log('Sample URLs after migration:', samplesPost.map(s => s.url))

    console.log('\n✅ Migration complete!')
}

main()
    .catch(err => {
        console.error('Migration failed:', err)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
