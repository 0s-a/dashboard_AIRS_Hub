import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Adding search_vector column...')
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Product" 
    ADD COLUMN IF NOT EXISTS search_vector tsvector 
    GENERATED ALWAYS AS (
        setweight(to_tsvector('arabic', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('arabic', coalesce(brand, '')), 'B') ||
        setweight(to_tsvector('arabic', coalesce("itemNumber", '')), 'A') ||
        setweight(to_tsvector('arabic', coalesce(description, '')), 'C')
    ) STORED;
  `)
  
  console.log('Adding index...')
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS product_search_vector_idx ON "Product" USING gin(search_vector);
  `)
  
  console.log('Generated column search_vector added successfully!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
