import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Use raw query to avoid Prisma Client constraint checks during update
  await prisma.$executeRaw`UPDATE "Announcement" SET "templateId" = NULL;`
  console.log('Successfully set templateId to NULL in all Announcements.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
