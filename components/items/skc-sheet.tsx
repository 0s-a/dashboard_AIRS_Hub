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
import { SkcForm } from "@/components/items/skc-form"
import type { ProductOption } from "@/components/items/product-picker"

interface SkcSheetProps {
    defaultProductId?: string
    defaultProductName?: string
    defaultProductNumber?: string | null
    trigger?: React.ReactNode
}

export function SkcSheet({
    defaultProductId,
    defaultProductName,
    defaultProductNumber,
    trigger,
}: SkcSheetProps) {
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

    function handleSuccess({ skuId }: { skuId?: string }) {
        setOpen(false)
        if (skuId) router.push(`/items/${skuId}`)
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button className="gap-2 rounded-xl">
                        <Plus className="h-4 w-4" />
                        إضافة صنف
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>إضافة صنف</SheetTitle>
                    <SheetDescription>
                        اختر المنتج واللون — يُنشأ مقاس افتراضي تلقائياً
                    </SheetDescription>
                </SheetHeader>
                <div className="py-6">
                    <SkcForm
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
