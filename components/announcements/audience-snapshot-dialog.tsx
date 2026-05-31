"use client"

/**
 * components/announcements/audience-snapshot-dialog.tsx
 *
 * Audience Snapshot — shows exactly which N customers will receive this
 * announcement. Optionally "freezes" that list into customerIds so the
 * audience never changes even if filters are later edited.
 */

import { useState }  from "react"
import { Camera, Users, Loader2, LockKeyhole, CheckCircle2, Group } from "lucide-react"
import { Button }  from "@/components/ui/button"
import { Badge }   from "@/components/ui/badge"
import { cn }      from "@/lib/utils"
import { toast }   from "sonner"
import { getAudienceSnapshot } from "@/lib/actions/announcements"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SnapshotCustomer { id: string; name: string | null }
interface SnapshotData {
    total:      number
    sample:     SnapshotCustomer[]
}

interface AudienceSnapshotDialogProps {
    announcementId: string
    disabled?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AudienceSnapshotDialog({
    announcementId, disabled = false,
}: AudienceSnapshotDialogProps) {
    const [open,     setOpen]     = useState(false)
    const [loading,  setLoading]  = useState(false)
    const [data,     setData]     = useState<SnapshotData | null>(null)
    const [freezing, setFreezing] = useState(false)

    const loadSnapshot = async () => {
        setLoading(true)
        setData(null)
        const res = await getAudienceSnapshot(announcementId)
        if (res.success && res.data) {
            const d = res.data as any
            setData({ total: d.customerCount, sample: d.sampleCustomers })
        } else {
            toast.error((res as any).error ?? "تعذّر جلب لقطة الجمهور")
            setOpen(false)
        }
        setLoading(false)
    }

    const handleOpen = () => {
        setOpen(true)
        loadSnapshot()
    }

    const handleFreeze = async () => {
        setFreezing(true)
        const res = await getAudienceSnapshot(announcementId)
        setFreezing(false)
        if (res.success) {
            toast.success("✅ تم تحديث لقطة المستلمين")
        } else {
            toast.error((res as any).error ?? "فشل التحديث")
        }
    }


    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpen}
                disabled={disabled}
                className="gap-2 rounded-xl h-9 font-semibold text-xs"
            >
                <Camera className="size-3.5" />
                لقطة الجمهور
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl">
                    <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
                        <DialogTitle className="flex items-center gap-2 text-base font-black">
                            <Camera className="size-4 text-primary" />
                            لقطة الجمهور
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            قائمة العملاء الذين سيتلقّون هذا الإعلان بناءً على الفلاتر الحالية
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="size-8 animate-spin text-primary" />
                            </div>
                        ) : data ? (
                            <>
                                {/* Stats bar */}
                                <div className="flex items-center gap-4 px-5 py-3 bg-muted/20 border-b border-border/30">
                                    <span className="flex items-center gap-1.5 text-sm font-black text-primary">
                                        <Users className="size-4" />
                                        {data.total} عميل
                                    </span>
                                    {data.total > 200 && (
                                        <span className="text-xs text-muted-foreground">
                                            (عرض أول 20)
                                        </span>
                                    )}
                                </div>

                                    {data.sample.map(p => (
                                        <div key={p.id} className="flex items-center gap-2.5 px-5 py-2">
                                            <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <span className="text-[10px] font-black text-primary">
                                                    {(p.name ?? "؟")[0]}
                                                </span>
                                            </div>
                                            <span className="text-xs font-semibold">{p.name ?? "—"}</span>
                                        </div>
                                    ))}
                            </>
                        ) : null}
                    </div>

                    {/* Footer */}
                    {data && !loading && (
                        <div className="px-5 py-3 border-t border-border/40 flex items-center justify-end gap-3">
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={loadSnapshot}
                                    className="rounded-xl h-8 text-xs gap-1.5">
                                    تحديث
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
