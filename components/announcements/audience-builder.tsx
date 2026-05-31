"use client"

/**
 * components/announcements/audience-builder.tsx
 *
 * Visual AND/OR Audience Builder.
 * Logic: AND between groups, OR inside each group.
 *
 * Example:
 *   Group 1: [type=VIP]  OR  [type=موزع]
 *   AND
 *   Group 2: [tag=عطور]
 *   AND
 *   Group 3: [NOT tag=موقوف]
 */

import { useState, useCallback }  from "react"
import { Plus, X, GitFork, Tag, Users, Layers, ChevronDown } from "lucide-react"
import { Button }  from "@/components/ui/button"
import { Badge }   from "@/components/ui/badge"
import { cn }      from "@/lib/utils"
import type { FilterGroup, AudienceCondition, ConditionType } from "@/lib/types/announcements"

// ─── Types ────────────────────────────────────────────────────────────────────


interface AudienceBuilderProps {
    groups:       FilterGroup[]
    onChange:     (groups: FilterGroup[]) => void

    customerTags:   string[]
}

type ConditionOption = { type: ConditionType; value: string; label: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
    return Math.random().toString(36).slice(2, 10)
}

const CONDITION_ICONS: Record<ConditionType, React.ComponentType<any>> = {
    tag:         Tag,
    exclude_tag: X,
}

const CONDITION_COLORS: Record<ConditionType, string> = {
    tag:         "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
    exclude_tag: "bg-destructive/10 border-destructive/30 text-destructive",
}

const CONDITION_LABELS: Record<ConditionType, string> = {
    tag:         "تاغ",
    exclude_tag: "استثناء تاغ",
}

// ─── Condition Chip ───────────────────────────────────────────────────────────

function ConditionChip({
    cond, onRemove,
}: {
    cond: AudienceCondition
    onRemove: () => void
}) {
    const Icon = CONDITION_ICONS[cond.type]
    return (
        <div className={cn(
            "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border",
            CONDITION_COLORS[cond.type]
        )}>
            <Icon className="size-3 shrink-0" />
            <span className="opacity-60">{CONDITION_LABELS[cond.type]}:</span>
            <span>{cond.label}</span>
            <button
                type="button"
                onClick={onRemove}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
            >
                <X className="size-3" />
            </button>
        </div>
    )
}

// ─── Add Condition Dropdown ───────────────────────────────────────────────────

function AddConditionButton({
    onAdd, customerGroups, customerTags,
}: {
    onAdd:        (c: AudienceCondition) => void

    customerTags:   string[]
}) {
    const [open,     setOpen]     = useState(false)
    const [tab,      setTab]      = useState<ConditionType>("group")
    const [search,   setSearch]   = useState("")

    const allOptions: Record<ConditionType, ConditionOption[]> = {
        tag:         customerTags.map(t    => ({ type: "tag"         as const, value: t,       label: t })),
        exclude_tag: customerTags.map(t    => ({ type: "exclude_tag" as const, value: t,       label: t })),
    }

    const filtered = (allOptions[tab] ?? []).filter(o =>
        !search || o.label.toLowerCase().includes(search.toLowerCase())
    )

    const handlePick = (opt: ConditionOption) => {
        onAdd({ id: uid(), ...opt })
        setOpen(false)
        setSearch("")
    }

    const TABS: { key: ConditionType; label: string; icon: React.ComponentType<any> }[] = [
        { key: "tag",         label: "تاغ",           icon: Tag    },
        { key: "exclude_tag", label: "استثناء",       icon: X      },
    ]

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
            >
                <Plus className="size-3" />
                إضافة شرط
                <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
            </button>

            {open && (
                <div className="absolute top-full mt-1.5 left-0 z-50 w-72 rounded-2xl border border-border/60 bg-popover shadow-xl shadow-black/10 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-border/40 bg-muted/20">
                        {TABS.map(t => {
                            const Icon = t.icon
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => { setTab(t.key); setSearch("") }}
                                    className={cn(
                                        "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-all border-b-2",
                                        tab === t.key
                                            ? "border-primary text-primary bg-primary/5"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Icon className="size-3" />
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Search */}
                    <div className="p-2 border-b border-border/30">
                        <input
                            autoFocus
                            placeholder="بحث..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full text-xs h-7 px-3 rounded-lg bg-muted/50 border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                    </div>

                    {/* Options */}
                    <div className="max-h-48 overflow-y-auto p-1">
                        {filtered.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">لا توجد نتائج</p>
                        ) : (
                            filtered.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handlePick(opt)}
                                    className="w-full text-right text-xs px-3 py-2 rounded-lg hover:bg-muted/50 font-medium transition-colors"
                                >
                                    {opt.label}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Click-outside overlay */}
            {open && (
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            )}
        </div>
    )
}

// ─── Filter Group Card ────────────────────────────────────────────────────────

function FilterGroupCard({
    group, index, isLast,
    onUpdate, onRemove,
    customerGroups, customerTags,
}: {
    group:        FilterGroup
    index:        number
    isLast:       boolean
    onUpdate:     (g: FilterGroup) => void
    onRemove:     () => void

    customerTags:   string[]
}) {
    const addCondition = (c: AudienceCondition) => {
        onUpdate({ ...group, conditions: [...group.conditions, c] })
    }
    const removeCondition = (cId: string) => {
        onUpdate({ ...group, conditions: group.conditions.filter(c => c.id !== cId) })
    }

    return (
        <div>
            {/* AND badge between groups */}
            {index > 0 && (
                <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-border/40" />
                    <span className="text-[10px] font-black text-muted-foreground bg-muted/50 border border-border/30 px-2 py-0.5 rounded-full">
                        AND
                    </span>
                    <div className="flex-1 h-px bg-border/40" />
                </div>
            )}

            <div className="rounded-2xl border border-border/50 bg-muted/10 p-3 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        مجموعة {index + 1}
                    </span>
                    <button
                        type="button"
                        onClick={onRemove}
                        className="size-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>

                {/* Conditions */}
                {group.conditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {group.conditions.map((cond, ci) => (
                            <div key={cond.id} className="flex items-center gap-1">
                                {ci > 0 && (
                                    <span className="text-[9px] font-black text-muted-foreground/60 px-1">OR</span>
                                )}
                                <ConditionChip
                                    cond={cond}
                                    onRemove={() => removeCondition(cond.id)}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground/60 italic">لا توجد شروط — أضف شرطاً للتصفية</p>
                )}

                {/* Add condition */}
                <AddConditionButton
                    onAdd={addCondition}

                    customerTags={customerTags}
                />
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AudienceBuilder({
    groups, onChange, customerTags,
}: AudienceBuilderProps) {
    const addGroup = () => {
        onChange([...groups, { id: uid(), conditions: [] }])
    }

    const updateGroup = (index: number, g: FilterGroup) => {
        const next = [...groups]
        next[index] = g
        onChange(next)
    }

    const removeGroup = (index: number) => {
        onChange(groups.filter((_, i) => i !== index))
    }

    // Summary chips of the full query
    const summary = groups
        .filter(g => g.conditions.length > 0)
        .map(g =>
            g.conditions.map(c => `${CONDITION_LABELS[c.type]}: ${c.label}`).join(" أو ")
        )
        .join("  ＆  ")

    return (
        <div className="space-y-2">
            {/* Logic Summary */}
            {groups.length > 0 && (
                <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2">
                    <GitFork className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {summary || "لم يُضف أي شرط بعد"}
                    </p>
                </div>
            )}

            {/* Groups */}
            {groups.map((g, i) => (
                <FilterGroupCard
                    key={g.id}
                    group={g}
                    index={i}
                    isLast={i === groups.length - 1}
                    onUpdate={g2 => updateGroup(i, g2)}
                    onRemove={() => removeGroup(i)}

                    customerTags={customerTags}
                />
            ))}

            {/* Add group */}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGroup}
                className="w-full rounded-2xl border-dashed gap-2 h-10 text-xs font-bold text-muted-foreground hover:text-primary hover:border-primary/40"
            >
                <Plus className="size-3.5" />
                {groups.length === 0 ? "ابدأ ببناء الجمهور" : "إضافة مجموعة AND"}
            </Button>
        </div>
    )
}
