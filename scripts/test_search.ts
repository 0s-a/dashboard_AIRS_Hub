import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const query = 'صبغات'
  const result = await prisma.$queryRawUnsafe(`
    SELECT id, name, ts_rank(search_vector, websearch_to_tsquery('arabic', $1)) AS rank
    FROM "Product"
    WHERE search_vector @@ websearch_to_tsquery('arabic', $1)
    ORDER BY rank DESC
    LIMIT 5
  `, query)
  
  console.log('Search Results:', result)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
