"use client"

/**
 * components/announcements/retry-failed-panel.tsx
 *
 * Displays the list of persons who failed delivery and allows:
 *   - Retrying all failed persons at once
 *   - Per-person action (optional: manual fix link)
 */

import { useState } from "react"
import {
    AlertCircle, RefreshCw, Loader2, User, Phone, Mail,
    MessageSquare, ChevronDown, RotateCcw, CheckCircle2,
} from "lucide-react"
import { Button }  from "@/components/ui/button"
import { Badge }   from "@/components/ui/badge"
import { cn }      from "@/lib/utils"
import { toast }   from "sonner"
import { retryFailedMessages } from "@/lib/actions/announcements"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FailedEntry {
    personId:     string
    personName:   string | null
    contact:      string | null
    reason:       string
    failedAt:     string
    messageIndex: number
    retryCount:   number
}

interface RetryFailedPanelProps {
    announcementId: string
    failedMessages: FailedEntry[]
    onRetried:      () => void   // called after successful retry publish
}

// ─── Contact icon helper ──────────────────────────────────────────────────────
function ContactIcon({ contact }: { contact: string | null }) {
    if (!contact) return <Phone className="size-3 text-muted-foreground" />
    if (contact.includes('@')) return <Mail className="size-3 text-muted-foreground" />
    if (contact.startsWith('+') || /^\d/.test(contact)) return <Phone className="size-3 text-muted-foreground" />
    return <MessageSquare className="size-3 text-muted-foreground" />
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RetryFailedPanel({
    announcementId,
    failedMessages,
    onRetried,
}: RetryFailedPanelProps) {
    const [expanded,  setExpanded]  = useState(false)
    const [retrying,  setRetrying]  = useState(false)
    const [succeeded, setSucceeded] = useState(false)

    if (failedMessages.length === 0) return null

    const visibleList = expanded ? failedMessages : failedMessages.slice(0, 4)

    const handleRetryAll = async () => {
        setRetrying(true)
        const res = await retryFailedMessages(announcementId)
        setRetrying(false)

        if (res.success) {
            const d = res.data as any
            toast.success(`✅ تم إعادة إرسال ${d?.published ?? failedMessages.length} شخص إلى الطابور`)
            setSucceeded(true)
            onRetried()
        } else {
            toast.error((res as any).error)
        }
    }

    if (succeeded) {
        return (
            <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-5 py-4">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <p className="text-sm font-bold text-emerald-700">
                    تم إعادة إرسال الفاشلين إلى RabbitMQ — n8n يعالجهم
                </p>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/3 overflow-hidden">

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-destructive/15">
                <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="size-4 text-destructive" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-destructive">
                            فشل الإرسال إلى {failedMessages.length} {failedMessages.length === 1 ? "شخص" : "أشخاص"}
                        </p>
                        <p className="text-xs text-muted-foreground">يمكن إعادة محاولة الإرسال لهم</p>
                    </div>
                </div>

                <Button
                    size="sm"
                    variant="destructive"
                    disabled={retrying}
                    onClick={handleRetryAll}
                    className="gap-1.5 rounded-xl font-bold text-xs h-9"
                >
                    {retrying
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <RotateCcw className="size-3.5" />
                    }
                    {retrying ? "جاري الإرسال..." : "إعادة إرسال الكل"}
                </Button>
            </div>

            {/* ── Failed Persons List ── */}
            <div className="divide-y divide-destructive/10">
                {visibleList.map((entry, i) => (
                    <div
                        key={`${entry.personId}-${i}`}
                        className="flex items-start gap-3 px-5 py-3.5 hover:bg-destructive/2 transition-colors"
                    >
                        {/* Avatar */}
                        <div className="size-8 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 mt-0.5">
                            <User className="size-3.5 text-muted-foreground" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold truncate">
                                    {entry.personName ?? `شخص #${entry.messageIndex}`}
                                </span>
                                {entry.retryCount > 0 && (
                                    <Badge
                                        variant="outline"
                                        className="text-[10px] border-destructive/30 text-destructive shrink-0"
                                    >
                                        محاولة {entry.retryCount + 1}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-3 mt-1">
                                {entry.contact && (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <ContactIcon contact={entry.contact} />
                                        {entry.contact}
                                    </span>
                                )}
                                <span className="text-[11px] text-destructive/80 font-medium truncate max-w-[200px]">
                                    {entry.reason}
                                </span>
                            </div>

                            <span className="text-[10px] text-muted-foreground/60 mt-0.5 block">
                                {new Date(entry.failedAt).toLocaleString("ar-SA", {
                                    hour: "2-digit", minute: "2-digit",
                                    day: "numeric", month: "short"
                                })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Show more ── */}
            {failedMessages.length > 4 && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-destructive py-3 border-t border-destructive/10 transition-colors"
                >
                    <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
                    {expanded
                        ? "عرض أقل"
                        : `عرض ${failedMessages.length - 4} أشخاص إضافيين`}
                </button>
            )}
        </div>
    )
}
