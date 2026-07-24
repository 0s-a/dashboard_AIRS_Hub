export const dynamic = 'force-dynamic'

import { ArrowRight, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SearchEngineClient } from './search-engine-client'
import { getMeilisearchStats } from '@/lib/utils/meilisearch-sync'
import { prisma } from '@/lib/prisma'

export const metadata = {
    title: 'محرك البحث Meilisearch | إدارة الأصناف',
}

export default async function SearchEnginePage() {
    // Fetch initial data server-side (best-effort — graceful on connection failure)
    let initialStatus = null
    try {
        const [stats, dbCount] = await Promise.all([
            getMeilisearchStats(),
            prisma.item.count(),
        ])
        initialStatus = {
            ...stats,
            dbItemCount: dbCount,
            inSync: stats.connected && stats.documentCount === dbCount,
        }
    } catch {
        // Meilisearch might not be running yet — client will show disconnected state
    }

    return (
        <div
            className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-5xl mx-auto"
            dir="rtl"
        >
            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/items">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/25 text-white">
                            <Search className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-l from-amber-500 to-orange-500">
                                محرك البحث
                            </h1>
                            <p className="text-muted-foreground text-sm mt-0.5 opacity-80">
                                إدارة فهرس Meilisearch — مزامنة البيانات واختبار البحث
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main client component ────────────────────────────────────── */}
            <SearchEngineClient initialStatus={initialStatus} />
        </div>
    )
}
