"use client"

import { useTransition } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { toggleProductNewTag } from "@/lib/actions/inventory"
import { toast } from "sonner"

interface NewTagToggleProps {
    productId: string
    isNew: boolean
}

export function NewTagToggle({ productId, isNew }: NewTagToggleProps) {
    const [isPending, startTransition] = useTransition()

    const handleCheckedChange = (checked: boolean) => {
        startTransition(async () => {
            const res = await toggleProductNewTag(productId, checked)
            if (res.success) {
                toast.success(checked ? "تم إضافة علامة جديد للمنتج" : "تم إزالة علامة جديد من المنتج")
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
