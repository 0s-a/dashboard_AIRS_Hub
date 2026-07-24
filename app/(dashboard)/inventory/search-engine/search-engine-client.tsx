'use client'

import { useState, useCallback, useEffect, useRef, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
    Database,
    RefreshCw,
    Search,
    Zap,
    CheckCircle2,
    XCircle,
    Loader2,
    Package,
    AlertTriangle,
    Timer,
    FileSearch,
    Wifi,
    WifiOff,
    Info,
    Layers,
    ExternalLink,
    Tag,
    GitCompareArrows,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { IndexesPanel } from './indexes-panel'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatusData {
    connected:      boolean
    documentCount:  number
    isIndexing:     boolean
    indexName:      string
    lastUpdated:    string | null
    host:           string
    dbItemCount:    number
    inSync:         boolean
}

interface SyncResult {
    synced:      number
    errors:      number
    duration:    number
    indexedAt:   string
    unavailable?: boolean
}

interface SearchHitHighlights {
    name?:             string
    productName?:      string
    itemNumber?:       string | null
    alternativeNames?: string[]
    attributeText?:    string[]
}

interface SearchHit {
    id:               string
    itemNumber:       string | null
    name:             string
    productName?:     string
    brand:            string | null
    category:         string | null
    attributeText?:   string[]
    tags?:            string[]
    isAvailable:      boolean
    highlights?:      SearchHitHighlights
}

interface PrismaCompareHit {
    id:          string
    name:        string
    itemNumber:  string | null
    productName: string | null
    isAvailable: boolean
}

interface PrismaCompareResult {
    hits:             PrismaCompareHit[]
    estimatedTotal:   number
    processingTimeMs: number
    onlyInMeili:      string[]
    onlyInPrisma:     string[]
    inBoth:           string[]
}

interface SearchResult {
    hits:             SearchHit[]
    estimatedTotal:   number
    processingTimeMs: number
    query:            string
    unavailable?:     boolean
    prismaCompare?:   PrismaCompareResult
}

type AvailabilityFilter = 'all' | 'true' | 'false'
type SearchLimit = '10' | '20'

interface Props {
    initialStatus: StatusData | null
}

const SEARCH_DEBOUNCE_MS = 400

// ─────────────────────────────────────────────────────────────────────────────
export function SearchEngineClient({ initialStatus }: Props) {
    // ── Status state ─────────────────────────────────────────────────────────
    const [status, setStatus] = useState<StatusData | null>(initialStatus)
    const [isRefreshingStatus, startRefreshStatus] = useTransition()
    const [indexesRefreshKey, setIndexesRefreshKey] = useState(0)

    // ── Sync state ───────────────────────────────────────────────────────────
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
    const [syncError, setSyncError] = useState<string | null>(null)

    // ── Search state ─────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('')
    const [availability, setAvailability] = useState<AvailabilityFilter>('all')
    const [searchLimit, setSearchLimit] = useState<SearchLimit>('10')
    const [comparePrisma, setComparePrisma] = useState(false)
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
    const searchSeq = useRef(0)

    // ── Refresh Status + Indexes ─────────────────────────────────────────────
    const refreshStatus = useCallback(() => {
        startRefreshStatus(async () => {
            try {
                const res = await fetch('/api/v1/dashboard/meilisearch/status')
                const json = await res.json()
                if (json.success) {
                    setStatus(json.data)
                    setIndexesRefreshKey(k => k + 1)
                }
            } catch {
                toast.error('تعذّر تحديث الحالة')
            }
        })
    }, [])

    // ── Sync ─────────────────────────────────────────────────────────────────
    const handleSync = useCallback(async () => {
        setIsSyncing(true)
        setSyncResult(null)
        setSyncError(null)

        try {
            const res  = await fetch('/api/v1/dashboard/meilisearch/sync', { method: 'POST' })
            const json = await res.json()

            if (json.success) {
                const data: SyncResult = json.data
                setSyncResult(data)

                if (data.unavailable) {
                    toast.warning('خدمة Meilisearch غير متاحة حالياً')
                } else {
                    toast.success(`تمت المزامنة بنجاح — ${data.synced.toLocaleString('ar')} صنف`)
                    refreshStatus()
                }
            } else {
                setSyncError(json.error || 'فشلت المزامنة')
                toast.error(json.error || 'فشلت المزامنة')
            }
        } catch {
            setSyncError('تعذّر الاتصال بالخادم')
            toast.error('تعذّر الاتصال بالخادم')
        } finally {
            setIsSyncing(false)
        }
    }, [refreshStatus])

    // ── Search playground ─────────────────────────────────────────────────────
    const runSearch = useCallback(async (
        query: string,
        avail: AvailabilityFilter,
        limit: SearchLimit,
        compare: boolean,
    ) => {
        const trimmed = query.trim()
        if (!trimmed) {
            setSearchResult(null)
            setSearchError(null)
            setIsSearching(false)
            return
        }

        const seq = ++searchSeq.current
        setIsSearching(true)
        setSearchError(null)

        try {
            const params = new URLSearchParams({
                q: trimmed,
                limit,
            })
            if (avail !== 'all') params.set('available', avail)
            if (compare) params.set('compare', '1')

            const res  = await fetch(`/api/v1/dashboard/meilisearch/search?${params}`)
            const json = await res.json()
            if (seq !== searchSeq.current) return

            if (json.success) {
                const data: SearchResult = json.data
                if (data.unavailable) {
                    setSearchError('خدمة Meilisearch غير متاحة — تأكد من تشغيل الخدمة')
                    setSearchResult(null)
                } else {
                    setSearchResult(data)
                }
            } else {
                setSearchError(json.error || 'فشل البحث')
                setSearchResult(null)
            }
        } catch {
            if (seq !== searchSeq.current) return
            setSearchError('تعذّر الاتصال بالخادم')
            setSearchResult(null)
        } finally {
            if (seq === searchSeq.current) setIsSearching(false)
        }
    }, [])

    const scheduleSearch = useCallback((
        query: string,
        avail: AvailabilityFilter,
        limit: SearchLimit,
        compare: boolean,
    ) => {
        if (searchDebounce.current) clearTimeout(searchDebounce.current)

        if (!query.trim()) {
            setSearchResult(null)
            setSearchError(null)
            setIsSearching(false)
            return
        }

        searchDebounce.current = setTimeout(() => {
            void runSearch(query, avail, limit, compare)
        }, SEARCH_DEBOUNCE_MS)
    }, [runSearch])

    const handleSearchChange = (value: string) => {
        setSearchQuery(value)
        scheduleSearch(value, availability, searchLimit, comparePrisma)
    }

    // Re-run immediately when filters / compare change (if there is a query)
    useEffect(() => {
        if (searchDebounce.current) clearTimeout(searchDebounce.current)
        if (!searchQuery.trim()) return
        void runSearch(searchQuery, availability, searchLimit, comparePrisma)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to filter/compare changes
    }, [availability, searchLimit, comparePrisma])

    useEffect(() => {
        return () => {
            if (searchDebounce.current) clearTimeout(searchDebounce.current)
        }
    }, [])

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms} ميلي ثانية`
        return `${(ms / 1000).toFixed(1)} ثانية`
    }

    const syncDisabled = isSyncing || Boolean(status?.isIndexing)

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6" dir="rtl">

            {/* ── Row 1: Status + Sync side by side ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Status Card */}
                <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
                    <Tabs defaultValue="status">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-muted/20">
                            <TabsList className="h-8 bg-muted/40 rounded-lg p-0.5">
                                <TabsTrigger
                                    value="status"
                                    className="h-7 px-3 text-xs gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                >
                                    <Database className="h-3.5 w-3.5" />
                                    حالة الفهرس
                                </TabsTrigger>
                                <TabsTrigger
                                    value="indexes"
                                    className="h-7 px-3 text-xs gap-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                >
                                    <Layers className="h-3.5 w-3.5" />
                                    الفهارس
                                </TabsTrigger>
                            </TabsList>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg"
                                onClick={refreshStatus}
                                disabled={isRefreshingStatus}
                            >
                                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshingStatus && 'animate-spin')} />
                            </Button>
                        </div>

                        <TabsContent value="status" className="mt-0">
                            <div className="p-5 space-y-4">
                                {!status ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        جارٍ التحميل...
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className={cn(
                                                'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
                                                status.connected
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-destructive/10 text-destructive'
                                            )}>
                                                {status.connected
                                                    ? <><Wifi className="h-3 w-3" /> متصل</>
                                                    : <><WifiOff className="h-3 w-3" /> غير متصل</>
                                                }
                                            </div>
                                            {status.isIndexing && (
                                                <div className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                                    <Zap className="h-3 w-3 animate-pulse" />
                                                    يُفهرس الآن
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <StatCard
                                                label="مستندات مفهرسة"
                                                value={status.documentCount.toLocaleString('ar')}
                                                icon={<FileSearch className="h-3.5 w-3.5" />}
                                                tone="primary"
                                            />
                                            <StatCard
                                                label="أصناف في قاعدة البيانات"
                                                value={status.dbItemCount.toLocaleString('ar')}
                                                icon={<Package className="h-3.5 w-3.5" />}
                                                tone="muted"
                                            />
                                        </div>

                                        <div className={cn(
                                            'flex items-center gap-2 p-3 rounded-xl text-xs',
                                            status.inSync
                                                ? 'bg-emerald-500/8 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                                : 'bg-amber-500/8 border border-amber-500/20 text-amber-700 dark:text-amber-400'
                                        )}>
                                            {status.inSync
                                                ? <><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> الفهرس متزامن مع قاعدة البيانات</>
                                                : <><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> الفهرس غير متزامن — يُنصح بتشغيل المزامنة</>
                                            }
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Info className="h-3 w-3" />
                                            <span>الفهرس: <code className="font-mono bg-muted/60 px-1 rounded">{status.indexName}</code></span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="indexes" className="mt-0">
                            <div className="p-5">
                                <IndexesPanel refreshKey={indexesRefreshKey} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sync Card */}
                <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40 bg-muted/20">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <RefreshCw className="h-4 w-4" />
                        </div>
                        <h2 className="font-semibold text-sm text-foreground">المزامنة الكاملة</h2>
                    </div>

                    <div className="p-5 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            يقوم هذا الإجراء بتصدير <strong>جميع الأصناف</strong> من قاعدة البيانات إلى فهرس Meilisearch.
                            يُستخدم عند وجود بيانات غير متزامنة أو عند تهيئة الفهرس لأول مرة.
                        </p>

                        {status?.isIndexing && !isSyncing && (
                            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
                                <Zap className="h-4 w-4 shrink-0 animate-pulse" />
                                الفهرس قيد التحديث حالياً — انتظر حتى يكتمل قبل مزامنة جديدة
                            </div>
                        )}

                        {syncResult && !isSyncing && (
                            syncResult.unavailable ? (
                                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
                                    <WifiOff className="h-4 w-4 shrink-0" />
                                    خدمة Meilisearch غير متاحة حالياً — تأكد من تشغيل الحاوية
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-sm">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                    <div className="space-y-0.5">
                                        <p className="font-medium text-emerald-700 dark:text-emerald-400">اكتملت المزامنة</p>
                                        <p className="text-xs text-muted-foreground">
                                            {syncResult.synced.toLocaleString('ar')} صنف
                                            {syncResult.errors > 0 && <span className="text-destructive"> · {syncResult.errors} خطأ</span>}
                                            {' · '}{formatDuration(syncResult.duration)}
                                        </p>
                                    </div>
                                </div>
                            )
                        )}

                        {syncError && !isSyncing && (
                            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-destructive/8 border border-destructive/20 text-sm text-destructive">
                                <XCircle className="h-4 w-4 shrink-0" />
                                {syncError}
                            </div>
                        )}

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    disabled={syncDisabled}
                                    className={cn(
                                        'w-full gap-2 font-medium',
                                        isSyncing && 'cursor-not-allowed'
                                    )}
                                >
                                    {isSyncing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            جارٍ المزامنة...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4" />
                                            بدء المزامنة الكاملة
                                        </>
                                    )}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>تشغيل المزامنة الكاملة؟</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        سيتم إعادة فهرسة جميع الأصناف في Meilisearch. قد تستغرق العملية بضع ثوانٍ حسب حجم المخزون.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="gap-2">
                                    <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="rounded-xl"
                                        onClick={() => void handleSync()}
                                    >
                                        تأكيد المزامنة
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {isSyncing && (
                            <p className="text-center text-xs text-muted-foreground animate-pulse">
                                قد تستغرق العملية بضع ثوانٍ حسب عدد الأصناف...
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Row 2: Search Playground ── */}
            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40 bg-muted/20">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Search className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm text-foreground">اختبار البحث</h2>
                        <p className="text-xs text-muted-foreground">بحث مباشر على فهرس Meilisearch</p>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            {isSearching && (
                                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-spin" />
                            )}
                            <Input
                                value={searchQuery}
                                onChange={e => handleSearchChange(e.target.value)}
                                placeholder="ابحث عن صنف في Meilisearch..."
                                className="pr-9 pl-9 h-10 rounded-xl border-border/50 bg-background"
                                dir="rtl"
                            />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <Select
                                value={availability}
                                onValueChange={(v) => setAvailability(v as AvailabilityFilter)}
                            >
                                <SelectTrigger className="h-10 w-[140px] rounded-xl">
                                    <SelectValue placeholder="التوفر" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الحالات</SelectItem>
                                    <SelectItem value="true">متوفر فقط</SelectItem>
                                    <SelectItem value="false">غير متوفر</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={searchLimit}
                                onValueChange={(v) => setSearchLimit(v as SearchLimit)}
                            >
                                <SelectTrigger className="h-10 w-[110px] rounded-xl">
                                    <SelectValue placeholder="الحد" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 نتائج</SelectItem>
                                    <SelectItem value="20">20 نتيجة</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                type="button"
                                variant={comparePrisma ? 'default' : 'outline'}
                                className="h-10 rounded-xl gap-1.5 shrink-0"
                                onClick={() => setComparePrisma((v) => !v)}
                            >
                                <GitCompareArrows className="h-3.5 w-3.5" />
                                قارن Prisma
                            </Button>
                        </div>
                    </div>

                    {searchResult && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{searchResult.estimatedTotal.toLocaleString('ar')} نتيجة Meili</span>
                            <div className="flex items-center gap-1 text-primary font-medium">
                                <Zap className="h-3 w-3" />
                                <Timer className="h-3 w-3" />
                                {searchResult.processingTimeMs} ms
                            </div>
                        </div>
                    )}

                    {searchResult?.prismaCompare && (
                        <PrismaComparePanel
                            compare={searchResult.prismaCompare}
                            meiliHits={searchResult.hits}
                        />
                    )}

                    {searchError && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/8 border border-destructive/20 text-sm text-destructive">
                            <XCircle className="h-4 w-4 shrink-0" />
                            {searchError}
                        </div>
                    )}

                    {!searchQuery && !searchResult && (
                        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                                <Search className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm text-muted-foreground">اكتب كلمة للبحث في الفهرس</p>
                        </div>
                    )}

                    {searchResult && searchResult.hits.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                            <FileSearch className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">لا توجد نتائج لـ «{searchResult.query}»</p>
                        </div>
                    )}

                    {searchResult && searchResult.hits.length > 0 && (
                        <div className="divide-y divide-border/40 rounded-xl border border-border/40 overflow-hidden">
                            {searchResult.hits.map((hit, idx) => (
                                <SearchHitRow key={hit.id} hit={hit} rank={idx + 1} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HighlightedText({
    text,
    fallback,
    className,
}: {
    text?: string | null
    fallback: string
    className?: string
}) {
    const source = text ?? fallback
    const nodes: ReactNode[] = []
    const re = /⟦(.*?)⟧/g
    let last = 0
    let match: RegExpExecArray | null
    let i = 0

    while ((match = re.exec(source)) !== null) {
        if (match.index > last) nodes.push(source.slice(last, match.index))
        nodes.push(
            <mark key={i++} className="bg-primary/25 text-foreground rounded-sm px-0.5 not-italic">
                {match[1]}
            </mark>
        )
        last = match.index + match[0].length
    }
    if (last < source.length) nodes.push(source.slice(last))

    return <span className={className}>{nodes.length > 0 ? nodes : fallback}</span>
}

function stripHighlightMarkers(text: string): string {
    return text.replace(/⟦|⟧/g, '')
}

function PrismaComparePanel({
    compare,
    meiliHits,
}: {
    compare: PrismaCompareResult
    meiliHits: SearchHit[]
}) {
    const meiliById = new Map(meiliHits.map((h) => [h.id, h]))
    const prismaById = new Map(compare.hits.map((h) => [h.id, h]))

    const labelFor = (id: string) => {
        const hit = meiliById.get(id) ?? prismaById.get(id)
        if (!hit) return id.slice(0, 8)
        return hit.name
    }

    return (
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <GitCompareArrows className="h-4 w-4 text-primary" />
                    مقارنة Meili ↔ Prisma
                </div>
                <p className="text-xs text-muted-foreground">
                    Prisma: {compare.estimatedTotal.toLocaleString('ar')} · {compare.processingTimeMs} ms
                </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-background/60 border border-border/40 p-2">
                    <p className="text-lg font-bold text-foreground">{compare.inBoth.length}</p>
                    <p className="text-[10px] text-muted-foreground">في الاثنين</p>
                </div>
                <div className="rounded-lg bg-background/60 border border-border/40 p-2">
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{compare.onlyInMeili.length}</p>
                    <p className="text-[10px] text-muted-foreground">Meili فقط</p>
                </div>
                <div className="rounded-lg bg-background/60 border border-border/40 p-2">
                    <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{compare.onlyInPrisma.length}</p>
                    <p className="text-[10px] text-muted-foreground">Prisma فقط</p>
                </div>
            </div>

            {(compare.onlyInMeili.length > 0 || compare.onlyInPrisma.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {compare.onlyInMeili.length > 0 && (
                        <div className="space-y-1">
                            <p className="font-medium text-amber-700 dark:text-amber-400">في Meili فقط</p>
                            <ul className="space-y-0.5 text-muted-foreground">
                                {compare.onlyInMeili.slice(0, 5).map((id) => (
                                    <li key={id}>
                                        <Link href={`/items/${id}`} className="hover:text-foreground truncate block">
                                            {labelFor(id)}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {compare.onlyInPrisma.length > 0 && (
                        <div className="space-y-1">
                            <p className="font-medium text-sky-700 dark:text-sky-400">في Prisma فقط</p>
                            <ul className="space-y-0.5 text-muted-foreground">
                                {compare.onlyInPrisma.slice(0, 5).map((id) => (
                                    <li key={id}>
                                        <Link href={`/items/${id}`} className="hover:text-foreground truncate block">
                                            {labelFor(id)}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function StatCard({
    label, value, icon, tone
}: {
    label: string
    value: string
    icon: ReactNode
    tone: 'primary' | 'muted'
}) {
    const tones = {
        primary: 'bg-primary/10 text-primary',
        muted:   'bg-muted text-muted-foreground',
    }
    return (
        <div className="rounded-xl bg-muted/30 p-3 space-y-1.5">
            <div className={cn('inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md', tones[tone])}>
                {icon}
                {label}
            </div>
            <p className="text-xl font-black text-foreground">{value}</p>
        </div>
    )
}

function SearchHitRow({ hit, rank }: { hit: SearchHit; rank: number }) {
    const highlightChips = (hit.highlights?.attributeText ?? [])
        .map(stripHighlightMarkers)
        .filter(Boolean)
        .slice(0, 2)
    const chips = [
        ...highlightChips,
        ...(hit.attributeText ?? []).filter((t) => !highlightChips.includes(t)).slice(0, 2),
        ...(hit.tags ?? []).slice(0, 2),
    ].slice(0, 3)

    const itemNumberDisplay = hit.highlights?.itemNumber
        ? stripHighlightMarkers(String(hit.highlights.itemNumber))
        : (hit.itemNumber ?? '—')

    return (
        <Link
            href={`/items/${hit.id}`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors group"
        >
            <span className="text-xs font-mono text-muted-foreground/60 w-5 shrink-0 text-center">{rank}</span>

            <div className="h-9 w-9 rounded-lg bg-muted/50 shrink-0 overflow-hidden flex items-center justify-center">
                <Package className="h-4 w-4 text-muted-foreground/40" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                    <HighlightedText
                        text={hit.highlights?.name}
                        fallback={hit.name}
                        className="text-sm font-medium text-foreground truncate min-w-0"
                    />
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                </div>
                {hit.productName && hit.productName !== hit.name && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        المنتج:{' '}
                        <HighlightedText
                            text={hit.highlights?.productName}
                            fallback={hit.productName}
                        />
                    </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <code className="font-mono" dir="ltr">
                        <HighlightedText
                            text={hit.highlights?.itemNumber ?? undefined}
                            fallback={itemNumberDisplay}
                        />
                    </code>
                    {hit.brand && <><span>·</span><span>{hit.brand}</span></>}
                    {hit.category && <><span>·</span><span>{hit.category}</span></>}
                </div>
                {chips.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {chips.map((chip, i) => (
                            <span
                                key={`${chip}-${i}`}
                                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground"
                            >
                                <Tag className="h-2.5 w-2.5" />
                                {chip}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    hit.isAvailable
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                )}>
                    {hit.isAvailable ? 'متوفر' : 'غير متوفر'}
                </span>
            </div>
        </Link>
    )
}
