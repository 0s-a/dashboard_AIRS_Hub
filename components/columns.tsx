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
        size: 220,
        minSize: 180,
        maxSize: 280,
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
                <div className="flex items-center gap-3 py-1.5">
                    <Avatar className={`h-10 w-10 border shadow-sm ${avatarColors[colorIndex]}`}>
                        <AvatarFallback className={`font-bold text-xs ${avatarColors[colorIndex]}`}>
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-semibold text-sm truncate max-w-[160px]">{name || "بدون اسم"}</span>
                        {tags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {tags.slice(0, 2).map((tag, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/10">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )
        }
    },

    // ──────────────────────────────────────
    // Column 1.5: Group (inline from Person)
    // ──────────────────────────────────────
    {
        id: "group",
        header: "المجموعة",
        size: 150,
        minSize: 120,
        maxSize: 200,
        cell: ({ row }) => {
            const groupName = (row.original as any).groupName
            const groupNumber = (row.original as any).groupNumber
            if (!groupName && !groupNumber) return <span className="text-muted-foreground text-xs text-center block">-</span>

            return (
                <div className="flex items-center gap-1.5">
                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <UsersRound className="size-3.5 text-primary" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        {groupName && <span className="text-xs font-semibold truncate max-w-[120px]">{groupName}</span>}
                        {groupNumber && <span className="text-[10px] font-mono text-muted-foreground">{groupNumber}</span>}
                    </div>
                </div>
            )
        }
    },



    // ──────────────────────────────────────
    // Column 2.5: Price Labels
    // ──────────────────────────────────────
    {
        id: "priceLabels",
        header: "التسعيرات",
        size: 160,
        minSize: 120,
        maxSize: 200,
        cell: ({ row }) => {
            const priceLabels = (row.original as any).priceLabels || []
            if (priceLabels.length === 0) return <span className="text-muted-foreground text-xs text-center block">-</span>

            const displayLabels = priceLabels.slice(0, 2)
            const remaining = priceLabels.length - 2

            return (
                <div className="flex flex-wrap gap-1.5 items-center justify-center max-w-[150px]">
                    {displayLabels.map((pl: any, i: number) => (
                        <Badge 
                            key={i} 
                            variant="secondary" 
                            className="text-[10px] py-0 px-1.5 font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 flex items-center gap-1"
                        >
                            <Wallet className="h-3 w-3 opacity-70" />
                            <span className="truncate max-w-[80px]">{pl.priceLabel?.name || "بدون اسم"}</span>
                        </Badge>
                    ))}
                    {remaining > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium border-dashed text-muted-foreground">
                            +{remaining}
                        </Badge>
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
        header: "العملات",
        size: 140,
        minSize: 100,
        maxSize: 180,
        cell: ({ row }) => {
            const resolvedCurrencies = (row.original as any).resolvedCurrencies || []
            if (resolvedCurrencies.length === 0) return <span className="text-muted-foreground text-xs text-center block">-</span>

            const displayCurrencies = resolvedCurrencies.slice(0, 2)
            const remaining = resolvedCurrencies.length - 2

            return (
                <div className="flex flex-wrap gap-1.5 items-center justify-center max-w-[150px]">
                    {displayCurrencies.map((c: any, i: number) => (
                        <Badge 
                            key={i} 
                            variant="secondary" 
                            className="text-[10px] py-0 px-1.5 font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 flex items-center gap-1"
                        >
                            <Coins className="h-3 w-3 opacity-70" />
                            <span className="truncate max-w-[80px]">{c.symbol}</span>
                        </Badge>
                    ))}
                    {remaining > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium border-dashed text-muted-foreground">
                            +{remaining}
                        </Badge>
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
        size: 90,
        minSize: 80,
        maxSize: 120,
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
    // Column 3: Contact Information (Professional)
    // ──────────────────────────────────────
    {
        id: "contacts",
        header: "معلومات الاتصال",
        size: 260,
        minSize: 200,
        maxSize: 320,
        cell: ({ row }) => {
            const contacts = getContacts(row.original)

            if (contacts.length === 0) {
                return (
                    <div className="flex items-center gap-2 px-2 py-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground/40" />
                        </div>
                        <span className="text-xs text-muted-foreground/60 italic">لا توجد بيانات اتصال</span>
                    </div>
                )
            }

            const phones = getContactsByType(contacts, 'phone')
            const emails = getContactsByType(contacts, 'email')
            const whatsapps = getContactsByType(contacts, 'whatsapp')

            return (
                <TooltipProvider>
                    <div className="flex flex-col gap-1.5 py-1.5 max-w-[280px]">
                        {/* Phone Numbers */}
                        {phones.map((contact, i) => {
                            const style = contactTypeStyles.phone
                            const Icon = style.icon
                            return (
                                <div key={`phone-${i}`} className="group flex items-center gap-2">
                                    <div className={`h-7 w-7 rounded-lg ${style.bgColor} flex items-center justify-center shrink-0 transition-colors ${style.hoverBg}`}>
                                        <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                                    </div>
                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                        <a
                                            href={`tel:${contact.value}`}
                                            className="font-mono text-xs font-medium hover:text-blue-600 transition-colors truncate"
                                            dir="ltr"
                                        >
                                            {formatPhoneNumber(contact.value)}
                                        </a>
                                        {contact.isPrimary && (
                                            <span className="text-[9px] px-1 py-px rounded bg-blue-500/10 text-blue-600 font-medium shrink-0">أساسي</span>
                                        )}
                                        {contact.label && (
                                            <span className="text-[9px] text-muted-foreground shrink-0">({contact.label})</span>
                                        )}
                                    </div>
                                    {/* Action buttons - show on hover */}
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => copyToClipboard(contact.value)}
                                                    className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                                                >
                                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">نسخ</TooltipContent>
                                        </Tooltip>
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <a
                                                    href={`https://wa.me/${contact.value.replace(/\D/g, '').replace(/^0/, '966')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                                                >
                                                    <MessageCircle className="h-3 w-3 text-emerald-600" />
                                                </a>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">واتساب</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            )
                        })}

                        {/* WhatsApp Numbers (if separate from phone) */}
                        {whatsapps.map((contact, i) => {
                            const style = contactTypeStyles.whatsapp
                            const Icon = style.icon
                            return (
                                <div key={`wa-${i}`} className="group flex items-center gap-2">
                                    <div className={`h-7 w-7 rounded-lg ${style.bgColor} flex items-center justify-center shrink-0 transition-colors ${style.hoverBg}`}>
                                        <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                                    </div>
                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                        <a
                                            href={`https://wa.me/${contact.value.replace(/\D/g, '').replace(/^0/, '966')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono text-xs font-medium hover:text-emerald-600 transition-colors truncate"
                                            dir="ltr"
                                        >
                                            {formatPhoneNumber(contact.value)}
                                        </a>
                                        {contact.isPrimary && (
                                            <span className="text-[9px] px-1 py-px rounded bg-emerald-500/10 text-emerald-600 font-medium shrink-0">أساسي</span>
                                        )}
                                        {contact.label && (
                                            <span className="text-[9px] text-muted-foreground shrink-0">({contact.label})</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => copyToClipboard(contact.value)}
                                                    className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                                                >
                                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="text-xs">نسخ</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Email Addresses */}
                        {emails.map((contact, i) => {
                            const style = contactTypeStyles.email
                            const Icon = style.icon
                            return (
                                <div key={`email-${i}`} className="group flex items-center gap-2">
                                    <div className={`h-7 w-7 rounded-lg ${style.bgColor} flex items-center justify-center shrink-0 transition-colors ${style.hoverBg}`}>
                                        <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                                    </div>
                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                        <a
                                            href={`mailto:${contact.value}`}
                                            className="text-xs hover:text-rose-600 transition-colors truncate"
                                        >
                                            {contact.value}
                                        </a>
                                        {contact.isPrimary && (
                                            <span className="text-[9px] px-1 py-px rounded bg-rose-500/10 text-rose-600 font-medium shrink-0">أساسي</span>
                                        )}
                                        {contact.label && (
                                            <span className="text-[9px] text-muted-foreground shrink-0">({contact.label})</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Tooltip delayDuration={300}>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => copyToClipboard(contact.value)}
                                                    className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                                                >
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
        }
    },

    // ──────────────────────────────────────
    // Column 5.4: Active Status
    // ──────────────────────────────────────
    {
        accessorKey: "isActive",
        header: "الحالة",
        size: 80,
        minSize: 70,
        maxSize: 100,
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
