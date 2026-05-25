"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Person } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Mail, Phone, MessageCircle, Copy, ExternalLink, Crown, Star, User, Building, Sparkles, ShieldCheck, MoreHorizontal, UserCheck, UserX, AlertTriangle, Power, Wallet, Coins, UsersRound } from "lucide-react"
import { softDeletePerson, hardDeletePerson, togglePersonActive } from "@/lib/actions/persons"
import { ContactRecord } from "@/lib/person-types"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PersonSheet } from "@/components/persons/person-sheet"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from "next/link"

const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
    }
    if (cleaned.length === 12 && cleaned.startsWith('966')) {
        return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
    }
    return phone
}

// Helper to extract contacts from relation
function getContacts(person: any): ContactRecord[] {
    if (!person.contacts || !Array.isArray(person.contacts)) return []
    return person.contacts as ContactRecord[]
}

function getContactsByType(contacts: ContactRecord[], type: string): ContactRecord[] {
    return contacts.filter(c => c.type === type)
}

const allIcons: Record<string, any> = {
    Crown, Star, User, Building, Sparkles, ShieldCheck, Mail, Phone, MessageCircle, Copy, ExternalLink, MoreHorizontal, UserCheck, UserX, AlertTriangle, Power
}

function getIcon(name: string | null) {
    if (!name) return User
    return allIcons[name] || User
}

// Helper to get contrast color for text on background
function getContrastColor(hexColor: string | null) {
    if (!hexColor) return "text-slate-600 dark:text-slate-400"
    
    // Simple heuristic: if it's very light, use dark text, etc.
    // For now, we'll just return a base set of classes that work with the background
    return "" 
}

// Contact type icons & colors
const contactTypeStyles: Record<string, { icon: typeof Phone; color: string; bgColor: string; hoverBg: string }> = {
    phone: { icon: Phone, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-500/10', hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-500/20' },
    email: { icon: Mail, color: 'text-rose-600', bgColor: 'bg-rose-50 dark:bg-rose-500/10', hoverBg: 'hover:bg-rose-100 dark:hover:bg-rose-500/20' },
    whatsapp: { icon: MessageCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10', hoverBg: 'hover:bg-emerald-100 dark:hover:bg-emerald-500/20' },
}

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('تم النسخ', { duration: 1500 })
}

export const columns: ColumnDef<Person>[] = [
    // ──────────────────────────────────────
    // Column 1: Person Name + Avatar
    // ──────────────────────────────────────
    {
        accessorKey: "name",
        header: "الشخص",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'ابحث بالاسم...' },
        size: 250,
        minSize: 200,
        maxSize: 320,
        cell: ({ row }) => {
            const name = row.getValue("name") as string
            const tags: string[] = ((row.original as any).tags || []).map((pt: any) => pt.tag?.name ?? pt)
            const initials = name ? name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : "??"

            // Color based on first letter for visual variety
            const avatarColors = [
                'bg-sky-500/10 text-sky-700 border-sky-500/20',
                'bg-violet-500/10 text-violet-700 border-violet-500/20',
                'bg-rose-500/10 text-rose-700 border-rose-500/20',
                'bg-amber-500/10 text-amber-700 border-amber-500/20',
                'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
                'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
            ]
            const colorIndex = name ? name.charCodeAt(0) % avatarColors.length : 0

            return (
                <div className="flex items-center gap-2.5 py-1">
                    <Avatar className={`h-8 w-8 border shadow-sm shrink-0 ${avatarColors[colorIndex]}`}>
                        <AvatarFallback className={`font-bold text-[11px] ${avatarColors[colorIndex]}`}>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm truncate max-w-[190px]" title={tags.length > 0 ? tags.join('، ') : undefined}>
                            {name || "بدون اسم"}
                        </span>
                        {tags.length > 0 && (
                            <span className="text-[10px] text-muted-foreground/60 truncate max-w-[190px]">
                                {tags.slice(0, 2).join(' · ')}{tags.length > 2 ? ` +${tags.length - 2}` : ''}
                            </span>
                        )}
                    </div>
                </div>
            )
        }
    },

    // ──────────────────────────────────────
    // Column 1.5: Group Name
    // ──────────────────────────────────────
    {
        accessorKey: "groupName",
        header: "المجموعة",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'ابحث بالمجموعة...' },
        size: 160,
        minSize: 130,
        maxSize: 210,
        cell: ({ row }) => {
            const groupName = (row.original as any).groupName
            if (!groupName) return <span className="text-muted-foreground text-xs">—</span>
            return (
                <div className="flex items-center gap-1.5">
                    <div className="size-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <UsersRound className="size-3 text-primary" />
                    </div>
                    <span className="text-xs font-medium truncate max-w-[140px]">{groupName}</span>
                </div>
            )
        }
    },

    // ──────────────────────────────────────
    // Column 1.6: Group Number
    // ──────────────────────────────────────
    {
        accessorKey: "groupNumber",
        header: "رقم المجموعة",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const },
        size: 150,
        minSize: 120,
        maxSize: 180,
        cell: ({ row }) => {
            const groupNumber = (row.original as any).groupNumber
            if (!groupNumber) return <span className="text-muted-foreground text-xs">—</span>
            return (
                <span className="font-mono text-[11px] text-muted-foreground">
                    {groupNumber}
                </span>
            )
        }
    },



    // ──────────────────────────────────────
    // Column 2.5: Price Labels
    // ──────────────────────────────────────
    {
        id: "priceLabels",
        accessorFn: (row: any) => row.priceLabels,
        header: "التسعيرات",
        enableColumnFilter: true,
        meta: {
            filterType: 'select' as const,
            filterOptions: [
                { label: "جملة", value: "جملة" },
                { label: "مفرق", value: "مفرق" },
                { label: "خاص", value: "خاص" },
            ]
        },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            const priceLabels = row.original.priceLabels || []
            return priceLabels.some((pl: any) => pl.priceLabel?.name?.includes(filterValue))
        },
        size: 190,
        minSize: 150,
        maxSize: 240,
        cell: ({ row }) => {
            const priceLabels = (row.original as any).priceLabels || []
            if (priceLabels.length === 0) return <span className="text-muted-foreground text-xs text-center block">-</span>

            const displayLabels = priceLabels.slice(0, 2)
            const remaining = priceLabels.length - 2

            return (
                <div className="flex flex-wrap gap-1.5 items-center justify-center max-w-[150px] text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                    <Wallet className="h-3 w-3 opacity-70" />
                    <span className="truncate" title={displayLabels.map((pl: any) => pl.priceLabel?.name || "بدون اسم").join("، ")}>
                        {displayLabels.map((pl: any) => pl.priceLabel?.name || "بدون اسم").join("، ")}
                    </span>
                    {remaining > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                            +{remaining}
                        </span>
                    )}
                </div>
            )
        }
    },

    // ──────────────────────────────────────
    // Column 2.6: Currencies
    // ──────────────────────────────────────
    {
        id: "currencies",
        accessorFn: (row: any) => row.resolvedCurrencies,
        header: "العملات",
        enableColumnFilter: true,
        meta: {
            filterType: 'select' as const,
            filterOptions: [
                { label: "ريال سعودي", value: "SAR" },
                { label: "دولار أمريكي", value: "USD" },
                { label: "درهم إماراتي", value: "AED" },
            ]
        },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            const resolvedCurrencies = row.original.resolvedCurrencies || []
            return resolvedCurrencies.some((c: any) => c.symbol === filterValue || c.code === filterValue || c.name?.includes(filterValue))
        },
        size: 170,
        minSize: 130,
        maxSize: 210,
        cell: ({ row }) => {
            const resolvedCurrencies = (row.original as any).resolvedCurrencies || []
            if (resolvedCurrencies.length === 0) return <span className="text-muted-foreground text-xs text-center block">-</span>

            const displayCurrencies = resolvedCurrencies.slice(0, 2)
            const remaining = resolvedCurrencies.length - 2

            return (
                <div className="flex flex-wrap gap-1.5 items-center justify-center max-w-[150px] text-xs text-amber-700 dark:text-amber-400 font-medium">
                    <Coins className="h-3 w-3 opacity-70" />
                    <span className="truncate" title={displayCurrencies.map((c: any) => c.symbol).join("، ")}>
                        {displayCurrencies.map((c: any) => c.symbol).join("، ")}
                    </span>
                    {remaining > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                            +{remaining}
                        </span>
                    )}
                </div>
            )
        }
    },

    // ──────────────────────────────────────
    // Column 3.5: Source
    // ──────────────────────────────────────
    {
        accessorKey: "source",
        header: "المصدر",
        enableColumnFilter: true,
        meta: { 
            filterType: 'select' as const,
            filterOptions: [
                { label: "تسجيل النظام", value: "SYSTEM" },
                { label: "منصة خارجية", value: "EXTERNAL" },
                { label: "مستورد", value: "IMPORTED" },
                { label: "تطبيق", value: "APP" },
                { label: "أخرى", value: "OTHER" },
                { label: "api", value: "api" },
            ] 
        },
        size: 120,
        minSize: 100,
        maxSize: 160,
        cell: ({ row }) => {
            const source = row.original.source
            if (!source) return <span className="text-muted-foreground text-xs text-center block">-</span>
            return (
                <div className="flex justify-center">
                    <Badge variant="outline" className="text-[10px] font-medium bg-muted/50 text-muted-foreground border-border/50">
                        {source}
                    </Badge>
                </div>
            )
        }
    },

    // ──────────────────────────────────────
    // Column 3a: Phone
    // ──────────────────────────────────────
    {
        id: "phone",
        accessorFn: (row: any) => row.contacts,
        header: "الهاتف",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'رقم الهاتف...' },
        filterFn: (row: any, _: string, filterValue: string) => {
            const phones = getContactsByType(getContacts(row.original), 'phone')
            return phones.some(p => p.value.includes(filterValue))
        },
        size: 190,
        minSize: 160,
        maxSize: 220,
        cell: ({ row }) => {
            const phones = getContactsByType(getContacts(row.original), 'phone')
            if (phones.length === 0) return <span className="text-muted-foreground/40 text-xs">—</span>
            const primary = phones[0]
            return (
                <div className="flex items-center gap-1 group/phone">
                    <div className="h-5 w-5 rounded-md bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Phone className="h-3 w-3 text-blue-600" />
                    </div>
                    <a
                        href={`tel:${primary.value}`}
                        className="font-mono text-xs font-medium hover:text-blue-600 transition-colors"
                        dir="ltr"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {formatPhoneNumber(primary.value)}
                    </a>
                    {phones.length > 1 && (
                        <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded shrink-0">+{phones.length - 1}</span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(primary.value) }}
                        className="opacity-0 group-hover/phone:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0"
                    >
                        <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                </div>
            )
        }
    },

    // ──────────────────────────────────────
    // Column 3b: WhatsApp
    // ──────────────────────────────────────
    {
        id: "whatsapp",
        accessorFn: (row: any) => row.contacts,
        header: "واتساب",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'رقم واتساب...' },
        filterFn: (row: any, _: string, filterValue: string) => {
            const wa = getContactsByType(getContacts(row.original), 'whatsapp')
            return wa.some(p => p.value.includes(filterValue))
        },
        size: 170,
        minSize: 145,
        maxSize: 210,
        cell: ({ row }) => {
            const wa = getContactsByType(getContacts(row.original), 'whatsapp')
            if (wa.length === 0) return <span className="text-muted-foreground/40 text-xs">—</span>
            const primary = wa[0]
            const waLink = `https://wa.me/${primary.value.replace(/\D/g, '').replace(/^0/, '966')}`
            return (
                <div className="flex items-center gap-1 group/wa">
                    <div className="h-5 w-5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <MessageCircle className="h-3 w-3 text-emerald-600" />
                    </div>
                    <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-medium hover:text-emerald-600 transition-colors"
                        dir="ltr"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {formatPhoneNumber(primary.value)}
                    </a>
                    {wa.length > 1 && (
                        <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded shrink-0">+{wa.length - 1}</span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(primary.value) }}
                        className="opacity-0 group-hover/wa:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0"
                    >
                        <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                </div>
            )
        }
    },

    // ──────────────────────────────────────
    // Column 3c: Email
    // ──────────────────────────────────────
    {
        id: "email",
        accessorFn: (row: any) => row.contacts,
        header: "البريد",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'البريد الإلكتروني...' },
        filterFn: (row: any, _: string, filterValue: string) => {
            const emails = getContactsByType(getContacts(row.original), 'email')
            return emails.some(e => e.value.toLowerCase().includes(filterValue.toLowerCase()))
        },
        size: 220,
        minSize: 180,
        maxSize: 270,
        cell: ({ row }) => {
            const emails = getContactsByType(getContacts(row.original), 'email')
            if (emails.length === 0) return <span className="text-muted-foreground/40 text-xs">—</span>
            const primary = emails[0]
            return (
                <div className="flex items-center gap-1 group/email">
                    <div className="h-5 w-5 rounded-md bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                        <Mail className="h-3 w-3 text-rose-600" />
                    </div>
                    <a
                        href={`mailto:${primary.value}`}
                        className="text-xs hover:text-rose-600 transition-colors truncate max-w-[170px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {primary.value}
                    </a>
                    {emails.length > 1 && (
                        <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded shrink-0">+{emails.length - 1}</span>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(primary.value) }}
                        className="opacity-0 group-hover/email:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0"
                    >
                        <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                </div>
            )
        }
    },

    // ──────────────────────────────────────
    // Column 5.4: Active Status
    // ──────────────────────────────────────
    {
        accessorKey: "isActive",
        header: "الحالة",
        enableColumnFilter: true,
        meta: { 
            filterType: 'select' as const,
            filterOptions: [
                { label: "نشط", value: "true" },
                { label: "غير نشط", value: "false" }
            ]
        },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            const isActive = row.original.isActive
            return String(isActive) === filterValue
        },
        size: 100,
        minSize: 90,
        maxSize: 120,
        cell: ({ row }) => {
            const isActive = row.original.isActive
            return (
                <div className="flex justify-center">
                    <Badge variant={isActive ? "secondary" : "outline"} className={`text-[10px] font-medium ${isActive ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}`}>
                        {isActive ? "نشط" : "غير نشط"}
                    </Badge>
                </div>
            )
        }
    },

    // ──────────────────────────────────────
    // Column 6: Actions (Dropdown Menu)
    // ──────────────────────────────────────
    {
        id: "actions",
        enableColumnFilter: false,
        size: 70,
        minSize: 60,
        maxSize: 80,
        cell: ({ row }) => {
            const person = row.original

            return (
                <div className="flex items-center justify-end gap-1">
                    {/* Status indicator dot */}
                    <Tooltip delayDuration={300}>
                        <TooltipProvider>
                            <TooltipTrigger asChild>
                                <div className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors ${person.isActive
                                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                                    : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.4)]'
                                    }`} />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                                {person.isActive ? 'نشط' : 'غير نشط'}
                            </TooltipContent>
                        </TooltipProvider>
                    </Tooltip>

                    <AlertDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted transition-colors">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    إجراءات
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {/* Edit */}
                                <PersonSheet
                                    key={`edit-${person.id}`}
                                    person={person}
                                    trigger={
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                            <Edit className="h-4 w-4 ml-2 text-blue-500" />
                                            <span>تعديل</span>
                                        </DropdownMenuItem>
                                    }
                                />

                                {/* Toggle Active / Inactive */}
                                <DropdownMenuItem
                                    onClick={async () => {
                                        toast.promise(
                                            togglePersonActive(person.id, !person.isActive),
                                            {
                                                loading: person.isActive ? 'جاري إلغاء التفعيل...' : 'جاري التفعيل...',
                                                success: person.isActive ? 'تم إلغاء تفعيل الشخص' : 'تم تفعيل الشخص',
                                                error: 'فشل تحديث الحالة'
                                            }
                                        )
                                    }}
                                >
                                    {person.isActive ? (
                                        <>
                                            <UserX className="h-4 w-4 ml-2 text-amber-500" />
                                            <span>إلغاء التفعيل</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserCheck className="h-4 w-4 ml-2 text-emerald-500" />
                                            <span>تفعيل</span>
                                        </>
                                    )}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {/* Hard Delete - with confirmation */}
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-500/10">
                                        <Trash2 className="h-4 w-4 ml-2" />
                                        <span>حذف نهائي</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Hard Delete Confirmation Dialog */}
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                    تأكيد الحذف النهائي
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-right leading-relaxed">
                                    هل أنت متأكد من حذف الشخص <strong className="text-foreground">{person.name}</strong> نهائياً؟
                                    <br />
                                    <span className="text-red-500 font-medium">
                                        هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع البيانات المرتبطة.
                                    </span>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-row-reverse gap-2">
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    onClick={async () => {
                                        toast.promise(hardDeletePerson(person.id), {
                                            loading: 'جاري الحذف النهائي...',
                                            success: 'تم حذف الشخص نهائياً',
                                            error: 'فشل الحذف النهائي'
                                        })
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 ml-2" />
                                    حذف نهائي
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )
        }
    },
]
