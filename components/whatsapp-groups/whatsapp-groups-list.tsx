"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, MessageSquare, Pencil, Trash2, Copy, ToggleLeft, ToggleRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ServerPagination } from "@/components/ui/server-pagination"
import { WhatsappGroupSheet } from "./whatsapp-group-sheet"
import { deleteWhatsappGroup, toggleWhatsappGroupActive } from "@/lib/actions/whatsapp-groups"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { WhatsappGroupRow } from "@/lib/types/whatsapp-groups"

interface WhatsappGroupsListProps {
    data: WhatsappGroupRow[]
    customers: any[]
    supervisors: any[]
    pagination: any
    initialSearch?: string
}

export function WhatsappGroupsList({ data, customers, supervisors, pagination, initialSearch }: WhatsappGroupsListProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [searchQuery, setSearchQuery] = useState(initialSearch || "")
    
    // Sheet State
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<WhatsappGroupRow | undefined>()

    // Delete Alert State
    const [groupToDelete, setGroupToDelete] = useState<WhatsappGroupRow | undefined>()

    const handleRefresh = () => {
        startTransition(() => router.refresh())
    }

    const handleEdit = (e: React.MouseEvent, group: WhatsappGroupRow) => {
        e.stopPropagation()
        setSelectedGroup(group)
        setIsSheetOpen(true)
    }

    const handleDeleteClick = (e: React.MouseEvent, group: WhatsappGroupRow) => {
        e.stopPropagation()
        setGroupToDelete(group)
    }

    const confirmDelete = async () => {
        if (!groupToDelete) return
        const res = await deleteWhatsappGroup(groupToDelete.id)
        if (res.success) {
            toast.success("تم حذف المجموعة")
            handleRefresh()
        } else {
            toast.error(res.error ?? "تعذّر الحذف")
        }
        setGroupToDelete(undefined)
    }

    const handleToggle = async (e: React.MouseEvent, group: WhatsappGroupRow) => {
        e.stopPropagation()
        const res = await toggleWhatsappGroupActive(group.id, !group.isActive)
        if (res.success) {
            toast.success(group.isActive ? "تم تعطيل المجموعة" : "تم تفعيل المجموعة")
            handleRefresh()
        } else {
            toast.error(res.error ?? "تعذّر تغيير الحالة")
        }
    }

    const copyToClipboard = (e: React.MouseEvent, text: string) => {
        e.stopPropagation()
        navigator.clipboard.writeText(text)
        toast.success("تم النسخ", { duration: 1500 })
    }

    const handleRowClick = (groupId: string) => {
        router.push(`/whatsapp-groups/${groupId}`)
    }

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const params = new URLSearchParams(window.location.search)
            if (searchQuery.trim()) {
                params.set('search', searchQuery.trim())
            } else {
                params.delete('search')
            }
            params.set('page', '1')
            startTransition(() => {
                router.push(`?${params.toString()}`)
            })
        }
    }

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set("page", String(page))
        startTransition(() => {
            router.push(`?${params.toString()}`)
        })
    }

    const handleLimitChange = (limit: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set("limit", String(limit))
        params.set("page", "1")
        startTransition(() => {
            router.push(`?${params.toString()}`)
        })
    }

    return (
        <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="ابحث باسم المجموعة أو رقمها (اضغط Enter للبحث)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearch}
                    className="pr-9 h-11 bg-card border-border/50 rounded-xl"
                />
            </div>

            {/* List */}
            <div className="flex flex-col gap-3">
                {data.length === 0 ? (
                    <div className="text-center py-12 bg-card rounded-2xl border border-border/50 border-dashed">
                        <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                        <h3 className="text-sm font-medium text-muted-foreground">لا توجد مجموعات مطابقة</h3>
                    </div>
                ) : (
                    data.map((g) => (
                        <div
                            key={g.id}
                            onClick={() => handleRowClick(g.id)}
                            className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card hover:shadow-md hover:border-emerald-500/20 transition-all cursor-pointer group"
                        >
                            {/* Group Info */}
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                    g.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/60 text-muted-foreground"
                                }`}>
                                    <MessageSquare className="size-5" />
                                </div>
                                <div className="flex flex-col min-w-0 pr-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-base truncate">{g.name}</h4>
                                        <Badge variant="outline" className="bg-muted/50 font-mono text-[10px] tracking-widest px-1.5 py-0">
                                            {g.code}
                                        </Badge>
                                    </div>
                                    {g.groupNumber && (
                                        <button
                                            onClick={(e) => copyToClipboard(e, g.groupNumber!)}
                                            className="flex items-center gap-1.5 group/num w-fit mt-0.5"
                                        >
                                            <span className="text-xs font-mono text-muted-foreground truncate" dir="ltr">
                                                {g.groupNumber}
                                            </span>
                                            <Copy className="size-3 text-muted-foreground opacity-0 group-hover/num:opacity-100 transition-opacity shrink-0" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Status & Actions */}
                            <div className="flex items-center gap-4 shrink-0">
                                <Badge className={g.isActive
                                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0"
                                    : "bg-muted text-muted-foreground border-0"
                                }>
                                    {g.isActive ? "نشطة" : "معطّلة"}
                                </Badge>
                                
                                {/* Divider */}
                                <div className="w-px h-6 bg-border/50 mx-1 hidden sm:block"></div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600"
                                        onClick={(e) => handleEdit(e, g)}
                                        title="تعديل"
                                    >
                                        <Pencil className="size-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-600"
                                        onClick={(e) => handleToggle(e, g)}
                                        title={g.isActive ? "تعطيل" : "تفعيل"}
                                    >
                                        {g.isActive ? <ToggleLeft className="size-4" /> : <ToggleRight className="size-4" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                                        onClick={(e) => handleDeleteClick(e, g)}
                                        title="حذف"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ServerPagination
                pagination={pagination}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
                limitOptions={[25, 50, 100, 200]}
            />

            <WhatsappGroupSheet
                open={isSheetOpen}
                onOpenChange={(open) => {
                    setIsSheetOpen(open)
                    if (!open) setSelectedGroup(undefined)
                }}
                group={selectedGroup}
                customers={customers}
                supervisors={supervisors}
                onSaved={handleRefresh}
            />

            <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(undefined)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                        <AlertDialogDescription>
                            هل أنت متأكد من رغبتك في حذف مجموعة <span className="font-semibold text-foreground">"{groupToDelete?.name}"</span>؟ لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel className="rounded-xl mt-0">إلغاء</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmDelete} 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                        >
                            تأكيد الحذف
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
