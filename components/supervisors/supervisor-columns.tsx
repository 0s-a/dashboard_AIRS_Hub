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
import {
    MoreHorizontal, Pencil, Trash2, UserCheck, UserX,
    Phone, Mail, MessageCircle, Copy, ShieldAlert,
} from "lucide-react"
import { toggleSupervisorActive, deleteSupervisor, getSupervisors } from "@/lib/actions/supervisors"
import { toast } from "sonner"

export type SupervisorContact = {
    id: string
    type: string
    value: string
    label: string | null
    isPrimary: boolean
}

export type SupervisorRow = {
    id: string
    name: string
    notes: string | null
    isActive: boolean
    createdAt: Date | string
    updatedAt: Date | string
    contacts: SupervisorContact[]
}

interface ColumnCallbacks {
    onEdit: (s: SupervisorRow) => void
    onRefresh: (updated: SupervisorRow[]) => void
}

function formatPhone(phone: string) {
    const c = phone.replace(/\D/g, '')
    if (c.length === 10) return `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`
    if (c.length === 12 && c.startsWith('966'))
        return `+${c.slice(0, 3)} ${c.slice(3, 5)} ${c.slice(5, 8)} ${c.slice(8)}`
    return phone
}

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('تم النسخ', { duration: 1500 })
}

function formatDate(date: Date | string | null) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("ar-SA", {
        year: "numeric", month: "short", day: "numeric",
    })
}

export function supervisorColumns({ onEdit, onRefresh }: ColumnCallbacks): ColumnDef<SupervisorRow>[] {
    return [
        // ── الاسم ──────────────────────────────────────────────
        {
            accessorKey: "name",
            enableColumnFilter: true,
            meta: { filterType: 'text' as const, filterPlaceholder: 'ابحث بالاسم...' },
            header: "المشرف",
            size: 220, minSize: 160, maxSize: 280,
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                        <ShieldAlert className="size-4 text-violet-600" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm truncate max-w-[160px]">{row.original.name}</span>
                        {row.original.notes && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">{row.original.notes}</span>
                        )}
                    </div>
                </div>
            ),
        },
        // ── معلومات الاتصال ────────────────────────────────────
        {
            id: "contacts",
            enableColumnFilter: true,
            meta: { filterType: 'text' as const, filterPlaceholder: 'بحث في الاتصال...' },
            filterFn: (row: any, _: string, v: string) =>
                (row.original.contacts || []).some((c: any) => c.value.toLowerCase().includes(v.toLowerCase())),
            header: "معلومات الاتصال",
            size: 240, minSize: 200, maxSize: 300,
            cell: ({ row }) => {
                const contacts = row.original.contacts || []
                const phones = contacts.filter((c: any) => c.type === 'phone')
                const wa = contacts.filter((c: any) => c.type === 'whatsapp')
                const emails = contacts.filter((c: any) => c.type === 'email')

                if (!contacts.length) return <span className="text-muted-foreground/40 text-xs">—</span>

                return (
                    <div className="flex flex-col gap-1 py-1">
                        {/* Phones */}
                        {phones.map((phone: any, i: number) => (
                            <div key={phone.id || i} className="flex items-center gap-1.5 group/ph text-xs py-0.5">
                                <a href={`tel:${phone.value}`} className="font-mono text-xs font-medium hover:text-blue-600 transition-colors text-muted-foreground hover:text-foreground" dir="ltr" onClick={e => e.stopPropagation()}>
                                    {formatPhone(phone.value)}
                                </a>
                                {phone.label && (
                                    <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded shrink-0">
                                        {phone.label}
                                    </span>
                                )}
                                {phone.isPrimary && (
                                    <span className="text-[9px] text-blue-600 bg-blue-500/10 px-1 rounded shrink-0">أساسي</span>
                                )}
                                <button onClick={e => { e.stopPropagation(); copyToClipboard(phone.value) }} className="opacity-0 group-hover/ph:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0">
                                    <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                                </button>
                            </div>
                        ))}

                        {/* WhatsApp */}
                        {wa.map((waItem: any, i: number) => (
                            <div key={waItem.id || i} className="flex items-center gap-1.5 group/wa text-xs py-0.5">
                                <a href={`https://wa.me/${waItem.value.replace(/\D/g, '').replace(/^0/, '966')}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs font-medium hover:text-emerald-600 transition-colors text-muted-foreground hover:text-foreground" dir="ltr" onClick={e => e.stopPropagation()}>
                                    {formatPhone(waItem.value)}
                                </a>
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 opacity-80">(واتساب)</span>
                                {waItem.label && (
                                    <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded shrink-0">
                                        {waItem.label}
                                    </span>
                                )}
                                {waItem.isPrimary && (
                                    <span className="text-[9px] text-emerald-600 bg-emerald-500/10 px-1 rounded shrink-0">أساسي</span>
                                )}
                                <button onClick={e => { e.stopPropagation(); copyToClipboard(waItem.value) }} className="opacity-0 group-hover/wa:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0">
                                    <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                                </button>
                            </div>
                        ))}

                        {/* Email */}
                        {emails.map((email: any, i: number) => (
                            <div key={email.id || i} className="flex items-center gap-1.5 group/em text-xs py-0.5">
                                <a href={`mailto:${email.value}`} className="text-xs hover:text-rose-600 transition-colors truncate max-w-[150px] text-muted-foreground hover:text-foreground" onClick={ev => ev.stopPropagation()}>
                                    {email.value}
                                </a>
                                {email.label && (
                                    <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded shrink-0">
                                        {email.label}
                                    </span>
                                )}
                                {email.isPrimary && (
                                    <span className="text-[9px] text-rose-600 bg-rose-500/10 px-1 rounded shrink-0">أساسي</span>
                                )}
                                <button onClick={ev => { ev.stopPropagation(); copyToClipboard(email.value) }} className="opacity-0 group-hover/em:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0">
                                    <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                                </button>
                            </div>
                        ))}
                    </div>
                )
            },
        },
        // ── الحالة ─────────────────────────────────────────────
        {
            accessorKey: "isActive",
            enableColumnFilter: true,
            meta: {
                filterType: 'select' as const,
                filterOptions: [{ label: "نشط", value: "true" }, { label: "معطّل", value: "false" }]
            },
            filterFn: (row: any, _: string, v: string) => String(row.original.isActive) === v,
            header: "الحالة",
            size: 110, minSize: 90, maxSize: 130,
            cell: ({ row }) => (
                <Badge className={row.original.isActive
                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0"
                    : "bg-muted text-muted-foreground border-0"
                }>
                    {row.original.isActive ? "نشط" : "معطّل"}
                </Badge>
            ),
        },
        // ── تاريخ الإنشاء ──────────────────────────────────────
        {
            accessorKey: "createdAt",
            header: "تاريخ الإضافة",
            size: 140, minSize: 120, maxSize: 170,
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>
            ),
        },
        // ── الإجراءات ──────────────────────────────────────────
        {
            id: "actions",
            enableColumnFilter: false,
            header: "",
            cell: ({ row }) => {
                const s = row.original

                const handleToggle = async () => {
                    const res = await toggleSupervisorActive(s.id, !s.isActive)
                    if (res.success) {
                        toast.success(s.isActive ? "تم تعطيل المشرف" : "تم تفعيل المشرف")
                        const fresh = await getSupervisors({ activeOnly: false })
                        if (fresh.success && fresh.data) onRefresh((fresh.data as any).supervisors)
                    } else {
                        toast.error(res.error)
                    }
                }

                const handleDelete = async () => {
                    if (!confirm(`هل تريد حذف المشرف "${s.name}"؟`)) return
                    const res = await deleteSupervisor(s.id)
                    if (res.success) {
                        toast.success("تم حذف المشرف")
                        const fresh = await getSupervisors({ activeOnly: false })
                        if (fresh.success && fresh.data) onRefresh((fresh.data as any).supervisors)
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
                            <DropdownMenuItem className="gap-2 cursor-pointer font-medium" onClick={() => onEdit(s)}>
                                <Pencil className="h-4 w-4 text-muted-foreground" /> تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer font-medium" onClick={handleToggle}>
                                {s.isActive
                                    ? <><UserX className="h-4 w-4 text-amber-500" /> تعطيل</>
                                    : <><UserCheck className="h-4 w-4 text-emerald-500" /> تفعيل</>
                                }
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="gap-2 cursor-pointer font-medium text-destructive focus:text-destructive"
                                onClick={handleDelete}
                            >
                                <Trash2 className="h-4 w-4" /> حذف
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
}
