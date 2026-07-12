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
import { ItemForm } from "@/components/items/item-form"
import type { SerializedItemDetail } from "@/lib/types/item"
import type { ProductOption } from "@/components/items/product-picker"
import { INVENTORY_LABELS } from "@/lib/config/inventory-labels"

interface ItemEditSheetProps {
    item: SerializedItemDetail
    onUpdated: () => void
}

export function ItemEditSheet({ item, onUpdated }: ItemEditSheetProps) {
    const [open, setOpen] = useState(false)
    const initialProduct: ProductOption = {
        id: item.product.id,
        name: item.product.name,
        productNumber: item.product.productNumber,
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                    <Pencil className="h-3.5 w-3.5" />
                    {INVENTORY_LABELS.editItem}
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{INVENTORY_LABELS.editItem}</SheetTitle>
                </SheetHeader>
                <div className="py-6">
                    <ItemForm
                        mode="edit"
                        itemId={item.id}
                        initialProduct={initialProduct}
                        productLocked
                        initialColorId={item.colorId}
                        initialItemNumber={item.itemNumber ?? ""}
                        initialSizeLabel={item.sizeLabel ?? ""}
                        initialAttributes={item.attributes ?? {}}
                        initialSkuSpecKind={item.product.skuSpecKind}
                        excludeColorIdFromUsed={item.colorId}
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
