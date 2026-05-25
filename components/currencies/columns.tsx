"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { SerializedCurrency } from "@/app/(dashboard)/currencies/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Edit, Trash2, Star, StarOff, ArrowLeftRight, TrendingDown } from "lucide-react"
import { deleteCurrency, setDefaultCurrency, toggleCurrencyActive } from "@/lib/actions/currencies"
import { toast } from "sonner"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

function dispatchEdit(currency: SerializedCurrency) {
    window.dispatchEvent(new CustomEvent("edit-currency", { detail: currency }))
}

export const columns: ColumnDef<SerializedCurrency>[] = [
    {
        accessorKey: "itemNumber",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'الرقم...' },
        header: "الرقم",
        cell: ({ row }) => (
            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                {row.original.itemNumber}
            </span>
        ),
        size: 80,
    },
    {
        accessorKey: "name",
        enableColumnFilter: true,
        meta: { filterType: 'text' as const, filterPlaceholder: 'اسم العملة...' },
        header: "العملة",
        cell: ({ row }) => {
            const c = row.original
            return (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                        <span className="text-sm font-bold text-primary">{c.symbol}</span>
                    </div>
                    <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{c.code}</p>
                    </div>
                </div>
            )
        }
    },
    {
        accessorKey: "exchangeRate",
        enableColumnFilter: false,
        header: () => (
            <div className="flex items-center gap-1.5">
                <ArrowLeftRight className="size-3.5 text-muted-foreground" />
                سعر الصرف
            </div>
        ),
        cell: ({ row, table }) => {
            const c = row.original
            const allRows = table.getCoreRowModel().rows
            const baseCurrency = allRows.find(r => r.original.isDefault)?.original

            if (c.isDefault) {
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/30 text-[10px] gap-1">
                        <Star className="size-2.5 fill-current" />
                        عملة رئيسية
                    </Badge>
                )
            }

            const rate = c.exchangeRate != null ? Number(c.exchangeRate) : null

            if (rate === null) {
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground/50 italic">لم يُحدَّد</span>
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger>
                                    <div className="size-1.5 rounded-full bg-destructive/50 animate-pulse" />
                                </TooltipTrigger>
                                <TooltipContent className="text-[11px]">
                                    هذه العملة لا يمكن استخدامها في التسعير التلقائي<br />
                                    — أضف سعر الصرف من خيار التعديل
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                )
            }

            const baseSymbol = baseCurrency?.symbol ?? "؟"

            return (
                <div className="space-y-0.5">
                    {/* Rate display: how many of this currency = 1 of base */}
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xs text-muted-foreground">1 {baseSymbol} =</span>
                        <span className="font-mono font-bold text-sm tabular-nums">
                            {rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">{c.symbol}</span>
                    </div>
                    {/* Inverse */}
                    <div className="text-[10px] text-muted-foreground/50 font-mono">
                        1 {c.symbol} = {(1 / rate).toFixed(6)} {baseSymbol}
                    </div>
                </div>
            )
        }
    },
    {
        accessorKey: "isDefault",
        enableColumnFilter: false,
        header: "الرئيسية",
        cell: ({ row }) => {
            const c = row.original
            if (c.isDefault) {
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/30 gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        رئيسية
                    </Badge>
                )
            }
            return (
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-amber-600"
                    onClick={async () => {
                        const res = await setDefaultCurrency(c.id)
                        if (res.success) toast.success("تم تعيينها كعملة رئيسية")
                        else toast.error(res.error)
                    }}
                >
                    <StarOff className="h-3 w-3" />
                    تعيين رئيسية
                </Button>
            )
        }
    },
    {
        accessorKey: "isActive",
        enableColumnFilter: true,
        meta: { filterType: 'boolean' as const },
        filterFn: (row: any, _columnId: string, filterValue: string) => {
            return String(row.original.isActive) === filterValue
        },
        header: "الحالة",
        cell: ({ row }) => {
            const c = row.original
            return (
                <div className="flex items-center gap-2">
                    <Switch
                        checked={c.isActive}
                        onCheckedChange={async (checked) => {
                            const res = await toggleCurrencyActive(c.id, checked)
                            if (res.success) toast.success(checked ? "تم تفعيل العملة" : "تم إيقاف العملة")
                            else toast.error(res.error)
                        }}
                    />
                    <span className={`text-xs font-medium ${c.isActive ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {c.isActive ? "مفعّل" : "موقوف"}
                    </span>
                </div>
            )
        }
    },
    {
        id: "actions",
        enableColumnFilter: false,
        header: "الإجراءات",
        cell: ({ row }) => {
            const c = row.original
            return (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => dispatchEdit(c)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={c.isDefault}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>حذف العملة "{c.name}"</AlertDialogTitle>
                                <AlertDialogDescription>
                                    هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد من حذف هذه العملة؟
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive hover:bg-destructive/90"
                                    onClick={async () => {
                                        const res = await deleteCurrency(c.id)
                                        if (res.success) toast.success("تم حذف العملة")
                                        else toast.error(res.error)
                                    }}
                                >
                                    حذف
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )
        }
    }
]
