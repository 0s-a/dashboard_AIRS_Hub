"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import dynamic from "next/dynamic"
const CustomerForm = dynamic(() => import("./customer-form").then(m => ({ default: m.CustomerForm })), { ssr: false })
import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Customer } from "@prisma/client"

interface CustomerSheetProps {
    customer?: Customer
    mode?: 'create' | 'edit'
    trigger?: React.ReactNode
}

export const CustomerSheet = React.memo(function CustomerSheet({ customer, mode = 'edit', trigger }: CustomerSheetProps) {
    const [open, setOpen] = useState(false)
    const isCreate = mode === 'create' || !customer

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">{isCreate ? 'إضافة عميل' : 'تعديل'}</span>
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>
                        {isCreate ? 'إضافة عميل جديد' : 'تعديل بيانات العميل'}
                    </SheetTitle>
                    <SheetDescription>
                        {isCreate
                            ? 'أدخل بيانات العميل الجديد وأضفه إلى قاعدة البيانات.'
                            : 'تحديث تفاصيل العميل في قاعدة البيانات.'}
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    <CustomerForm customer={customer} onSuccess={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
});
