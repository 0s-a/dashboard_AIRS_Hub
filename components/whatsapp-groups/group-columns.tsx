"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    MoreHorizontal, Pencil, Trash2, Eye,
    MessageSquare, User, Users, Copy,
    ToggleLeft, ToggleRight,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { deleteWhatsappGroup, toggleWhatsappGroupActive } from "@/lib/actions/whatsapp-groups"
import type { WhatsappGroupRow } from "@/lib/types/whatsapp-groups"

// ── Helpers ────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success("تم النسخ", { duration: 1500 })
}

function formatDate(date: Date | string | null) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("ar-SA", {
        year: "numeric", month: "short", day: "numeric",
    })
}

function getPrimaryContact(contacts: { type: string; value: string }[], type: "phone" | "whatsapp") {
    return contacts.find(c => c.type === type)?.value ?? null
}

// ── Callbacks ─────────────────────────────────────────────────────

interface ColumnCallbacks {
    onEdit: (group: WhatsappGroupRow) => void
    onRefresh: () => void
}

// ── Column Definitions ────────────────────────────────────────────

export function whatsappGroupColumns({ onEdit, onRefresh }: ColumnCallbacks): ColumnDef<WhatsappGroupRow>[] {
    return [
        // ── اسم المجموعة ──────────────────────────────────────────
        {
            accessorKey: "name",
            header: "المجموعة",
            enableColumnFilter: true,
            meta: { filterType: "text" as const, filterPlaceholder: "ابحث باسم المجموعة..." },
            size: 220, minSize: 160, maxSize: 280,
            cell: ({ row }) => {
                const g = row.original
                return (
                    <div className="flex items-center gap-3">
                        <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                            g.isActive ? "bg-emerald-500/10" : "bg-muted/60"
                        }`}>
                            <MessageSquare className={`size-4 ${g.isActive ? "text-emerald-600" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-sm truncate">{g.name}</span>
                            {g.groupNumber && (
                                <button
                                    onClick={e => { e.stopPropagation(); copyToClipboard(g.groupNumber!) }}
                                    className="flex items-center gap-1 group/num"
                                >
                                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[140px]" dir="ltr">
                                        {g.groupNumber}
                                    </span>
                                    <Copy className="size-2.5 text-muted-foreground opacity-0 group-hover/num:opacity-100 transition-opacity shrink-0" />
                                </button>
                            )}
                        </div>
                    </div>
                )
            },
        },

        // ── العميل ────────────────────────────────────────────────
        {
            id: "customer",
            header: "العميل",
            enableColumnFilter: true,
            meta: { filterType: "text" as const, filterPlaceholder: "ابحث باسم العميل..." },
            filterFn: (row, _, value) =>
                (row.original.customer?.name ?? "").toLowerCase().includes(value.toLowerCase()),
            size: 200, minSize: 150, maxSize: 260,
            cell: ({ row }) => {
                const customer = row.original.customer
                if (!customer) return <span className="text-muted-foreground/40 text-xs">—</span>

                const phone = getPrimaryContact(customer.contacts, "phone")
                    ?? getPrimaryContact(customer.contacts, "whatsapp")

                return (
                    <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <User className="size-3.5 text-blue-600" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{customer.name ?? "—"}</span>
                            {phone && (
                                <button
                                    onClick={e => { e.stopPropagation(); copyToClipboard(phone) }}
                                    className="flex items-center gap-1 group/ph"
                                >
                                    <span className="text-[10px] font-mono text-muted-foreground" dir="ltr">{phone}</span>
                                    <Copy className="size-2.5 text-muted-foreground opacity-0 group-hover/ph:opacity-100 transition-opacity shrink-0" />
                                </button>
                            )}
                        </div>
                    </div>
                )
            },
        },

        // ── المشرفون ──────────────────────────────────────────────
        {
            id: "supervisors",
            header: "المشرفون",
            enableColumnFilter: true,
            meta: { filterType: "text" as const, filterPlaceholder: "ابحث باسم المشرف..." },
            filterFn: (row, _, value) =>
                row.original.supervisors.some(s =>
                    s.supervisor.name.toLowerCase().includes(value.toLowerCase())
                ),
            size: 200, minSize: 150, maxSize: 260,
            cell: ({ row }) => {
                const supervisors = row.original.supervisors
                if (!supervisors.length)
                    return <span className="text-xs text-muted-foreground/40">لا يوجد مشرفون</span>

                const visible = supervisors.slice(0, 2)
                const rest = supervisors.length - 2

                return (
                    <div className="flex flex-col gap-1">
                        {visible.map(({ supervisor }) => (
                            <div key={supervisor.id} className="flex items-center gap-1.5">
                                <div className="size-4 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0">
                                    <Users className="size-2.5 text-violet-600" />
                                </div>
                                <span className="text-xs font-medium truncate max-w-[120px]">{supervisor.name}</span>
                            </div>
                        ))}
                        {rest > 0 && (
                            <span className="text-[10px] text-muted-foreground mr-5">+{rest} آخرون</span>
                        )}
                    </div>
                )
            },
        },

        // ── الحالة ────────────────────────────────────────────────
        {
            accessorKey: "isActive",
            header: "الحالة",
            enableColumnFilter: true,
            meta: {
                filterType: "select" as const,
                filterOptions: [
                    { label: "نشطة", value: "true" },
                    { label: "معطّلة", value: "false" },
                ],
            },
            filterFn: (row, _, value) => String(row.original.isActive) === value,
            size: 100, minSize: 80, maxSize: 120,
            cell: ({ row }) => (
                <Badge className={row.original.isActive
                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0 text-xs"
                    : "bg-muted text-muted-foreground border-0 text-xs"
                }>
                    {row.original.isActive ? "نشطة" : "معطّلة"}
                </Badge>
            ),
        },

        // ── تاريخ الإنشاء ─────────────────────────────────────────
        {
            accessorKey: "createdAt",
            header: "تاريخ الإنشاء",
            size: 130, minSize: 110, maxSize: 160,
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground">
                    {formatDate(row.original.createdAt)}
                </span>
            ),
        },

        // ── الإجراءات ─────────────────────────────────────────────
        {
            id: "actions",
            header: "",
            enableColumnFilter: false,
            size: 60,
            cell: ({ row }) => {
                const g = row.original

                const ActionCell = () => {
                    const router = useRouter()

                    const handleDelete = async () => {
                        if (!confirm(`هل تريد حذف مجموعة "${g.name}"؟`)) return
                        const res = await deleteWhatsappGroup(g.id)
                        if (res.success) {
                            toast.success("تم حذف المجموعة")
                            onRefresh()
                        } else {
                            toast.error(res.error ?? "تعذّر الحذف")
                        }
                    }

                    const handleToggle = async () => {
                        const res = await toggleWhatsappGroupActive(g.id, !g.isActive)
                        if (res.success) {
                            toast.success(g.isActive ? "تم تعطيل المجموعة" : "تم تفعيل المجموعة")
                            onRefresh()
                        } else {
                            toast.error(res.error ?? "تعذّر تغيير الحالة")
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
                                <DropdownMenuItem
                                    className="gap-2 cursor-pointer font-medium"
                                    onClick={() => router.push(`/whatsapp-groups/${g.id}`)}
                                >
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                    عرض التفاصيل
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="gap-2 cursor-pointer font-medium"
                                    onClick={() => onEdit(g)}
                                >
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                    تعديل
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 cursor-pointer font-medium" onClick={handleToggle}>
                                    {g.isActive
                                        ? <><ToggleLeft className="h-4 w-4 text-amber-500" /> تعطيل</>
                                        : <><ToggleRight className="h-4 w-4 text-emerald-500" /> تفعيل</>
                                    }
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="gap-2 cursor-pointer font-medium text-destructive focus:text-destructive"
                                    onClick={handleDelete}
                                >
                                    <Trash2 className="h-4 w-4" /> حذف
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )
                }

                return <ActionCell />
            },
        },
    ]
}
