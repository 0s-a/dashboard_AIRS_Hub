import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
    prismaModelStamp: string | undefined
}

/** Changes when models are added/renamed — invalidates stale HMR singletons after `prisma generate`. */
const MODEL_STAMP = Object.keys(Prisma.ModelName).sort().join(',')

function createPrismaClient() {
    return new PrismaClient()
}

function getPrismaClient(): PrismaClient {
    if (
        globalForPrisma.prisma &&
        globalForPrisma.prismaModelStamp === MODEL_STAMP
    ) {
        return globalForPrisma.prisma
    }

    void globalForPrisma.prisma?.$disconnect().catch(() => {})
    const client = createPrismaClient()

    if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = client
        globalForPrisma.prismaModelStamp = MODEL_STAMP
    }

    return client
}

export const prisma = getPrismaClient()
