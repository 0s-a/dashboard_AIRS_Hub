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
const PersonForm = dynamic(() => import("./person-form").then(m => ({ default: m.PersonForm })), { ssr: false })
import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Person } from "@prisma/client"

interface PersonSheetProps {
    person: Person
    trigger?: React.ReactNode
}

export const PersonSheet = React.memo(function PersonSheet({ person, trigger }: PersonSheetProps) {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <span className="sr-only">تعديل</span>
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>تعديل بيانات الشخص</SheetTitle>
                    <SheetDescription>
                        تحديث تفاصيل الشخص في قاعدة البيانات.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    <PersonForm person={person} onSuccess={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
});
