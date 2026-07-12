'use client'

import { useState, useEffect } from 'react'
import {
    Database,
    Loader2,
    RefreshCw,
    WifiOff,
    CheckCircle2,
    Clock,
    Zap,
    FileDigit,
    KeyRound,
    LayoutList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────────────

interface IndexData {
    uid:           string
    primaryKey:    string | null
    createdAt:     string
    updatedAt:     string
    documentCount: number
    isIndexing:    boolean
}

interface IndexesResponse {
    indexes:      IndexData[]
    unavailable?: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Relative time using native Intl — no external deps */
function relativeTime(iso: string): string {
    const rtf = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })
    const diffMs = new Date(iso).getTime() - Date.now()
    const absDiff = Math.abs(diffMs)

    const units: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
        { unit: 'year',   ms: 365 * 24 * 60 * 60 * 1000 },
        { unit: 'month',  ms: 30  * 24 * 60 * 60 * 1000 },
        { unit: 'week',   ms: 7   * 24 * 60 * 60 * 1000 },
        { unit: 'day',    ms: 24  * 60 * 60 * 1000 },
        { unit: 'hour',   ms: 60  * 60 * 1000 },
        { unit: 'minute', ms: 60  * 1000 },
        { unit: 'second', ms: 1000 },
    ]

    for (const { unit, ms } of units) {
        if (absDiff >= ms) {
            return rtf.format(Math.round(diffMs / ms), unit)
        }
    }
    return 'الآن'
}

/** Format document count with arabic locale */
function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}ك`
    return n.toLocaleString('ar')
}

// ── Component ──────────────────────────────────────────────────────────────────

export function IndexesPanel() {
    const [data, setData]           = useState<IndexesResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const fetchIndexes = async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true)
        try {
            const res  = await fetch('/api/v1/dashboard/meilisearch/indexes')
            const json = await res.json()
            if (json.success) {
                setData(json.data)
            } else {
                toast.error(json.error || 'فشل جلب الفهارس')
            }
        } catch {
            toast.error('خطأ في الاتصال بالخادم')
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    useEffect(() => { fetchIndexes() }, [])

    // ── Loading skeleton ───────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="space-y-2.5">
                {[1, 2].map(i => (
                    <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
                ))}
            </div>
        )
    }

    // ── Unavailable state ──────────────────────────────────────────────────────
    if (data?.unavailable) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <WifiOff className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm text-foreground">خدمة البحث غير متاحة</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                        حاوية Meilisearch لا تستجيب. تأكد من تشغيل الخدمة في الخادم.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchIndexes(true)} className="mt-1 h-8 text-xs">
                    <RefreshCw className={cn('h-3.5 w-3.5 ml-1.5', isRefreshing && 'animate-spin')} />
                    إعادة المحاولة
                </Button>
            </div>
        )
    }

    // ── Empty state ────────────────────────────────────────────────────────────
    if (!data || data.indexes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                    <LayoutList className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">لا توجد فهارس حالياً</p>
                <Button variant="ghost" size="sm" onClick={() => fetchIndexes(true)} className="h-8 text-xs">
                    <RefreshCw className={cn('h-3.5 w-3.5 ml-1.5', isRefreshing && 'animate-spin')} />
                    تحديث
                </Button>
            </div>
        )
    }

    // ── Main list ──────────────────────────────────────────────────────────────
    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    {data.indexes.length} {data.indexes.length === 1 ? 'فهرس' : 'فهارس'} مُكتشفة
                </p>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchIndexes(true)}
                    disabled={isRefreshing}
                    className="h-7 px-2.5 text-xs"
                >
                    <RefreshCw className={cn('h-3 w-3 ml-1.5', isRefreshing && 'animate-spin')} />
                    تحديث
                </Button>
            </div>

            {/* Index cards */}
            <div className="space-y-2">
                {data.indexes.map((index) => (
                    <IndexCard key={index.uid} index={index} />
                ))}
            </div>
        </div>
    )
}

// ── IndexCard sub-component ────────────────────────────────────────────────────

function IndexCard({ index }: { index: IndexData }) {
    return (
        <div className="group rounded-xl border border-border/50 bg-background/60 hover:bg-muted/20 transition-colors overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">

                {/* Icon */}
                <div className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    index.isIndexing
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-blue-500/10 text-blue-500'
                )}>
                    {index.isIndexing
                        ? <Zap className="h-4 w-4 animate-pulse" />
                        : <Database className="h-4 w-4" />
                    }
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm text-foreground">
                            {index.uid}
                        </span>
                        {index.isIndexing ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                                <Zap className="h-2.5 w-2.5" />
                                يُفهرس الآن
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                جاهز
                            </span>
                        )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <MetaChip
                            icon={<FileDigit className="h-3 w-3" />}
                            label={`${formatCount(index.documentCount)} مستند`}
                        />
                        {index.primaryKey && (
                            <MetaChip
                                icon={<KeyRound className="h-3 w-3" />}
                                label={index.primaryKey}
                                mono
                            />
                        )}
                        <MetaChip
                            icon={<Clock className="h-3 w-3" />}
                            label={relativeTime(index.updatedAt)}
                        />
                    </div>
                </div>
            </div>

            {/* Progress bar when indexing */}
            {index.isIndexing && (
                <div className="h-0.5 w-full bg-amber-500/20 overflow-hidden">
                    <div className="h-full bg-amber-500 animate-[progress_1.5s_ease-in-out_infinite]"
                         style={{ width: '40%' }} />
                </div>
            )}
        </div>
    )
}

function MetaChip({ icon, label, mono }: { icon: React.ReactNode; label: string; mono?: boolean }) {
    return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {icon}
            <span className={cn(mono && 'font-mono')}>{label}</span>
        </span>
    )
}
