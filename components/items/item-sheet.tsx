"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { ItemForm } from "@/components/items/item-form"
import type { ProductOption } from "@/components/items/product-picker"
import { INVENTORY_LABELS } from "@/lib/config/inventory-labels"

interface ItemSheetProps {
    defaultProductId?: string
    defaultProductName?: string
    defaultProductNumber?: string | null
    trigger?: React.ReactNode
}

export function ItemSheet({
    defaultProductId,
    defaultProductName,
    defaultProductNumber,
    trigger,
}: ItemSheetProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [formKey, setFormKey] = useState(0)

    const initialProduct: ProductOption | null = defaultProductId
        ? {
            id: defaultProductId,
            name: defaultProductName ?? "",
            productNumber: defaultProductNumber ?? null,
        }
        : null

    function handleOpenChange(val: boolean) {
        setOpen(val)
        if (val) setFormKey(k => k + 1)
    }

    function handleSuccess({ id }: { id?: string }) {
        setOpen(false)
        if (id) router.push(`/items/${id}`)
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button className="gap-2 rounded-xl">
                        <Plus className="h-4 w-4" />
                        {INVENTORY_LABELS.addItem}
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{INVENTORY_LABELS.addItem}</SheetTitle>
                    <SheetDescription>
                        منتج + لون + مقاس في خطوة واحدة
                    </SheetDescription>
                </SheetHeader>
                <div className="py-6">
                    <ItemForm
                        key={formKey}
                        mode="create"
                        initialProduct={initialProduct}
                        productLocked={!!defaultProductId}
                        onSuccess={handleSuccess}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
