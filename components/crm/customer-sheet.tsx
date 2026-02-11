"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { CustomerForm } from "./customer-form"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Edit } from "lucide-react"
import { Customer } from "@prisma/client"
import { Product } from "@prisma/client"

interface CustomerSheetProps {
    customer?: Customer
    trigger?: React.ReactNode
}

export function CustomerSheet({ customer, trigger }: CustomerSheetProps) {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button className="rounded-xl shadow-lg shadow-primary/20">
                        <Plus className="ml-2 h-4 w-4" /> إضافة عميل
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{customer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}</SheetTitle>
                    <SheetDescription>
                        {customer
                            ? "تحديث تفاصيل العميل في قاعدة البيانات."
                            : "أضف عميلاً جديداً لمتجرك لمتابعة نشاطه."}
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    <CustomerForm customer={customer} onSuccess={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
