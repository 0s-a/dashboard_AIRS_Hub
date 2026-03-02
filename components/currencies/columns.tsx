"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Currency } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Edit, Trash2, Star, StarOff } from "lucide-react"
import { deleteCurrency, setDefaultCurrency, toggleCurrencyActive } from "@/lib/actions/currencies"
import { toast } from "sonner"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

function dispatchEdit(currency: Currency) {
    window.dispatchEvent(new CustomEvent("edit-currency", { detail: currency }))
}

export const columns: ColumnDef<Currency>[] = [
    {
        accessorKey: "name",
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
        accessorKey: "symbol",
        header: "الرمز",
        cell: ({ row }) => (
            <Badge variant="outline" className="font-mono font-semibold text-sm px-3">
                {row.original.symbol}
            </Badge>
        )
    },
    {
        accessorKey: "isDefault",
        header: "الافتراضية",
        cell: ({ row }) => {
            const c = row.original
            if (c.isDefault) {
                return (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/30 gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        افتراضية
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
                        if (res.success) toast.success("تم تعيينها كعملة افتراضية")
                        else toast.error(res.error)
                    }}
                >
                    <StarOff className="h-3 w-3" />
                    تعيين افتراضية
                </Button>
            )
        }
    },
    {
        accessorKey: "isActive",
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
