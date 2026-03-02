"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { PersonTypeForm } from "./person-type-form"

interface PersonType {
    id: string
    name: string
    description: string | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
}

interface PersonTypeSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    personType?: PersonType
}

export function PersonTypeSheet({ open, onOpenChange, personType }: PersonTypeSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>
                        {personType ? "تعديل النوع" : "إضافة نوع جديد"}
                    </SheetTitle>
                    <SheetDescription>
                        {personType
                            ? "قم بتحديث بيانات النوع"
                            : "أضف نوع شخص جديد"}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                    <PersonTypeForm
                        personType={personType}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
