"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { UnitForm } from "./unit-form"
import { UnitRow } from "./columns"

interface UnitSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    unit?: UnitRow
}

export function UnitSheet({ open, onOpenChange, unit }: UnitSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-3 text-xl font-bold">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            {unit ? <span className="text-primary text-xl">📝</span> : <span className="text-primary text-xl">✨</span>}
                        </div>
                        {unit ? "تعديل الوحدة" : "إضافة وحدة جديدة"}
                    </SheetTitle>
                    <SheetDescription>
                        {unit
                            ? `تعديل بيانات وحدة "${unit.name}"`
                            : "أضف وحدة جديدة مثل حبة، كرتون، درزن... يتم ترقيمها تلقائياً"}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                    <UnitForm
                        unit={unit}
                        onSuccess={() => onOpenChange(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    )
}
