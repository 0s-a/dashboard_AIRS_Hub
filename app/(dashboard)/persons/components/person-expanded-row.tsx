"use client"

import { Person, Group } from "@prisma/client"
import { UsersRound, Calendar, Tag, ExternalLink, Layers } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PersonWithGroups extends Person {
    groups?: Group[]
}

interface PersonExpandedRowProps {
    row: {
        original: PersonWithGroups
    }
}

export function PersonExpandedRow({ row }: PersonExpandedRowProps) {
    const person = row.original
    const groups = person.groups || []

    if (groups.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed rounded-xl bg-background/50">
                <UsersRound className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">لا توجد مجموعات مرتبطة بهذا الشخص</p>
            </div>
        )
    }

    return (
        <div className="p-4 bg-muted/10 rounded-xl border border-border/50">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Layers className="h-4 w-4 text-primary" />
                    المجموعات المرتبطة ({groups.length})
                </h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groups.map((group) => (
                    <div 
                        key={group.id} 
                        className="group/card relative rounded-xl border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col h-full overflow-hidden"
                    >
                        {/* Subtle Background Gradient */}
                        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/40 to-indigo-500/40 opacity-50 group-hover/card:opacity-100 transition-opacity" />
                        
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 min-w-0 pr-2">
                                <h5 className="font-semibold text-sm truncate" title={group.name}>
                                    {group.name}
                                </h5>
                                <Badge variant="outline" className="mt-1 font-mono text-[10px] border-primary/20 bg-primary/5 text-primary">
                                    {group.number}
                                </Badge>
                            </div>
                            <Button variant="ghost" size="icon" asChild className="h-7 w-7 shrink-0 -mt-1 -mr-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                <Link href={`/groups/${group.id}`}>
                                    <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                                </Link>
                            </Button>
                        </div>

                        <div className="space-y-2 mt-auto pt-3 border-t text-xs text-muted-foreground">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Tag className="h-3 w-3 opacity-70" />
                                    <span>الوسوم</span>
                                </div>
                                <span className="font-medium text-foreground">
                                    {((group.tags as string[]) || []).length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3 opacity-70" />
                                    <span>الإنشاء</span>
                                </div>
                                <span className="font-medium text-foreground">
                                    {new Date(group.createdAt).toLocaleDateString('ar-SA')}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
