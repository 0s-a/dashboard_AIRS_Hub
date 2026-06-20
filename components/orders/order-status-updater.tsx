"use client"

import { useState } from "react"
import { toast } from "sonner"
import { updateOrderStatus } from "@/lib/actions/orders"
import { ORDER_STATUSES } from "./order-columns"
import { Loader2 } from "lucide-react"

interface Props {
    orderId: string
    currentStatus: string
}

export function OrderStatusUpdater({ orderId, currentStatus }: Props) {
    const [loading, setLoading] = useState<string | null>(null)

    async function handleUpdate(status: string) {
        setLoading(status)
        try {
            const res = await updateOrderStatus(orderId, status)
            if (res.success) toast.success("تم تحديث الحالة بنجاح")
            else toast.error(res.error ?? "تعذّر تحديث الحالة")
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="flex flex-col gap-2">
            {ORDER_STATUSES.map((s) => {
                const isCurrent = s.value === currentStatus
                const isLoading = loading === s.value
                const Icon = s.icon
                return (
                    <button
                        key={s.value}
                        onClick={() => !isCurrent && handleUpdate(s.value)}
                        disabled={isCurrent || loading !== null}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all
                            ${isCurrent
                                ? `${s.color} cursor-default ring-2 ring-offset-1 ring-current/30`
                                : "border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground disabled:opacity-40"
                            }`}
                    >
                        {isLoading
                            ? <Loader2 className="size-4 animate-spin" />
                            : <Icon className="size-4" />
                        }
                        {s.label}
                        {isCurrent && (
                            <span className="mr-auto text-[10px] font-semibold opacity-70">الحالي</span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
