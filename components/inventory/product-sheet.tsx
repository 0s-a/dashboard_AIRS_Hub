"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { ProductForm } from "./product-form"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { SerializedProduct } from "@/lib/actions/inventory"

interface ProductSheetProps {
    product?: SerializedProduct
    trigger?: React.ReactNode
}

export function ProductSheet({ product, trigger }: ProductSheetProps) {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button className="rounded-xl shadow-lg shadow-primary/20">
                        <Plus className="ml-2 h-4 w-4" /> إضافة منتج
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent
                side="left"
                className={`overflow-y-auto ${product ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
            >
                <SheetHeader>
                    <SheetTitle>{product ? "تعديل المنتج" : "إضافة منتج جديد"}</SheetTitle>
                    <SheetDescription>
                        {product
                            ? "قم بإجراء التعديلات اللازمة على تفاصيل المنتج هنا."
                            : "أدخل بيانات المنتج واختر نوع المواصفة والألوان — الأصناف تُضاف من صفحة الأصناف."}
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    <ProductForm product={product} onSuccess={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
