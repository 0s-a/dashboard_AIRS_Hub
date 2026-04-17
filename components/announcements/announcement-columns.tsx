"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2, Play, Users, Package, Clock } from "lucide-react"
import { deleteAnnouncement, executeAnnouncement } from "@/lib/actions/announcements"
import { toast } from "sonner"

export type AnnouncementRow = {
    id: string
    title: string
    description: string | null
    scheduledAt: Date | string
    status: string
    sentAt: Date | string | null
    sentCount: number | null
    personIds: unknown
    productIds: unknown
    personFilters: unknown
    productFilters: unknown
    createdAt: Date | string
}

function formatDate(d: Date | string | null) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("ar-SA", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    })
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
    draft:     { label: "مسودة",          className: "bg-muted text-muted-foreground border-0" },
    running:   { label: "جاري الإرسال",  className: "bg-primary/10 text-primary border-0" },
    paused:    { label: "متوقف مؤقتاً", className: "bg-amber-500/10 text-amber-600 border-0" },
    sent:      { label: "تم الإرسال",  className: "bg-emerald-500/10 text-emerald-600 border-0" },
    failed:    { label: "فشل",            className: "bg-destructive/10 text-destructive border-0" },
    cancelled: { label: "ملغى",            className: "bg-muted text-muted-foreground border-0" },
}

export const announcementColumns: ColumnDef<AnnouncementRow>[] = [
    {
        accessorKey: "title",
        header: "الإعلان",
        cell: ({ row }) => (
            <div className="flex flex-col gap-0.5">
                <span className="font-bold text-sm">{row.original.title}</span>
                {row.original.description && (
                    <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[240px]">
                        {row.original.description}
                    </span>
                )}
            </div>
        ),
    },
    {
        accessorKey: "status",
        header: "الحالة",
        cell: ({ row }) => {
            const s = STATUS_MAP[row.original.status] ?? STATUS_MAP.draft
            return (
                <div className="flex items-center gap-1.5">
                    {row.original.status === "sent" && (
                        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                    )}
                    <Badge className={s.className}>{s.label}</Badge>
                </div>
            )
        },
    },
    {
        accessorKey: "scheduledAt",
        header: "التاريخ المجدول",
        cell: ({ row }) => (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {formatDate(row.original.scheduledAt)}
            </div>
        ),
    },
    {
        id: "audience",
        header: "الجمهور",
        cell: ({ row }) => {
            const pf = row.original.personFilters as any
            const prf = row.original.productFilters as any
            const personLabel = pf?.all ? "الكل" :
                (row.original.personIds as string[])?.length > 0 ? `${(row.original.personIds as string[]).length} شخص` : "—"
            const productLabel = prf?.all ? "الكل" :
                (row.original.productIds as string[])?.length > 0 ? `${(row.original.productIds as string[]).length} منتج` : "—"
            return (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="size-3.5" />{personLabel}</span>
                    <span className="flex items-center gap-1"><Package className="size-3.5" />{productLabel}</span>
                </div>
            )
        },
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => {
            const ann = row.original

            const handleDelete = async () => {
                if (!confirm(`هل تريد حذف الإعلان "${ann.title}"؟`)) return
                const res = await deleteAnnouncement(ann.id)
                if (res.success) toast.success("تم حذف الإعلان")
                else toast.error(res.error)
            }

            const handleExecute = async () => {
                if (!confirm(`تنفيذ الإعلان "${ann.title}" الآن؟`)) return
                const toastId = toast.loading("جاري الإرسال...")
                const res = await executeAnnouncement(ann.id)
                toast.dismiss(toastId)
                if (res.success) {
                    const d = res.data as any
                    toast.success(`✅ تم إرسال الإعلان إلى ${d?.sentCount ?? 0} شخص`)
                    window.dispatchEvent(new Event("refresh-announcements"))
                } else {
                    toast.error(res.error)
                }
            }

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl w-48">
                        <DropdownMenuItem className="gap-2 cursor-pointer font-medium"
                            onClick={() => window.dispatchEvent(new CustomEvent("edit-announcement", { detail: ann }))}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                            تعديل
                        </DropdownMenuItem>
                        {ann.status !== "sent" && (
                            <DropdownMenuItem className="gap-2 cursor-pointer font-medium text-emerald-600 focus:text-emerald-600"
                                onClick={handleExecute}>
                                <Play className="h-4 w-4" />
                                تنفيذ الآن
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="gap-2 cursor-pointer font-medium text-destructive focus:text-destructive"
                            onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                            حذف
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
