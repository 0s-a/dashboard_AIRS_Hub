"use client"

import { useState } from "react"
import { Copy, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// ─────────────────────────────────────────────────────────────
// Copy Price Label Dialog
// Copies all prices from one PriceLabel to another with optional % adjustment
// ─────────────────────────────────────────────────────────────

interface CopyPriceDialogProps {
    open: boolean
    fromLabelId: string
    fromLabelName: string
    priceLabels: { id: string; name: string }[]
    isPending: boolean
    onClose: () => void
    onConfirm: (toLabelId: string, adjustmentPercent: number) => void
}

export function CopyPriceDialog({
    open, fromLabelId, fromLabelName, priceLabels, isPending, onClose, onConfirm
}: CopyPriceDialogProps) {
    const [toLabelId, setToLabelId] = useState("")
    const [adjustment, setAdjustment] = useState("0")

    const availableTargets = priceLabels.filter(l => l.id !== fromLabelId)
    const pct = parseFloat(adjustment) || 0

    return (
        <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
            <DialogContent className="max-w-sm rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Copy className="size-4" /> نسخ أسعار إلى قائمة أخرى
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {/* Source label */}
                    <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2">
                        <span className="text-xs font-bold text-muted-foreground">من:</span>
                        <span className="text-xs font-black text-primary">{fromLabelName}</span>
                    </div>

                    <div className="flex justify-center">
                        <ChevronRight className="size-4 text-muted-foreground rotate-90" />
                    </div>

                    {/* Target label */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground">إلى قائمة:</label>
                        <Select value={toLabelId} onValueChange={setToLabelId}>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="اختر القائمة الهدف" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTargets.map(l => (
                                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Adjustment % */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground">نسبة التعديل (اختياري)</label>
                        <div className="relative">
                            <Input
                                type="number" step="0.1"
                                value={adjustment}
                                onChange={e => setAdjustment(e.target.value)}
                                className="rounded-xl pl-8 font-mono"
                                placeholder="0"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">%</span>
                        </div>
                        {pct !== 0 && (
                            <p className="text-[11px] text-muted-foreground">
                                مثال: 1000 → {(1000 * (1 + pct / 100)).toFixed(0)}
                                {pct > 0 ? ` (+${pct}%)` : ` (${pct}%)`}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button variant="ghost" className="flex-1 rounded-xl" onClick={onClose} disabled={isPending}>
                            إلغاء
                        </Button>
                        <Button
                            className="flex-1 rounded-xl gap-2"
                            onClick={() => onConfirm(toLabelId, pct)}
                            disabled={isPending || !toLabelId}
                        >
                            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                            نسخ الأسعار
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
