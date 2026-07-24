"use client"

import { useTransition } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { toggleItemNewTag } from "@/lib/actions/items"
import { toast } from "sonner"

interface NewTagToggleProps {
    itemId: string
    isNew: boolean
}

export function NewTagToggle({ itemId, isNew }: NewTagToggleProps) {
    const [isPending, startTransition] = useTransition()

    const handleCheckedChange = (checked: boolean) => {
        startTransition(async () => {
            const res = await toggleItemNewTag(itemId, checked)
            if (res.success) {
                toast.success(checked ? "تم إضافة علامة جديد للصنف" : "تم إزالة علامة جديد من الصنف")
            } else {
                toast.error(res.error || "حدث خطأ أثناء التحديث")
            }
        })
    }

    return (
        <div className="flex items-center justify-center">
            <Checkbox
                checked={isNew}
                onCheckedChange={handleCheckedChange}
                disabled={isPending}
                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
        </div>
    )
}
