"use client"

import { Badge } from "@/components/ui/badge"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface AltNameBadgeGroupProps {
    names: string[]
    /** Max badges to show before collapsing into a "+N" badge. Default: 2 */
    maxVisible?: number
}

/**
 * Displays a product's alternative names as compact badges.
 * Shows up to `maxVisible` badges then a "+N more" badge.
 * Hovering reveals the full list in a tooltip.
 */
export function AltNameBadgeGroup({
    names,
    maxVisible = 2,
}: AltNameBadgeGroupProps) {
    if (!names.length) return null

    const visible = names.slice(0, maxVisible)
    const overflow = names.length - maxVisible

    return (
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 flex-wrap">
                            {visible.map((name, idx) => (
                                <Badge
                                    key={idx}
                                    variant="outline"
                                    className="px-1.5 py-0 text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 cursor-default"
                                >
                                    {name}
                                </Badge>
                            ))}
                            {overflow > 0 && (
                                <Badge
                                    variant="outline"
                                    className="px-1.5 py-0 text-[10px] bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 cursor-help"
                                >
                                    +{overflow}
                                </Badge>
                            )}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-muted-foreground mb-1">
                                الأسماء البديلة:
                            </span>
                            {names.map((name, idx) => (
                                <span key={idx} className="text-xs">
                                    • {name}
                                </span>
                            ))}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}
