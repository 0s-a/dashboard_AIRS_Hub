"use client"

import { Switch } from "@/components/ui/switch"
import { toggleProductAvailability } from "@/lib/actions/inventory"
import { toast } from "sonner"
import { useState } from "react"

interface AvailabilityToggleProps {
    id: string
    isAvailable: boolean
    hasPrices: boolean
    hasUnits: boolean
}

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function AvailabilityToggle({ id, isAvailable: initialStatus, hasPrices, hasUnits }: AvailabilityToggleProps) {
    const [isAvailable, setIsAvailable] = useState(initialStatus)
    const canEnable = hasPrices && hasUnits

    const handleToggle = async (checked: boolean) => {
        // Optimistic update
        setIsAvailable(checked)

        const result = await toggleProductAvailability(id, !checked)

        if (!result.success) {
            // Revert on failure
            setIsAvailable(!checked)
            toast.error("فشل تحديث الحالة")
        } else {
            toast.success(checked ? "المنتج متاح الآن" : "المنتج غير متاح")
        }
    }

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 w-fit">
                        <Switch
                            checked={isAvailable}
                            onCheckedChange={handleToggle}
                            disabled={!canEnable}
                        />
                        <span className={`text-sm ${isAvailable ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                            {isAvailable ? "متاح" : "نفذت الكمية"}
                        </span>
                    </div>
                </TooltipTrigger>
                {!canEnable && (
                    <TooltipContent>
                        <p>لا يمكن الإتاحة: يجب إضافة وحدة قياس وتسعيرة أولاً</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    )
}
