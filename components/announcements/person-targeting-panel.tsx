"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, Search, X, Users, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PersonFilters } from "@/lib/actions/announcements"

interface Person { id: string; name: string | null; groupName: string | null }
interface PersonType { id: string; name: string }

interface PersonTargetingPanelProps {
    value: { mode: "all" | "filter" | "manual"; filters: PersonFilters; manualIds: string[] }
    onChange: (v: PersonTargetingPanelProps["value"]) => void
    persons: Person[]
    personTypes: PersonType[]
    previewCount?: number
}

const MODES = [
    { key: "all",    label: "الكل",    desc: "جميع الأشخاص النشطين" },
    { key: "filter", label: "تصفية",   desc: "حسب النوع أو المجموعة" },
    { key: "manual", label: "يدوي",    desc: "اختيار أشخاص بالاسم" },
] as const

export function PersonTargetingPanel({ value, onChange, persons, personTypes, previewCount }: PersonTargetingPanelProps) {
    const [search, setSearch] = useState("")
    const [groupSearch, setGroupSearch] = useState("")

    const { mode, filters, manualIds } = value

    const setMode = (m: typeof mode) => onChange({ mode: m, filters: {}, manualIds: [] })

    const groups = [...new Set(persons.map(p => p.groupName).filter(Boolean))] as string[]

    const filteredPersons = persons.filter(p =>
        !search || p.name?.toLowerCase().includes(search.toLowerCase())
    )
    const filteredGroups = groups.filter(g => !groupSearch || g.toLowerCase().includes(groupSearch.toLowerCase()))

    const toggleManual = (id: string) => {
        const next = manualIds.includes(id)
            ? manualIds.filter(x => x !== id)
            : [...manualIds, id]
        onChange({ ...value, manualIds: next })
    }

    const toggleTypeFilter = (typeId: string) => {
        const cur = filters.typeIds || []
        onChange({ ...value, filters: { ...filters, typeIds: cur.includes(typeId) ? cur.filter(x => x !== typeId) : [...cur, typeId] } })
    }

    const toggleGroupFilter = (g: string) => {
        const cur = filters.groupNames || []
        onChange({ ...value, filters: { ...filters, groupNames: cur.includes(g) ? cur.filter(x => x !== g) : [...cur, g] } })
    }

    const removeManual = (id: string) => onChange({ ...value, manualIds: manualIds.filter(x => x !== id) })

    return (
        <div className="space-y-3">
            {/* Mode selector */}
            <div className="grid grid-cols-3 gap-2">
                {MODES.map(m => (
                    <button
                        key={m.key}
                        type="button"
                        onClick={() => setMode(m.key)}
                        className={cn(
                            "relative flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-start transition-all duration-200",
                            mode === m.key
                                ? "border-primary/50 bg-primary/8 text-primary shadow-sm"
                                : "border-border/50 hover:border-border hover:bg-muted/30"
                        )}
                    >
                        <span className="text-xs font-bold">{m.label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{m.desc}</span>
                        {mode === m.key && (
                            <div className="absolute top-2 left-2 size-1.5 rounded-full bg-primary" />
                        )}
                    </button>
                ))}
            </div>

            {/* Mode: filter */}
            {mode === "filter" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Person types */}
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">نوع الشخص</p>
                        <div className="flex flex-wrap gap-1.5">
                            {personTypes.map(pt => {
                                const active = filters.typeIds?.includes(pt.id)
                                return (
                                    <button key={pt.id} type="button" onClick={() => toggleTypeFilter(pt.id)}
                                        className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all duration-150",
                                            active ? "border-primary/50 bg-primary/10 text-primary" : "border-border/50 hover:border-border hover:bg-muted/30"
                                        )}>
                                        {active && <Check className="size-3" />}
                                        {pt.name}
                                    </button>
                                )
                            })}
                            {personTypes.length === 0 && <p className="text-xs text-muted-foreground">لا توجد أنواع</p>}
                        </div>
                    </div>

                    {/* Groups */}
                    {groups.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5">المجموعة</p>
                            <Input placeholder="بحث في المجموعات..." className="h-8 text-xs mb-1.5 rounded-lg"
                                value={groupSearch} onChange={e => setGroupSearch(e.target.value)} />
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                {filteredGroups.map(g => {
                                    const active = filters.groupNames?.includes(g)
                                    return (
                                        <button key={g} type="button" onClick={() => toggleGroupFilter(g)}
                                            className={cn("flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all duration-150",
                                                active ? "border-primary/50 bg-primary/10 text-primary" : "border-border/50 hover:border-border hover:bg-muted/30"
                                            )}>
                                            {active && <Check className="size-3" />}
                                            {g}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Mode: manual */}
            {mode === "manual" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input placeholder="ابحث باسم الشخص..." className="h-9 text-xs pr-9 rounded-xl"
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-0.5 rounded-xl border border-border/50 p-1">
                        {filteredPersons.slice(0, 30).map(p => {
                            const selected = manualIds.includes(p.id)
                            return (
                                <button key={p.id} type="button" onClick={() => toggleManual(p.id)}
                                    className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-start transition-all duration-150 text-xs",
                                        selected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/40"
                                    )}>
                                    <div className={cn("size-4 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                                        selected ? "bg-primary border-primary" : "border-border"
                                    )}>
                                        {selected && <Check className="size-2.5 text-white" />}
                                    </div>
                                    <span>{p.name || "—"}</span>
                                    {p.groupName && <span className="text-muted-foreground text-[10px]">{p.groupName}</span>}
                                </button>
                            )
                        })}
                        {filteredPersons.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-4">لا توجد نتائج</p>
                        )}
                    </div>
                </div>
            )}

            {/* Selected chips (manual mode) */}
            {mode === "manual" && manualIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {manualIds.map(id => {
                        const p = persons.find(x => x.id === id)
                        return (
                            <span key={id} className="flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                                {p?.name || id.slice(0, 8)}
                                <button type="button" onClick={() => removeManual(id)} className="hover:text-destructive transition-colors">
                                    <X className="size-3" />
                                </button>
                            </span>
                        )
                    })}
                </div>
            )}

            {/* Preview count */}
            <div className={cn("flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl transition-colors",
                (previewCount ?? 0) > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/40 text-muted-foreground"
            )}>
                <Users className="size-3.5" />
                سيصل الإعلان إلى <span className="font-black">{previewCount ?? "—"}</span> شخص
            </div>
        </div>
    )
}
