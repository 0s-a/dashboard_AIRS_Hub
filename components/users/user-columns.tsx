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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { MoreHorizontal, Pencil, Trash2, UserCheck, UserX, ShieldCheck, User, Phone, Mail, MessageCircle, Copy } from "lucide-react"
import { toggleUserActive, deleteUser, getUsers } from "@/lib/actions/users"
import { toast } from "sonner"
import { UserAvatar } from "./user-avatar"

export type UserContactRecord = {
    id: string
    type: string
    value: string
    label: string | null
    isPrimary: boolean
}

export type UserRow = {
    id: string
    name: string
    username: string
    role: string
    color: string
    isActive: boolean
    lastLogin: Date | string | null
    createdAt: Date | string
    updatedAt: Date | string
    contacts: UserContactRecord[]
}

interface ColumnCallbacks {
    onEdit: (user: UserRow) => void
    onRefresh: (updated: UserRow[]) => void
}

function formatPhoneNumber(phone: string) {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
    if (cleaned.length === 12 && cleaned.startsWith('966'))
        return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
    return phone
}

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('تم النسخ', { duration: 1500 })
}

// أيقونات وألوان نوع الاتصال
const contactTypeStyles: Record<string, { icon: typeof Phone; color: string; bgColor: string; hoverBg: string }> = {
    phone:    { icon: Phone,         color: 'text-blue-600',    bgColor: 'bg-blue-50 dark:bg-blue-500/10',    hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-500/20' },
    email:    { icon: Mail,          color: 'text-rose-600',    bgColor: 'bg-rose-50 dark:bg-rose-500/10',    hoverBg: 'hover:bg-rose-100 dark:hover:bg-rose-500/20' },
    whatsapp: { icon: MessageCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10', hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-500/20' },
}

function formatDate(date: Date | string | null) {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

export function userColumns({ onEdit, onRefresh }: ColumnCallbacks): ColumnDef<UserRow>[] {
    return [
    {
        accessorKey: "name",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'ابحث بالاسم...' },
        header: "المستخدم",
        size: 220,
        minSize: 180,
        maxSize: 280,
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <UserAvatar name={row.original.name} color={row.original.color} size="sm" />
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm truncate max-w-[160px]">{row.original.name}</span>
                        {row.original.role === "admin" && (
                            <ShieldCheck className="size-3.5 text-primary shrink-0" />
                        )}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">@{row.original.username}</span>
                </div>
            </div>
        ),
    },
    {
        accessorKey: "role",
        enableColumnFilter: true,
        meta: {
            filterType: 'select' as const,
            filterOptions: [
                { label: 'مدير', value: 'admin' },
                { label: 'مستخدم', value: 'user' },
            ],
        },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            return row.original.role === filterValue
        },
        header: "الدور",
        size: 120,
        minSize: 100,
        maxSize: 150,
        cell: ({ row }) => (
            row.original.role === "admin" ? (
                <Badge className="bg-primary/10 text-primary border-0 gap-1 font-semibold">
                    <ShieldCheck className="size-3" />
                    مدير
                </Badge>
            ) : (
                <Badge className="bg-muted text-muted-foreground border-0 gap-1 font-semibold">
                    <User className="size-3" />
                    مستخدم
                </Badge>
            )
        ),
    },
    // ── هاتف ────────────────────────────────────────────────
    {
        id: "phone",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'رقم الهاتف...' },
        filterFn: (row: any, _: string, filterValue: string) => {
            const phones = (row.original.contacts || []).filter((c: any) => c.type === 'phone')
            return phones.some((p: any) => p.value.includes(filterValue))
        },
        header: "الهاتف",
        size: 190,
        minSize: 160,
        maxSize: 220,
        cell: ({ row }) => {
            const phones = (row.original.contacts || []).filter((c: any) => c.type === 'phone')
            if (phones.length === 0) return <span className="text-muted-foreground/40 text-xs">—</span>
            const p = phones[0]
            return (
                <div className="flex items-center gap-1 group/ph">
                    <div className="h-5 w-5 rounded-md bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Phone className="h-3 w-3 text-blue-600" />
                    </div>
                    <a href={`tel:${p.value}`} className="font-mono text-xs font-medium hover:text-blue-600 transition-colors" dir="ltr" onClick={e => e.stopPropagation()}>
                        {formatPhoneNumber(p.value)}
                    </a>
                    {phones.length > 1 && <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded">+{phones.length - 1}</span>}
                    <button onClick={e => { e.stopPropagation(); copyToClipboard(p.value) }} className="opacity-0 group-hover/ph:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0">
                        <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                </div>
            )
        },
    },
    // ── واتساب ──────────────────────────────────────────────
    {
        id: "whatsapp",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'رقم واتساب...' },
        filterFn: (row: any, _: string, filterValue: string) => {
            const wa = (row.original.contacts || []).filter((c: any) => c.type === 'whatsapp')
            return wa.some((p: any) => p.value.includes(filterValue))
        },
        header: "واتساب",
        size: 170,
        minSize: 145,
        maxSize: 210,
        cell: ({ row }) => {
            const wa = (row.original.contacts || []).filter((c: any) => c.type === 'whatsapp')
            if (wa.length === 0) return <span className="text-muted-foreground/40 text-xs">—</span>
            const p = wa[0]
            const href = `https://wa.me/${p.value.replace(/\D/g, '').replace(/^0/, '966')}`
            return (
                <div className="flex items-center gap-1 group/wa">
                    <div className="h-5 w-5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <MessageCircle className="h-3 w-3 text-emerald-600" />
                    </div>
                    <a href={href} target="_blank" rel="noopener noreferrer" className="font-mono text-xs font-medium hover:text-emerald-600 transition-colors" dir="ltr" onClick={e => e.stopPropagation()}>
                        {formatPhoneNumber(p.value)}
                    </a>
                    {wa.length > 1 && <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded">+{wa.length - 1}</span>}
                    <button onClick={e => { e.stopPropagation(); copyToClipboard(p.value) }} className="opacity-0 group-hover/wa:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0">
                        <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                </div>
            )
        },
    },
    // ── بريد إلكتروني ────────────────────────────────────────
    {
        id: "email",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'البريد الإلكتروني...' },
        filterFn: (row: any, _: string, filterValue: string) => {
            const emails = (row.original.contacts || []).filter((c: any) => c.type === 'email')
            return emails.some((e: any) => e.value.toLowerCase().includes(filterValue.toLowerCase()))
        },
        header: "البريد",
        size: 220,
        minSize: 180,
        maxSize: 270,
        cell: ({ row }) => {
            const emails = (row.original.contacts || []).filter((c: any) => c.type === 'email')
            if (emails.length === 0) return <span className="text-muted-foreground/40 text-xs">—</span>
            const e = emails[0]
            return (
                <div className="flex items-center gap-1 group/em">
                    <div className="h-5 w-5 rounded-md bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                        <Mail className="h-3 w-3 text-rose-600" />
                    </div>
                    <a href={`mailto:${e.value}`} className="text-xs hover:text-rose-600 transition-colors truncate max-w-[170px]" onClick={ev => ev.stopPropagation()}>
                        {e.value}
                    </a>
                    {emails.length > 1 && <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded">+{emails.length - 1}</span>}
                    <button onClick={ev => { ev.stopPropagation(); copyToClipboard(e.value) }} className="opacity-0 group-hover/em:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0">
                        <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                </div>
            )
        },
    },
    // ── الحالة ───────────────────────────────────────────────
    {
        accessorKey: "isActive",
        enableColumnFilter: true,
        meta: { 
            filterType: 'select' as const,
            filterOptions: [
                { label: "نشط", value: "true" },
                { label: "معطّل", value: "false" }
            ]
        },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            return String(row.original.isActive) === filterValue
        },
        header: "الحالة",
        size: 110,
        minSize: 90,
        maxSize: 130,
        cell: ({ row }) => (
            <Badge
                className={row.original.isActive
                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0"
                    : "bg-muted text-muted-foreground border-0"
                }
            >
                {row.original.isActive ? "نشط" : "معطّل"}
            </Badge>
        ),
    },




    {
        accessorKey: "lastLogin",
        enableColumnFilter: true,
        meta: { filterType: 'date-range' as const },
        filterFn: (row: any, _columnId: string, filterValue: any) => {
            const date = row.original.lastLogin ? new Date(row.original.lastLogin) : null
            if (!date) return false
            const d = date.toISOString().split('T')[0]
            if (filterValue.from && d < filterValue.from) return false
            if (filterValue.to && d > filterValue.to) return false
            return true
        },
        header: "آخر دخول",
        size: 140,
        minSize: 120,
        maxSize: 170,
        cell: ({ row }) => (
            <span className="text-xs text-muted-foreground">
                {formatDate(row.original.lastLogin)}
            </span>
        ),
    },
    {
        accessorKey: "createdAt",
        enableColumnFilter: true,
        meta: { filterType: 'date-range' as const },
        filterFn: (row: any, _columnId: string, filterValue: any) => {
            const date = new Date(row.original.createdAt)
            const d = date.toISOString().split('T')[0]
            if (filterValue.from && d < filterValue.from) return false
            if (filterValue.to && d > filterValue.to) return false
            return true
        },
        header: "تاريخ الإنشاء",
        size: 150,
        minSize: 130,
        maxSize: 180,
        cell: ({ row }) => (
            <span className="text-xs text-muted-foreground">
                {formatDate(row.original.createdAt)}
            </span>
        ),
    },
    // ── عمود الإجراءات ───────────────────────────────────────
    {
        id: "actions",
        enableColumnFilter: false,
        header: "",
        cell: ({ row }) => {
            const user = row.original

            const handleToggle = async () => {
                const res = await toggleUserActive(user.id, !user.isActive)
                if (res.success) {
                    toast.success(user.isActive ? "تم تعطيل المستخدم" : "تم تفعيل المستخدم")
                    const fresh = await getUsers()
                    if (fresh.success && fresh.data) onRefresh(fresh.data as UserRow[])
                } else {
                    toast.error(res.error)
                }
            }

            const handleDelete = async () => {
                if (!confirm(`هل تريد حذف المستخدم "${user.name}"؟`)) return
                const res = await deleteUser(user.id)
                if (res.success) {
                    toast.success("تم حذف المستخدم")
                    const fresh = await getUsers()
                    if (fresh.success && fresh.data) onRefresh(fresh.data as UserRow[])
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
                        <DropdownMenuItem
                            className="gap-2 cursor-pointer font-medium"
                            onClick={() => onEdit(user)}
                        >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                            تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer font-medium" onClick={handleToggle}>
                            {user.isActive ? (
                                <><UserX className="h-4 w-4 text-amber-500" /> تعطيل</>
                            ) : (
                                <><UserCheck className="h-4 w-4 text-emerald-500" /> تفعيل</>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-2 cursor-pointer font-medium text-destructive focus:text-destructive"
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-4 w-4" />
                            حذف
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]}
