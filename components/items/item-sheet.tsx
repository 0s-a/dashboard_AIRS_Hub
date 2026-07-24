"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { ItemForm } from "./item-form"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { SerializedItem } from "@/lib/types/item"

interface ItemSheetProps {
    item?: SerializedItem
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function ItemSheet({ item, trigger, onSuccess }: ItemSheetProps) {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button className="rounded-xl shadow-lg shadow-primary/20">
                        <Plus className="ml-2 h-4 w-4" /> إضافة صنف
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent
                side="left"
                className={`overflow-y-auto ${item ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
            >
                <SheetHeader>
                    <SheetTitle>{item ? "تعديل الصنف" : "إضافة صنف جديد"}</SheetTitle>
                    <SheetDescription>
                        {item
                            ? "قم بإجراء التعديلات اللازمة على تفاصيل الصنف هنا."
                            : "أدخل بيانات الصنف — منتج، اسم مستقل، وصفات اختيارية."}
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    <ItemForm
                        item={item}
                        onSuccess={() => {
                            setOpen(false)
                            onSuccess?.()
                        }}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
