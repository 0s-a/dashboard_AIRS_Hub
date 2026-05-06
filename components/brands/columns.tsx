"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import { Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

import { deleteBrand } from "@/lib/actions/brands"
import { BrandSheet } from "./brand-sheet"
import type { BrandRow } from "@/lib/types/brand"

// Re-export so consumers can import from a single place
export type { BrandRow }

// ─── Avatar ───────────────────────────────────────────────────

/** Gradient palette used for letter-based avatars */
const AVATAR_GRADIENTS = [
    "from-violet-500 to-purple-600",
    "from-blue-500  to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-rose-500  to-pink-600",
] as const

function BrandAvatar({ name, logo }: { name: string; logo: string | null }) {
    if (logo) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={logo}
                alt={name}
                className="h-9 w-9 rounded-xl object-contain border border-border/40 bg-white p-1 shadow-sm"
            />
        )
    }

    // Deterministic gradient based on first character code
    const gradient = AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length]

    return (
        <div className={cn(
            "h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center",
            "text-white text-sm font-bold shadow-sm shrink-0",
            gradient,
        )}>
            {name.slice(0, 2).toUpperCase()}
        </div>
    )
}

// ─── Action Cell ──────────────────────────────────────────────

interface ActionCellProps {
    brand: BrandRow
    onRefresh: () => void
}

function ActionCell({ brand, onRefresh }: ActionCellProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [editOpen,   setEditOpen]   = useState(false)

    async function handleDelete() {
        setIsDeleting(true)
        const res = await deleteBrand(brand.id)
        if (res.success) {
            toast.success("تم حذف البراند")
            onRefresh()
        } else {
            toast.error(res.error ?? "فشل الحذف")
        }
        setIsDeleting(false)
    }

    const hasProducts = brand._count.products > 0

    return (
        <div className="flex items-center justify-end gap-1">
            <TooltipProvider delayDuration={0}>

                {/* Edit button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            onClick={() => setEditOpen(true)}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>تعديل</TooltipContent>
                </Tooltip>

                {/* Delete button + confirmation dialog */}
                <AlertDialog>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                                    disabled={isDeleting}
                                >
                                    {isDeleting
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <Trash2  className="h-3.5 w-3.5" />
                                    }
                                </Button>
                            </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>حذف</TooltipContent>
                    </Tooltip>

                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>حذف براند "{brand.name}"؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                {hasProducts
                                    ? `⚠️ هذا البراند مرتبط بـ ${brand._count.products} منتج. لا يمكن حذفه حتى تُلغي الربط من المنتجات.`
                                    : "سيتم حذف البراند نهائياً. هذا الإجراء لا يمكن التراجع عنه."
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                disabled={hasProducts}
                                className="rounded-xl bg-destructive hover:bg-destructive/90"
                            >
                                تأكيد الحذف
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </TooltipProvider>

            {/* Edit sheet — opened by the edit button above */}
            <BrandSheet
                open={editOpen}
                onOpenChange={(open) => { setEditOpen(open); if (!open) onRefresh() }}
                brand={brand}
            />
        </div>
    )
}

// ─── Column Definitions ───────────────────────────────────────

export function buildColumns(onRefresh: () => void): ColumnDef<BrandRow>[] {
    return [
        {
            id: "brand",
            header: "البراند",
            size: 280,
            cell: ({ row }) => {
                const { name, logo } = row.original
                return (
                    <div className="flex items-center gap-3">
                        <BrandAvatar name={name} logo={logo} />
                        <span className="font-semibold text-sm text-foreground truncate">{name}</span>
                    </div>
                )
            },
        },
        {
            accessorKey: "code",
            header: "الكود",
            size: 80,
            cell: ({ row }) => (
                <Badge
                    variant="outline"
                    className="font-mono text-xs tracking-widest bg-primary/5 border-primary/20 text-primary"
                >
                    {row.original.code}
                </Badge>
            ),
        },
        {
            id: "products",
            header: "المنتجات",
            size: 90,
            cell: ({ row }) => {
                const count = row.original._count.products
                return (
                    <Badge
                        variant={count > 0 ? "secondary" : "outline"}
                        className={cn(
                            "text-xs tabular-nums",
                            count > 0 && "bg-primary/10 text-primary border-primary/20",
                        )}
                    >
                        {count} منتج
                    </Badge>
                )
            },
        },
        {
            id: "actions",
            header: () => <div className="text-right">الإجراءات</div>,
            size: 90,
            cell: ({ row }) => <ActionCell brand={row.original} onRefresh={onRefresh} />,
        },
    ]
}
