"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users, Plus, X, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Command, CommandEmpty, CommandGroup,
    CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { addSupervisorToGroup, removeSupervisorFromGroup } from "@/lib/actions/whatsapp-groups"
import { toast } from "sonner"

function getPrimaryPhone(contacts: { type: string; value: string }[]) {
    return contacts.find(c => c.type === "phone" || c.type === "whatsapp")?.value ?? null
}

interface GroupSupervisorManagerProps {
    group: any
    allSupervisors: any[]
}

export function GroupSupervisorManager({ group, allSupervisors }: GroupSupervisorManagerProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const assignedIds = new Set<string>(group.supervisors.map((s: any) => s.supervisorId))
    const available   = allSupervisors.filter(s => !assignedIds.has(s.id))

    const handleAdd = async (supervisorId: string) => {
        setLoadingId(supervisorId)
        setOpen(false)
        const res = await addSupervisorToGroup(group.id, supervisorId)
        if (res.success) {
            toast.success("تم إضافة المشرف")
            router.refresh()
        } else {
            toast.error(res.error ?? "تعذّر الإضافة")
        }
        setLoadingId(null)
    }

    const handleRemove = async (supervisorId: string) => {
        if (!confirm("هل تريد إزالة هذا المشرف من المجموعة؟")) return
        setLoadingId(supervisorId)
        const res = await removeSupervisorFromGroup(group.id, supervisorId)
        if (res.success) {
            toast.success("تم إزالة المشرف")
            router.refresh()
        } else {
            toast.error(res.error ?? "تعذّر الإزالة")
        }
        setLoadingId(null)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2">
                    <Users className="size-4 text-violet-600" />
                    المشرفون
                    <Badge variant="secondary" className="text-xs rounded-md font-mono">
                        {group.supervisors.length}
                    </Badge>
                </h2>

                {available.length > 0 && (
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5 h-8 rounded-lg text-xs">
                                <Plus className="size-3" />
                                إضافة مشرف
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0 rounded-xl" align="end">
                            <Command>
                                <CommandInput placeholder="ابحث عن مشرف..." />
                                <CommandList>
                                    <CommandEmpty>لا يوجد مشرفون متاحون</CommandEmpty>
                                    <CommandGroup>
                                        {available.map((s: any) => (
                                            <CommandItem
                                                key={s.id}
                                                value={s.name}
                                                onSelect={() => handleAdd(s.id)}
                                                disabled={loadingId === s.id}
                                                className="gap-2"
                                            >
                                                <div className="size-6 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                                                    <Users className="size-3.5 text-violet-600" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium">{s.name}</span>
                                                    {getPrimaryPhone(s.contacts) && (
                                                        <span className="text-[10px] font-mono text-muted-foreground" dir="ltr">
                                                            {getPrimaryPhone(s.contacts)}
                                                        </span>
                                                    )}
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                )}
            </div>

            {group.supervisors.length === 0 ? (
                <div className="py-10 text-center rounded-xl border border-dashed">
                    <Users className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">لا يوجد مشرفون في هذه المجموعة</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">اضغط "إضافة مشرف" لإضافة مشرف</p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.supervisors.map(({ supervisor }: any) => {
                        const phone = getPrimaryPhone(supervisor.contacts)
                        const isRemoving = loadingId === supervisor.id

                        return (
                            <div
                                key={supervisor.id}
                                className={`relative group flex items-start gap-3 p-4 rounded-xl border bg-card hover:border-violet-200 hover:shadow-sm transition-all ${isRemoving ? "opacity-50" : ""}`}
                            >
                                <div className="size-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                                    <Users className="size-5 text-violet-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">{supervisor.name}</p>
                                    {phone ? (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Phone className="size-2.5 text-muted-foreground shrink-0" />
                                            <a
                                                href={`tel:${phone}`}
                                                className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                                                dir="ltr"
                                            >
                                                {phone}
                                            </a>
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-muted-foreground/50 mt-0.5">لا يوجد هاتف</p>
                                    )}
                                </div>

                                {/* زر الإزالة يظهر عند hover */}
                                <button
                                    onClick={() => handleRemove(supervisor.id)}
                                    disabled={isRemoving}
                                    className="absolute top-2 left-2 size-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                    title="إزالة المشرف"
                                >
                                    <X className="size-3.5" />
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
