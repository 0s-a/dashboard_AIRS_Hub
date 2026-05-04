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
        header: "المستخدم",
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <UserAvatar name={row.original.name} color={row.original.color} size="sm" />
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm">{row.original.name}</span>
                        {row.original.role === "admin" && (
                            <ShieldCheck className="size-3.5 text-primary" />
                        )}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">@{row.original.username}</span>
                </div>
            </div>
        ),
    },
    {
        accessorKey: "role",
        header: "الدور",
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
    // ── عمود معلومات الاتصال ─────────────────────────────────
    {
        id: "contacts",
        header: "معلومات الاتصال",
        cell: ({ row }) => {
            const contacts = row.original.contacts || []

            if (contacts.length === 0) {
                return (
                    <div className="flex items-center gap-2 py-1">
                        <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground/40" />
                        </div>
                        <span className="text-xs text-muted-foreground/60 italic">لا توجد بيانات اتصال</span>
                    </div>
                )
            }

            const phones    = contacts.filter(c => c.type === 'phone')
            const whatsapps = contacts.filter(c => c.type === 'whatsapp')
            const emails    = contacts.filter(c => c.type === 'email')

            return (
                <TooltipProvider>
                    <div className="flex flex-col gap-1.5 py-1 max-w-[260px]">
                        {/* هواتف */}
                        {phones.map((c, i) => {
                            const style = contactTypeStyles.phone
                            const Icon  = style.icon
                            return (
                                <div key={`ph-${i}`} className="group flex items-center gap-2">
                                    <div className={`h-7 w-7 rounded-lg ${style.bgColor} flex items-center justify-center shrink-0 transition-colors ${style.hoverBg}`}>
                                        <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                                    </div>
                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                        <a href={`tel:${c.value}`} className="font-mono text-xs font-medium hover:text-blue-600 transition-colors truncate" dir="ltr">
                                            {formatPhoneNumber(c.value)}
                                        </a>
                                        {c.isPrimary && <span className="text-[9px] px-1 py-px rounded bg-blue-500/10 text-blue-600 font-medium shrink-0">أساسي</span>}
                                        {c.label    && <span className="text-[9px] text-muted-foreground shrink-0">({c.label})</span>}
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <button onClick={() => copyToClipboard(c.value)} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
                                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">نسخ</TooltipContent>
                                        </Tooltip>
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <a href={`https://wa.me/${c.value.replace(/\D/g, '').replace(/^0/, '966')}`} target="_blank" rel="noopener noreferrer" className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                                                    <MessageCircle className="h-3 w-3 text-emerald-600" />
                                                </a>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">واتساب</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            )
                        })}
                        {/* واتساب */}
                        {whatsapps.map((c, i) => {
                            const style = contactTypeStyles.whatsapp
                            const Icon  = style.icon
                            return (
                                <div key={`wa-${i}`} className="group flex items-center gap-2">
                                    <div className={`h-7 w-7 rounded-lg ${style.bgColor} flex items-center justify-center shrink-0 transition-colors ${style.hoverBg}`}>
                                        <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                                    </div>
                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                        <a href={`https://wa.me/${c.value.replace(/\D/g, '').replace(/^0/, '966')}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs font-medium hover:text-emerald-600 transition-colors truncate" dir="ltr">
                                            {formatPhoneNumber(c.value)}
                                        </a>
                                        {c.isPrimary && <span className="text-[9px] px-1 py-px rounded bg-emerald-500/10 text-emerald-600 font-medium shrink-0">أساسي</span>}
                                        {c.label    && <span className="text-[9px] text-muted-foreground shrink-0">({c.label})</span>}
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <button onClick={() => copyToClipboard(c.value)} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
                                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">نسخ</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            )
                        })}
                        {/* بريد إلكتروني */}
                        {emails.map((c, i) => {
                            const style = contactTypeStyles.email
                            const Icon  = style.icon
                            return (
                                <div key={`em-${i}`} className="group flex items-center gap-2">
                                    <div className={`h-7 w-7 rounded-lg ${style.bgColor} flex items-center justify-center shrink-0 transition-colors ${style.hoverBg}`}>
                                        <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                                    </div>
                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                        <a href={`mailto:${c.value}`} className="text-xs hover:text-rose-600 transition-colors truncate">
                                            {c.value}
                                        </a>
                                        {c.isPrimary && <span className="text-[9px] px-1 py-px rounded bg-rose-500/10 text-rose-600 font-medium shrink-0">أساسي</span>}
                                        {c.label    && <span className="text-[9px] text-muted-foreground shrink-0">({c.label})</span>}
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <button onClick={() => copyToClipboard(c.value)} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors">
                                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">نسخ</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </TooltipProvider>
            )
        },
    },
    // ── الحالة ───────────────────────────────────────────────
    {
        accessorKey: "isActive",
        header: "الحالة",
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
        header: "آخر دخول",
        cell: ({ row }) => (
            <span className="text-xs text-muted-foreground">
                {formatDate(row.original.lastLogin)}
            </span>
        ),
    },
    {
        accessorKey: "createdAt",
        header: "تاريخ الإنشاء",
        cell: ({ row }) => (
            <span className="text-xs text-muted-foreground">
                {formatDate(row.original.createdAt)}
            </span>
        ),
    },
    // ── عمود الإجراءات ───────────────────────────────────────
    {
        id: "actions",
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
