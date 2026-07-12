import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function InventoryIdRedirect({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const sku = await prisma.sKU.findFirst({
        where: { skc: { productId: id } },
        orderBy: [{ skc: { order: "asc" } }, { order: "asc" }],
        select: { id: true },
    })
    if (sku) redirect(`/items/${sku.id}`)
    redirect(`/items?productId=${id}`)
}
