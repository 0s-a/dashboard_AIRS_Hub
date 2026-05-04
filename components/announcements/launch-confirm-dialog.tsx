"use client"

/**
 * components/announcements/launch-confirm-dialog.tsx
 *
 * Confirmation dialog shown before launching an announcement campaign.
 * Displays audience size, throttle settings, and estimated duration.
 * Used by both [id]/page.tsx and announcement-sheet.tsx.
 */

import { useState } from "react"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Zap, Users, Package, Clock, Timer, Gauge,
    Sun, AlertTriangle, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LaunchSummary {
    personCount:          number
    productCount?:        number
    messagesPerMinute?:   number
    delayBetweenSeconds?: number
    sendWindowStart?:     string | null
    sendWindowEnd?:       string | null
    formattedDuration?:   string | null   // from calculateEta
    formattedFinish?:     string | null
    exceedsWindow?:       boolean
}

interface LaunchConfirmDialogProps {
    open:        boolean
    onOpenChange: (open: boolean) => void
    summary:     LaunchSummary
    onConfirm:   () => Promise<void>
    title?:      string
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function SummaryRow({
    icon: Icon, label, value, color,
}: {
    icon:   React.ComponentType<{ className?: string }>
    label:  string
    value:  React.ReactNode
    color?: string
}) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className={cn("size-3.5 shrink-0", color ?? "text-muted-foreground")} />
                {label}
            </span>
            <span className="text-sm font-bold text-foreground">{value}</span>
        </div>
    )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LaunchConfirmDialog({
    open, onOpenChange, summary, onConfirm, title = "تأكيد إطلاق الحملة",
}: LaunchConfirmDialogProps) {
    const [launching, setLaunching] = useState(false)

    const handleConfirm = async () => {
        setLaunching(true)
        try {
            await onConfirm()
        } finally {
            setLaunching(false)
        }
    }

    const {
        personCount,
        productCount = 0,
        messagesPerMinute = 0,
        delayBetweenSeconds = 0,
        sendWindowStart,
        sendWindowEnd,
        formattedDuration,
        formattedFinish,
        exceedsWindow,
    } = summary

    return (
        <Dialog open={open} onOpenChange={launching ? undefined : onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Zap className="size-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-black">{title}</DialogTitle>
                            <DialogDescription className="text-xs mt-0.5">
                                راجع التفاصيل قبل إطلاق الحملة
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Summary */}
                <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-1 divide-y divide-border/20 my-1">
                    <SummaryRow
                        icon={Users} label="عدد الأشخاص" color="text-primary"
                        value={<span className="text-primary">{personCount.toLocaleString("ar")} شخص</span>}
                    />
                    {productCount > 0 && (
                        <SummaryRow
                            icon={Package} label="المنتجات المشمولة" color="text-indigo-500"
                            value={<span className="text-indigo-500">{productCount} منتج</span>}
                        />
                    )}
                    <SummaryRow
                        icon={Gauge} label="معدل الإرسال" color="text-emerald-600"
                        value={messagesPerMinute > 0 ? `${messagesPerMinute} رسالة/دقيقة` : "بلا حد ∞"}
                    />
                    {delayBetweenSeconds > 0 && (
                        <SummaryRow
                            icon={Timer} label="تأخير بين الرسائل" color="text-amber-500"
                            value={`${delayBetweenSeconds} ثانية`}
                        />
                    )}
                    {sendWindowStart && sendWindowEnd && (
                        <SummaryRow
                            icon={Sun} label="نافذة الإرسال" color="text-orange-500"
                            value={`${sendWindowStart} — ${sendWindowEnd}`}
                        />
                    )}
                    {formattedDuration && (
                        <SummaryRow
                            icon={Clock} label="المدة المتوقعة" color="text-blue-500"
                            value={
                                <span className={cn(exceedsWindow ? "text-orange-500" : "text-blue-500")}>
                                    {formattedDuration}
                                    {formattedFinish && (
                                        <span className="text-muted-foreground font-normal"> · ينتهي {formattedFinish}</span>
                                    )}
                                </span>
                            }
                        />
                    )}
                </div>

                {/* Window warning */}
                {exceedsWindow && (
                    <div className="flex items-start gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-2.5">
                        <AlertTriangle className="size-3.5 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-700 dark:text-orange-400 font-semibold leading-relaxed">
                            وقت الانتهاء يتجاوز نافذة الإرسال — قد لا تصل بعض الرسائل في اليوم الأول.
                        </p>
                    </div>
                )}

                {/* Large audience note */}
                {personCount >= 500 && (
                    <p className="text-[11px] text-muted-foreground text-center">
                        💡 سيتم إعداد <strong>{personCount.toLocaleString("ar")}</strong> رسالة في قاعدة البيانات قبل الإرسال — قد يستغرق الإعداد بضع ثوانٍ
                    </p>
                )}

                <DialogFooter className="gap-2 mt-1">
                    <Button
                        variant="outline"
                        disabled={launching}
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl"
                    >
                        إلغاء
                    </Button>
                    <Button
                        disabled={launching}
                        onClick={handleConfirm}
                        className="flex-1 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20"
                    >
                        {launching
                            ? <><Loader2 className="size-4 animate-spin" /> جاري الإطلاق...</>
                            : <><Zap className="size-4" /> إطلاق الآن</>
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
