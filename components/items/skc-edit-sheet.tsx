"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { SkcForm } from "@/components/items/skc-form"
import type { SerializedSKUDetail } from "@/lib/types/skc"
import type { ProductOption } from "@/components/items/product-picker"

interface SkcEditSheetProps {
    sku: SerializedSKUDetail
    onUpdated: () => void
}

export function SkcEditSheet({ sku, onUpdated }: SkcEditSheetProps) {
    const [open, setOpen] = useState(false)
    const initialProduct: ProductOption = {
        id: sku.product.id,
        name: sku.product.name,
        productNumber: sku.product.productNumber,
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                    <Pencil className="h-3.5 w-3.5" />
                    تعديل الصنف
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>تعديل الصنف</SheetTitle>
                </SheetHeader>
                <div className="py-6">
                    <SkcForm
                        mode="edit"
                        skcId={sku.skc.id}
                        initialProduct={initialProduct}
                        productLocked
                        initialColorId={sku.skc.colorId}
                        initialItemNumber={sku.skc.itemNumber ?? ""}
                        initialAttributes={sku.skc.attributes ?? {}}
                        excludeColorIdFromUsed={sku.skc.colorId}
                        onSuccess={() => {
                            setOpen(false)
                            onUpdated()
                        }}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
