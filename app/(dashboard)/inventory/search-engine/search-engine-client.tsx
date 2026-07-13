'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
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
    ArrowRight,
    Timer,
    FileSearch,
    Wifi,
    WifiOff,
    Info,
    Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
    dbProductCount: number
    inSync:         boolean
}

interface SyncResult {
    synced:      number
    errors:      number
    duration:    number
    indexedAt:   string
    unavailable?: boolean
}

interface SearchHit {
    id:           string
    itemNumber:   string | null
    name:         string
    brand:        string | null
    category:     string | null
    isAvailable:  boolean
    minPrice:     number | null
    primaryImage: string | null
}

interface SearchResult {
    hits:             SearchHit[]
    estimatedTotal:   number
    processingTimeMs: number
    query:            string
    unavailable?:     boolean
}

interface Props {
    initialStatus: StatusData | null
}

const SEARCH_DEBOUNCE_MS = 400

// ─────────────────────────────────────────────────────────────────────────────
export function SearchEngineClient({ initialStatus }: Props) {
    // ── Status state ─────────────────────────────────────────────────────────
    const [status, setStatus]           = useState<StatusData | null>(initialStatus)
    const [isRefreshingStatus, startRefreshStatus] = useTransition()

    // ── Sync state ───────────────────────────────────────────────────────────
    const [isSyncing, setIsSyncing]     = useState(false)
    const [syncResult, setSyncResult]   = useState<SyncResult | null>(null)
    const [syncError, setSyncError]     = useState<string | null>(null)

    // ── Search state ─────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Refresh Status ────────────────────────────────────────────────────────
    const refreshStatus = useCallback(() => {
        startRefreshStatus(async () => {
            try {
                const res = await fetch('/api/v1/dashboard/meilisearch/status')
                const json = await res.json()
                if (json.success) setStatus(json.data)
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
                    toast.success(`تمت المزامنة بنجاح — ${data.synced.toLocaleString('ar')} منتج`)
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
    const handleSearchChange = (value: string) => {
        setSearchQuery(value)
        if (searchDebounce.current) clearTimeout(searchDebounce.current)

        if (!value.trim()) {
            setSearchResult(null)
            setSearchError(null)
            return
        }

        searchDebounce.current = setTimeout(async () => {
            setIsSearching(true)
            setSearchError(null)
            try {
                const res  = await fetch(`/api/v1/dashboard/meilisearch/search?q=${encodeURIComponent(value)}&limit=10`)
                const json = await res.json()
                if (json.success) {
                    const data: SearchResult = json.data
                    if (data.unavailable) {
                        setSearchError('خدمة Meilisearch غير متاحة — تأكد من تشغيل الخدمة')
                    } else {
                        setSearchResult(data)
                    }
                } else {
                    setSearchError(json.error || 'فشل البحث')
                }
            } catch {
                setSearchError('تعذّر الاتصال بالخادم')
            } finally {
                setIsSearching(false)
            }
        }, SEARCH_DEBOUNCE_MS)
    }

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms} ميلي ثانية`
        return `${(ms / 1000).toFixed(1)} ثانية`
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6" dir="rtl">

            {/* ── Row 1: Status + Sync side by side ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Status Card — now wrapped in Tabs */}
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

                        {/* Tab 1: حالة الفهرس */}
                        <TabsContent value="status" className="mt-0">
                            <div className="p-5 space-y-4">
                                {!status ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        جارٍ التحميل...
                                    </div>
                                ) : (
                                    <>
                                        {/* Connection badge */}
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

                                        {/* Stats grid */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <StatCard
                                                label="مستندات مفهرسة"
                                                value={status.documentCount.toLocaleString('ar')}
                                                icon={<FileSearch className="h-3.5 w-3.5" />}
                                                color="blue"
                                            />
                                            <StatCard
                                                label="منتجات في قاعدة البيانات"
                                                value={status.dbProductCount.toLocaleString('ar')}
                                                icon={<Package className="h-3.5 w-3.5" />}
                                                color="violet"
                                            />
                                        </div>

                                        {/* Sync status */}
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

                                        {/* Index info */}
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Info className="h-3 w-3" />
                                            <span>الفهرس: <code className="font-mono bg-muted/60 px-1 rounded">{status.indexName}</code></span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </TabsContent>

                        {/* Tab 2: الفهارس */}
                        <TabsContent value="indexes" className="mt-0">
                            <div className="p-5">
                                <IndexesPanel />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sync Card */}
                <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40 bg-muted/20">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow">
                            <RefreshCw className="h-4 w-4" />
                        </div>
                        <h2 className="font-semibold text-sm text-foreground">المزامنة الكاملة</h2>
                    </div>

                    <div className="p-5 space-y-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            يقوم هذا الإجراء بتصدير <strong>جميع المنتجات</strong> من قاعدة البيانات إلى فهرس Meilisearch.
                            يُستخدم عند وجود بيانات غير متزامنة أو عند تهيئة الفهرس لأول مرة.
                        </p>

                        {/* Sync result */}
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
                                            {syncResult.synced.toLocaleString('ar')} منتج
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

                        <Button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={cn(
                                'w-full gap-2 font-medium transition-all',
                                isSyncing
                                    ? 'bg-violet-600/80 cursor-not-allowed'
                                    : 'bg-gradient-to-l from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 shadow-md shadow-violet-500/20'
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

                        {isSyncing && (
                            <p className="text-center text-xs text-muted-foreground animate-pulse">
                                قد تستغرق العملية بضع ثوانٍ حسب عدد المنتجات...
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Row 2: Search Playground (full width) ── */}
            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40 bg-muted/20">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow">
                        <Search className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm text-foreground">اختبار البحث</h2>
                        <p className="text-xs text-muted-foreground">بحث مباشر على فهرس Meilisearch</p>
                    </div>
                </div>

                <div className="p-5 space-y-4">
                    {/* Search input */}
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        {isSearching && (
                            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 animate-spin" />
                        )}
                        <Input
                            value={searchQuery}
                            onChange={e => handleSearchChange(e.target.value)}
                            placeholder="ابحث عن منتج في Meilisearch..."
                            className="pr-9 pl-9 h-10 rounded-xl border-border/50 bg-background"
                            dir="rtl"
                        />
                    </div>

                    {/* Search timing badge */}
                    {searchResult && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{searchResult.estimatedTotal.toLocaleString('ar')} نتيجة</span>
                            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <Zap className="h-3 w-3" />
                                <Timer className="h-3 w-3" />
                                {searchResult.processingTimeMs} ms
                            </div>
                        </div>
                    )}

                    {/* Search error */}
                    {searchError && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/8 border border-destructive/20 text-sm text-destructive">
                            <XCircle className="h-4 w-4 shrink-0" />
                            {searchError}
                        </div>
                    )}

                    {/* Empty state */}
                    {!searchQuery && !searchResult && (
                        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                            <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                                <Search className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm text-muted-foreground">اكتب كلمة للبحث في الفهرس</p>
                        </div>
                    )}

                    {/* Results */}
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

function StatCard({
    label, value, icon, color
}: {
    label: string
    value: string
    icon: React.ReactNode
    color: 'blue' | 'violet'
}) {
    const colors = {
        blue:   'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    }
    return (
        <div className="rounded-xl bg-muted/30 p-3 space-y-1.5">
            <div className={cn('inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-md', colors[color])}>
                {icon}
                {label}
            </div>
            <p className="text-xl font-black text-foreground">{value}</p>
        </div>
    )
}

function SearchHitRow({ hit, rank }: { hit: SearchHit; rank: number }) {
    return (
        <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
            {/* Rank */}
            <span className="text-xs font-mono text-muted-foreground/60 w-5 shrink-0 text-center">{rank}</span>

            {/* Image placeholder */}
            <div className="h-9 w-9 rounded-lg bg-muted/50 shrink-0 overflow-hidden flex items-center justify-center">
                {hit.primaryImage
                    ? <img src={hit.primaryImage} alt={hit.name} className="h-full w-full object-cover" />
                    : <Package className="h-4 w-4 text-muted-foreground/40" />
                }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{hit.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <code className="font-mono">{hit.itemNumber ?? '—'}</code>
                    {hit.brand && <><span>·</span><span>{hit.brand}</span></>}
                    {hit.category && <><span>·</span><span>{hit.category}</span></>}
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
                {hit.minPrice !== null && (
                    <span className="text-xs font-semibold text-foreground/80">
                        {hit.minPrice.toLocaleString('ar')}
                    </span>
                )}
                <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    hit.isAvailable
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                )}>
                    {hit.isAvailable ? 'متوفر' : 'غير متوفر'}
                </span>
            </div>
        </div>
    )
}
