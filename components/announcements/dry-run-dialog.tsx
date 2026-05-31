"use client"

/**
 * components/announcements/dry-run-dialog.tsx
 *
 * Preview Dialog — renders real messages for the first N customers in the audience.
 * Shows WhatsApp-style message bubbles so admins verify the content before launching.
 */

import { useState }  from "react"
import {
    Eye, Loader2, AlertTriangle, CheckCircle2,
    MessageSquare, Phone, Image as ImageIcon, ChevronDown, ChevronUp,
} from "lucide-react"
import { Button }   from "@/components/ui/button"
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Badge }    from "@/components/ui/badge"
import { cn }       from "@/lib/utils"
import { toast }    from "sonner"
import { dryRunAnnouncement } from "@/lib/actions/announcements"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DryRunSample {
    customerName:  string | null
    whatsapp:    string | null
    messageBody: string
    imageUrls:   string[]
}

interface DryRunDialogProps {
    announcementId: string
    disabled?:      boolean
}

// ─── WhatsApp Bubble ──────────────────────────────────────────────────────────

function WhatsAppBubble({ sample, index }: { sample: DryRunSample; index: number }) {
    const [expanded, setExpanded] = useState(index === 0)
    const lines = sample.messageBody.split("\n")
    const preview = lines.slice(0, 3).join("\n")
    const hasMore = lines.length > 3

    return (
        <div className="space-y-2">
            {/* Customer header */}
            <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-primary">
                        {(sample.customerName ?? "?")[0]}
                    </span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{sample.customerName ?? "—"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="size-3" />
                        {sample.whatsapp ?? (
                            <span className="text-destructive font-semibold">لا يوجد رقم</span>
                        )}
                    </p>
                </div>
                {sample.imageUrls.length > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                        <ImageIcon className="size-3" />
                        {sample.imageUrls.length} صورة
                    </Badge>
                )}
            </div>

            {/* WhatsApp bubble */}
            <div className="mr-10">
                <div className="bg-[#dcf8c6] dark:bg-emerald-900/30 rounded-2xl rounded-tl-sm px-4 py-3 max-w-full relative shadow-sm border border-emerald-200/50 dark:border-emerald-800/50">
                    {/* Triangle */}
                    <div className="absolute -top-0 -left-2 w-0 h-0
                        border-t-[8px] border-t-transparent
                        border-r-[8px] border-r-[#dcf8c6] dark:border-r-emerald-900/30
                        border-b-[8px] border-b-transparent" />
                    <pre className={cn(
                        "text-xs font-sans whitespace-pre-wrap break-words leading-relaxed text-foreground",
                        !expanded && "line-clamp-3"
                    )}>
                        {expanded ? sample.messageBody : preview}
                    </pre>
                    {hasMore && (
                        <button
                            type="button"
                            onClick={() => setExpanded(v => !v)}
                            className="mt-2 text-xs text-primary font-bold flex items-center gap-1 hover:underline"
                        >
                            {expanded
                                ? <><ChevronUp className="size-3" /> إخفاء</>
                                : <><ChevronDown className="size-3" /> عرض الرسالة كاملة ({lines.length} سطر)</>
                            }
                        </button>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 text-left mt-1">
                        ✓✓ {new Date().toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                </div>
            </div>

            {/* Thumbnails */}
            {sample.imageUrls.length > 0 && (
                <div className="mr-10 flex flex-wrap gap-1.5">
                    {sample.imageUrls.slice(0, 4).map((url, i) => (
                        <div key={i} className="size-16 rounded-lg overflow-hidden border border-border/50 bg-muted/30 shrink-0">
                            <img
                                src={url}
                                alt={`صورة ${i + 1}`}
                                className="size-full object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                            />
                        </div>
                    ))}
                    {sample.imageUrls.length > 4 && (
                        <div className="size-16 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center">
                            <span className="text-xs font-bold text-muted-foreground">+{sample.imageUrls.length - 4}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function DryRunDialog({ announcementId, disabled }: DryRunDialogProps) {
    const [open,    setOpen]    = useState(false)
    const [loading, setLoading] = useState(false)
    const [samples, setSamples] = useState<DryRunSample[]>([])
    const [noWhatsapp, setNoWhatsapp] = useState(0)

    const handleOpen = async () => {
        setOpen(true)
        setLoading(true)
        setSamples([])

        const res = await dryRunAnnouncement(announcementId, 5)
        setLoading(false)

        if (!res.success) {
            toast.error((res as any).error ?? "تعذّر إجراء المعاينة")
            setOpen(false)
            return
        }

        const raw = res.data as any
        const mappedSamples: DryRunSample[] = (raw.renderedMessages ?? []).map((m: any) => ({
            customerName:  m.customerName,
            whatsapp:    null,
            messageBody: m.messageBody,
            imageUrls:   [] as string[],
        }))
        setSamples(mappedSamples)
        setNoWhatsapp(0)

        if (mappedSamples.length === 0) {
            toast.warning("لا يوجد عملاء في الجمهور للمعاينة")
            setOpen(false)
        }
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={handleOpen}
                className="gap-2 rounded-xl font-bold border-dashed"
            >
                <Eye className="size-4" />
                معاينة الرسائل
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <MessageSquare className="size-4 text-emerald-600" />
                            معاينة رسائل حقيقية
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            هذه رسائل فعلية ستُرسل لأول {samples.length || 5} عملاء في الجمهور — لا يتم إرسال أي شيء الآن
                        </DialogDescription>
                    </DialogHeader>

                    {/* Warnings */}
                    {noWhatsapp > 0 && !loading && (
                        <div className="mx-6 mt-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
                            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                            <p className="text-xs text-amber-700 font-semibold">
                                {noWhatsapp} {noWhatsapp === 1 ? "عميل" : "عملاء"} بلا رقم واتساب — سيُتجاهلون عند الإرسال
                            </p>
                        </div>
                    )}

                    {/* Content */}
                    <div className="overflow-y-auto flex-1 px-6 py-4 space-y-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <Loader2 className="size-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">جاري توليد الرسائل...</p>
                            </div>
                        ) : (
                            samples.map((sample, i) => (
                                <div key={i}>
                                    <WhatsAppBubble sample={sample} index={i} />
                                    {i < samples.length - 1 && (
                                        <div className="border-t border-border/30 mt-6" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {!loading && samples.length > 0 && (
                        <div className="px-6 py-4 border-t border-border/50 shrink-0 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CheckCircle2 className="size-3.5 text-emerald-600" />
                                تُظهر أول {samples.length} رسائل من الجمهور الفعلي
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                className="rounded-xl h-8"
                            >
                                إغلاق
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
