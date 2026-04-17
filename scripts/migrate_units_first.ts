/**
 * Migration script: Prepare data for units-first pricing architecture.
 * 
 * Steps:
 * 1. Rename Unit.quantity → Unit.baseMultiplier + set defaults
 * 2. Ensure all ProductPrice rows have a unitId (default to "حبة")
 * 3. Create ProductUnit records from existing ProductPrice.unitId
 * 4. Drop old columns (quantity, tiers) from ProductPrice
 * 5. Update unique constraint
 * 
 * Run BEFORE prisma db push: npx tsx scripts/migrate_units_first.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Starting units-first migration...\n')

    // 1. Rename quantity → baseMultiplier on Unit table
    console.log('📦 Step 1: Rename Unit.quantity → baseMultiplier...')
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "Unit" RENAME COLUMN "quantity" TO "baseMultiplier"`)
        console.log('   ✅ Renamed column')
    } catch (e: any) {
        if (e.message?.includes('does not exist') || e.code === '42703') {
            console.log('   ⏭️  Column already renamed')
        } else {
            throw e
        }
    }
    
    // Set NOT NULL with default
    await prisma.$executeRawUnsafe(`ALTER TABLE "Unit" ALTER COLUMN "baseMultiplier" SET DEFAULT 1`)
    await prisma.$executeRawUnsafe(`UPDATE "Unit" SET "baseMultiplier" = 1 WHERE "baseMultiplier" IS NULL`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Unit" ALTER COLUMN "baseMultiplier" SET NOT NULL`)
    
    // Set known multipliers
    await prisma.$executeRawUnsafe(`UPDATE "Unit" SET "baseMultiplier" = 1 WHERE LOWER(name) = 'حبة'`)
    await prisma.$executeRawUnsafe(`UPDATE "Unit" SET "baseMultiplier" = 12 WHERE LOWER(name) = 'درزن'`)
    console.log('   ✅ Set baseMultiplier defaults (حبة=1, درزن=12)')

    // 2. Ensure "حبة" unit exists and get its ID
    console.log('\n📦 Step 2: Ensure base unit "حبة" exists...')
    let baseUnit = await prisma.$queryRawUnsafe<{id: string}[]>(`SELECT id FROM "Unit" WHERE name = 'حبة' LIMIT 1`)
    let baseUnitId: string
    
    if (baseUnit.length === 0) {
        // Create it
        const lastItem = await prisma.$queryRawUnsafe<{itemNumber: string}[]>(
            `SELECT "itemNumber" FROM "Unit" ORDER BY "itemNumber" DESC LIMIT 1`
        )
        const nextNum = lastItem.length > 0 ? parseInt(lastItem[0].itemNumber, 10) + 1 : 1
        const itemNumber = String(nextNum).padStart(4, '0')
        
        await prisma.$executeRawUnsafe(
            `INSERT INTO "Unit" (id, "itemNumber", name, "baseMultiplier", "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, 'حبة', 1, true, NOW(), NOW())`,
            itemNumber
        )
        const newUnit = await prisma.$queryRawUnsafe<{id: string}[]>(`SELECT id FROM "Unit" WHERE name = 'حبة' LIMIT 1`)
        baseUnitId = newUnit[0].id
        console.log(`   ✅ Created "حبة" unit: ${baseUnitId}`)
    } else {
        baseUnitId = baseUnit[0].id
        console.log(`   ✅ Found "حبة" unit: ${baseUnitId}`)
    }

    // 3. Fix all ProductPrice rows that have NULL unitId → set to "حبة"
    console.log('\n📦 Step 3: Assign "حبة" to ProductPrice rows without unitId...')
    const updated = await prisma.$executeRawUnsafe(
        `UPDATE "ProductPrice" SET "unitId" = $1 WHERE "unitId" IS NULL`, 
        baseUnitId
    )
    console.log(`   ✅ Updated ${updated} rows`)

    // 4. Handle duplicate unique constraint violations before changing it
    // Old constraint: (productId, priceLabelId, currencyId)
    // New constraint: (productId, priceLabelId, currencyId, unitId)
    // Since we just set all NULL unitIds to the same value, there shouldn't be new duplicates
    // But let's check
    console.log('\n📦 Step 4: Check for constraint conflicts...')
    const dupes = await prisma.$queryRawUnsafe<{cnt: bigint}[]>(`
        SELECT COUNT(*) as cnt FROM (
            SELECT "productId", "priceLabelId", "currencyId", "unitId", COUNT(*) as c
            FROM "ProductPrice"
            GROUP BY "productId", "priceLabelId", "currencyId", "unitId"
            HAVING COUNT(*) > 1
        ) sub
    `)
    const dupeCount = Number(dupes[0]?.cnt || 0)
    if (dupeCount > 0) {
        console.log(`   ⚠️  Found ${dupeCount} duplicate groups — removing extras`)
        await prisma.$executeRawUnsafe(`
            DELETE FROM "ProductPrice" WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (
                        PARTITION BY "productId", "priceLabelId", "currencyId", "unitId" 
                        ORDER BY "createdAt" ASC
                    ) as rn
                    FROM "ProductPrice"
                ) sub WHERE rn > 1
            )
        `)
    } else {
        console.log('   ✅ No duplicates found')
    }

    // 5. Drop old unique constraint, create new one
    console.log('\n📦 Step 5: Update unique constraint...')
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "ProductPrice" DROP CONSTRAINT IF EXISTS "ProductPrice_productId_priceLabelId_currencyId_key"`)
        console.log('   ✅ Old constraint dropped')
    } catch { console.log('   ⏭️  Old constraint already gone') }

    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_priceLabelId_currencyId_unitId_key" UNIQUE ("productId", "priceLabelId", "currencyId", "unitId")`)
        console.log('   ✅ New constraint created')
    } catch { console.log('   ⏭️  New constraint already exists') }

    // 6. Make unitId NOT NULL
    console.log('\n📦 Step 6: Make unitId NOT NULL...')
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProductPrice" ALTER COLUMN "unitId" SET NOT NULL`)
    console.log('   ✅ unitId is now NOT NULL')

    // 7. Add isAutoCalculated column
    console.log('\n📦 Step 7: Add isAutoCalculated column...')
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "ProductPrice" ADD COLUMN "isAutoCalculated" BOOLEAN NOT NULL DEFAULT false`)
        console.log('   ✅ Added isAutoCalculated')
    } catch { console.log('   ⏭️  Column already exists') }

    // 8. Convert Float → Decimal
    console.log('\n📦 Step 8: Convert Float → Decimal...')
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProductPrice" ALTER COLUMN "value" TYPE DECIMAL(12,2)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "OrderItem" ALTER COLUMN "unitPrice" TYPE DECIMAL(12,2)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ALTER COLUMN "totalAmount" TYPE DECIMAL(12,2)`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "Variant" ALTER COLUMN "price" TYPE DECIMAL(12,2)`)
    console.log('   ✅ All price columns converted to Decimal(12,2)')

    // 9. Drop old columns from ProductPrice
    console.log('\n📦 Step 9: Drop legacy columns...')
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "ProductPrice" DROP COLUMN IF EXISTS "quantity"`) } catch {}
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "ProductPrice" DROP COLUMN IF EXISTS "tiers"`) } catch {}
    console.log('   ✅ Dropped quantity and tiers')

    // 10. Create ProductUnit table
    console.log('\n📦 Step 10: Create ProductUnit table...')
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ProductUnit" (
            "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
            "productId" TEXT NOT NULL,
            "unitId" TEXT NOT NULL,
            "isBase" BOOLEAN NOT NULL DEFAULT false,
            "order" INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "ProductUnit_productId_unitId_key" UNIQUE ("productId", "unitId"),
            CONSTRAINT "ProductUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
            CONSTRAINT "ProductUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE
        )
    `)
    console.log('   ✅ ProductUnit table created')

    // 11. Populate ProductUnit from existing ProductPrice data
    console.log('\n📦 Step 11: Populate ProductUnit from existing prices...')
    const inserted = await prisma.$executeRawUnsafe(`
        INSERT INTO "ProductUnit" (id, "productId", "unitId", "isBase", "order")
        SELECT gen_random_uuid(), pp."productId", pp."unitId", 
               CASE WHEN u."baseMultiplier" = 1 THEN true ELSE false END,
               u."baseMultiplier"
        FROM (SELECT DISTINCT "productId", "unitId" FROM "ProductPrice") pp
        JOIN "Unit" u ON u.id = pp."unitId"
        ON CONFLICT DO NOTHING
    `)
    console.log(`   ✅ Inserted ${inserted} ProductUnit records`)

    // 12. Change FK constraint on ProductPrice.unitId from SetNull to Restrict
    console.log('\n📦 Step 12: Update FK constraint on unitId...')
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "ProductPrice" DROP CONSTRAINT IF EXISTS "ProductPrice_unitId_fkey"`)
        await prisma.$executeRawUnsafe(`ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE`)
        console.log('   ✅ FK constraint updated to RESTRICT')
    } catch { console.log('   ⏭️  FK constraint already correct') }

    console.log('\n✅ Migration complete!')
}

main()
    .catch(e => { console.error('❌ Migration failed:', e); process.exit(1) })
    .finally(() => prisma.$disconnect())
