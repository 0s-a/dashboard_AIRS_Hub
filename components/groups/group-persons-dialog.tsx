"use client"

import { useState } from "react"
import { Person } from "@prisma/client"
import { Check, Search, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { togglePersonInGroup } from "@/lib/actions/groups"
import { toast } from "sonner"

interface GroupPersonsDialogProps {
    groupId: string
    allPersons: Person[]
    groupPersonsIds: string[]
}

export function GroupPersonsDialog({ groupId, allPersons, groupPersonsIds }: GroupPersonsDialogProps) {
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [isUpdating, setIsUpdating] = useState<string | null>(null)
    const [localGroupPersonsIds, setLocalGroupPersonsIds] = useState<string[]>(groupPersonsIds)

    const filteredPersons = allPersons.filter(person =>
        (person.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (person.address?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    )

    const handleToggle = async (personId: string) => {
        setIsUpdating(personId)
        try {
            const res = await togglePersonInGroup(personId, groupId)
            if (res.success) {
                if (res.linked) {
                    setLocalGroupPersonsIds(prev => [...prev, personId])
                    toast.success("تم إضافة الشخص للمجموعة")
                } else {
                    setLocalGroupPersonsIds(prev => prev.filter(id => id !== personId))
                    toast.success("تم إزالة الشخص من المجموعة")
                }
            } else {
                toast.error(res.error || "حدث خطأ أثناء التحديث")
            }
        } catch (error) {
            toast.error("حدث خطأ غير متوقع")
        } finally {
            setIsUpdating(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-xl shadow-lg shadow-primary/20">
                    <Plus className="ml-2 h-4 w-4" /> إضافة أو إزالة أشخاص
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 bg-muted/30 border-b relative">
                    <DialogTitle className="text-xl">إدارة أشخاص المجموعة</DialogTitle>
                    <DialogDescription>
                        ابحث عن الأشخاص وانقر للإضافة أو الإزالة من هذه المجموعة.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="ابحث بالاسم أو العنوان..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-9 h-11 bg-muted/30 focus-visible:bg-transparent transition-colors rounded-xl"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-2 pb-4">
                        {filteredPersons.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-3">
                                <Search className="h-8 w-8 opacity-20" />
                                <p>لم يتم العثور على نتائج للبحث</p>
                            </div>
                        ) : (
                            filteredPersons.map((person) => {
                                const isMember = localGroupPersonsIds.includes(person.id)
                                const isCurrentlyUpdating = isUpdating === person.id

                                return (
                                    <div
                                        key={person.id}
                                        className={`
                                            flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none
                                            ${isMember
                                                ? 'bg-primary/5 border-primary/20 hover:border-primary/40'
                                                : 'bg-card border-border/50 hover:bg-muted/50 hover:border-border'}
                                            ${isCurrentlyUpdating ? 'opacity-50 pointer-events-none' : ''}
                                        `}
                                        onClick={() => handleToggle(person.id)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${isMember ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {person.name ? person.name.slice(0, 2).toUpperCase() : "??"}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">{person.name || 'بدون اسم'}</p>
                                                {person.type && (
                                                    <span className="text-[10px] px-1.5 py-px shrink-0 rounded bg-muted">
                                                        {person.type}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full">
                                            {isCurrentlyUpdating ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            ) : isMember ? (
                                                <div className="size-6 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                                                    <Check className="h-3.5 w-3.5" />
                                                </div>
                                            ) : (
                                                <div className="size-6 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground/30 flex items-center justify-center">
                                                    <Plus className="h-3.5 w-3.5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 bg-muted/30 border-t flex justify-between items-center text-xs text-muted-foreground">
                    <span>إجمالي الأفراد: {allPersons.length}</span>
                    <span>المحددين في المجموعة: {localGroupPersonsIds.length}</span>
                </div>
            </DialogContent>
        </Dialog>
    )
}
