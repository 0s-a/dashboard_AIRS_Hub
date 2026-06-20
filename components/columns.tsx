"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Customer } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Mail, Phone, MessageCircle, Copy, ExternalLink, Crown, Star, User, Building, Sparkles, ShieldCheck, MoreHorizontal, UserCheck, UserX, AlertTriangle, Power, Wallet, Coins, UsersRound } from "lucide-react"
import { hardDeleteCustomer, toggleCustomerActive } from "@/lib/actions/customers"
import { ContactRecord } from "@/lib/customer-types"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CustomerSheet } from "@/components/customers/customer-sheet"
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
function getContacts(customer: any): ContactRecord[] {
    if (!customer.contacts || !Array.isArray(customer.contacts)) return []
    return customer.contacts as ContactRecord[]
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

export const columns: ColumnDef<Customer>[] = [
    // ──────────────────────────────────────
    // Column 1: Customer Name + Avatar
    // ──────────────────────────────────────
    {
        accessorKey: "name",
        header: "العميل",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'ابحث بالاسم...' },
        size: 250,
        minSize: 200,
        maxSize: 320,
        cell: ({ row }) => {
            const name = row.getValue("name") as string
            const id = (row.original as any).id as string
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
                        <Link
                            href={`/customers/${id}`}
                            className="font-semibold text-sm truncate max-w-[190px] hover:text-primary hover:underline underline-offset-2 transition-colors"
                            title={name || undefined}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {name || "بدون اسم"}
                        </Link>
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
    // Column 2.5: نوع العميل (Price Label)
    // ──────────────────────────────────────
    {
        id: "priceLabel",
        accessorFn: (row: any) => row.priceLabel?.name,
        header: "نوع العميل",
        enableColumnFilter: true,
        meta: {
            filterType: 'text' as const,
            filterPlaceholder: 'بحث بنوع العميل...'
        },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            const pl = row.original.priceLabel
            if (!pl) return false
            return (
                pl.name?.toLowerCase().includes(filterValue.toLowerCase()) ||
                pl.customerType?.toLowerCase().includes(filterValue.toLowerCase())
            )
        },
        size: 190,
        minSize: 150,
        maxSize: 240,
        cell: ({ row }) => {
            const pl = (row.original as any).priceLabel
            if (!pl) return <span className="text-muted-foreground text-xs text-center block">-</span>
            return (
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-400">{pl.name}</span>
                    {pl.customerType && (
                        <span className="text-[10px] text-muted-foreground">{pl.customerType}</span>
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
    // Column 3: معلومات الاتصال
    // ──────────────────────────────────────
    {
        id: "contacts",
        accessorFn: (row: any) => row.contacts,
        header: "معلومات الاتصال",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'بحث في الاتصال...' },
        filterFn: (row: any, _: string, filterValue: string) => {
            const contacts = getContacts(row.original)
            return contacts.some(c => c.value.toLowerCase().includes(filterValue.toLowerCase()))
        },
        size: 240,
        minSize: 200,
        maxSize: 300,
        cell: ({ row }) => {
            const contacts = getContacts(row.original)
            const phones = getContactsByType(contacts, 'phone')
            const whatsapp = getContactsByType(contacts, 'whatsapp')
            const emails = getContactsByType(contacts, 'email')

            if (contacts.length === 0) return <span className="text-muted-foreground/40 text-xs">—</span>

            return (
                <div className="flex flex-col gap-1 py-1">
                    {/* Phones */}
                    {phones.map((phone, i) => (
                        <div key={phone.id || i} className="flex items-center gap-1.5 group/phone text-xs py-0.5">
                            <a
                                href={`tel:${phone.value}`}
                                className="font-mono text-xs font-medium hover:text-blue-600 transition-colors text-muted-foreground hover:text-foreground"
                                dir="ltr"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {formatPhoneNumber(phone.value)}
                            </a>
                            {phone.label && (
                                <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded shrink-0">
                                    {phone.label}
                                </span>
                            )}
                            {phone.isPrimary && (
                                <span className="text-[9px] text-blue-600 bg-blue-500/10 px-1 rounded shrink-0">أساسي</span>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(phone.value) }}
                                className="opacity-0 group-hover/phone:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0"
                            >
                                <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                            </button>
                        </div>
                    ))}

                    {/* WhatsApp */}
                    {whatsapp.map((wa, i) => (
                        <div key={wa.id || i} className="flex items-center gap-1.5 group/wa text-xs py-0.5">
                            <a
                                href={`https://wa.me/${wa.value.replace(/\D/g, '').replace(/^0/, '966')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs font-medium hover:text-emerald-600 transition-colors text-muted-foreground hover:text-foreground"
                                dir="ltr"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {formatPhoneNumber(wa.value)}
                            </a>
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 opacity-80">(واتساب)</span>
                            {wa.label && (
                                <span className="text-[9px] text-muted-foreground bg-muted/60 px-1 rounded shrink-0">
                                    {wa.label}
                                </span>
                            )}
                            {wa.isPrimary && (
                                <span className="text-[9px] text-emerald-600 bg-emerald-500/10 px-1 rounded shrink-0">أساسي</span>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(wa.value) }}
                                className="opacity-0 group-hover/wa:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0"
                            >
                                <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                            </button>
                        </div>
                    ))}

                    {/* Email */}
                    {emails.map((email, i) => (
                        <div key={email.id || i} className="flex items-center gap-1.5 group/email text-xs py-0.5">
                            <a
                                href={`mailto:${email.value}`}
                                className="text-xs hover:text-rose-600 transition-colors truncate max-w-[150px] text-muted-foreground hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                            >
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
                            <button
                                onClick={(e) => { e.stopPropagation(); copyToClipboard(email.value) }}
                                className="opacity-0 group-hover/email:opacity-100 h-4 w-4 flex items-center justify-center rounded hover:bg-muted transition-all shrink-0"
                            >
                                <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                            </button>
                        </div>
                    ))}
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
            const customer = row.original

            return (
                <div className="flex items-center justify-end gap-1">
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

                                {/* View Profile */}
                                <DropdownMenuItem asChild>
                                    <Link href={`/customers/${customer.id}`} className="flex items-center cursor-pointer">
                                        <ExternalLink className="h-4 w-4 ml-2 text-violet-500" />
                                        <span>عرض الملف الشخصي</span>
                                    </Link>
                                </DropdownMenuItem>

                                {/* Edit */}
                                <CustomerSheet
                                    key={`edit-${customer.id}`}
                                    customer={customer}
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
                                            toggleCustomerActive(customer.id, !customer.isActive),
                                            {
                                                loading: customer.isActive ? 'جاري إلغاء التفعيل...' : 'جاري التفعيل...',
                                                success: customer.isActive ? 'تم إلغاء تفعيل العميل' : 'تم تفعيل العميل',
                                                error: 'فشل تحديث الحالة'
                                            }
                                        )
                                    }}
                                >
                                    {customer.isActive ? (
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
                                    هل أنت متأكد من حذف العميل <strong className="text-foreground">{customer.name}</strong> نهائياً؟
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
                                        toast.promise(hardDeleteCustomer(customer.id), {
                                            loading: 'جاري الحذف النهائي...',
                                            success: 'تم حذف العميل نهائياً',
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
