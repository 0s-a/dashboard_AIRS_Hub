"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { PersonForm } from "./person-form"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Edit } from "lucide-react"
import { Person } from "@prisma/client"

interface PersonSheetProps {
    person?: Person
    trigger?: React.ReactNode
}

export function PersonSheet({ person, trigger }: PersonSheetProps) {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button className="rounded-xl shadow-lg shadow-primary/20">
                        <Plus className="ml-2 h-4 w-4" /> إضافة شخص
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{person ? "تعديل بيانات الشخص" : "إضافة شخص جديد"}</SheetTitle>
                    <SheetDescription>
                        {person
                            ? "تحديث تفاصيل الشخص في قاعدة البيانات."
                            : "أضف شخصاً جديداً لمتجرك لمتابعة نشاطه."}
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    <PersonForm person={person} onSuccess={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
