export const dynamic = "force-dynamic"

import React from 'react'
import { ImportWizard } from '@/components/inventory/import/import-wizard'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getProductFilterOptions } from '@/lib/actions/inventory'
import { getProductFamilies } from '@/lib/actions/product-families'

export const metadata = {
    title: 'استيراد المنتجات | إدارة المنتجات',
}

export default async function ImportPage() {
    const [{ brands }, familiesRes] = await Promise.all([
        getProductFilterOptions(),
        getProductFamilies(),
    ])

    const families = (familiesRes.success && familiesRes.data
        ? familiesRes.data
        : []
    ).map(f => ({ id: f.id, code: f.code, name: f.name }))

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-6xl mx-auto">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/products">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-linear-to-l from-primary to-indigo-600">استيراد المنتجات</h1>
                        <p className="text-muted-foreground text-sm mt-1 opacity-80">
                            قم برفع ملف CSV لاستيراد المنتجات بالجملة إلى النظام.
                        </p>
                    </div>
                </div>
            </div>

            <ImportWizard families={families} brands={brands} />
        </div>
    )
}
