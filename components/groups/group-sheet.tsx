"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { GroupForm } from "./group-form"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Group } from "@prisma/client"

interface GroupSheetProps {
    group?: Group
    trigger?: React.ReactNode
}

export function GroupSheet({ group: initialGroup, trigger }: GroupSheetProps) {
    const [open, setOpen] = useState(false)
    const [group, setGroup] = useState<Group | undefined>(initialGroup)

    useEffect(() => {
        setGroup(initialGroup)
    }, [initialGroup])

    useEffect(() => {
        const handleEdit = (e: CustomEvent<Group>) => {
            setGroup(e.detail)
            setOpen(true)
        }

        window.addEventListener("edit-group", handleEdit as EventListener)
        return () => {
            window.removeEventListener("edit-group", handleEdit as EventListener)
        }
    }, [])

    return (
        <Sheet open={open} onOpenChange={(val) => {
            if (!val) {
                // When closing without saving, reset to initial or undefined
                setTimeout(() => setGroup(initialGroup), 300)
            }
            setOpen(val)
        }}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button className="rounded-xl shadow-lg shadow-primary/20">
                        <Plus className="ml-2 h-4 w-4" /> إضافة مجموعة
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{group ? "تعديل بيانات المجموعة" : "إضافة مجموعة جديدة"}</SheetTitle>
                    <SheetDescription>
                        {group
                            ? "تحديث تفاصيل المجموعة في قاعدة البيانات."
                            : "أضف مجموعة جديدة لتصنيف الأشخاص بسهولة."}
                    </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                    <GroupForm group={group} onSuccess={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    )
}
