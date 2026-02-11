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
import { Plus, Edit } from "lucide-react"
import { Product } from "@prisma/client"

interface ProductSheetProps {
    product?: Product
    trigger?: React.ReactNode
}

export function ProductSheet({ product, trigger }: ProductSheetProps) {
    const [open, setOpen] = useState(false)

    return (
        <Sheet  open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button className="rounded-xl shadow-lg shadow-primary/20">
                        <Plus className="ml-2 h-4 w-4" /> إضافة منتج
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="p-3 overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{product ? "تعديل المنتج" : "إضافة منتج جديد"}</SheetTitle>
                    <SheetDescription>
                        {product
                            ? "قم بإجراء التعديلات اللازمة على تفاصيل المنتج هنا."
                            : "أضف منتجاً جديداً إلى مخزونك بكل تفاصيله."}
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    <ProductForm product={product} onSuccess={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
