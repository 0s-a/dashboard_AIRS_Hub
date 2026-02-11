"use client"

import { Switch } from "@/components/ui/switch"
import { toggleProductAvailability } from "@/lib/actions/inventory"
import { toast } from "sonner"
import { useState } from "react"

interface AvailabilityToggleProps {
    id: string
    isAvailable: boolean
}

export function AvailabilityToggle({ id, isAvailable: initialStatus }: AvailabilityToggleProps) {
    const [isAvailable, setIsAvailable] = useState(initialStatus)

    const handleToggle = async (checked: boolean) => {
        // Optimistic update
        setIsAvailable(checked)

        const result = await toggleProductAvailability(id, isAvailable)

        if (!result.success) {
            // Revert on failure
            setIsAvailable(!checked)
            toast.error("فشل تحديث الحالة")
        } else {
            toast.success(checked ? "المنتج متاح الآن" : "المنتج غير متاح")
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Switch
                checked={isAvailable}
                onCheckedChange={handleToggle}
            />
            <span className={`text-sm ${isAvailable ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                {isAvailable ? "متاح" : "نفذت الكمية"}
            </span>
        </div>
    )
}
