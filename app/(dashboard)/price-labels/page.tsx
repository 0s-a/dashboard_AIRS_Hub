"use client"

import { useState, useEffect } from "react"
import { Plus, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PriceLabelSheet } from "@/components/price-labels/price-label-sheet"
import { PriceLabelTable } from "@/components/price-labels/price-label-table"
import { getPriceLabels } from "@/lib/actions/price-labels"
import { PriceLabel } from "@prisma/client"

export default function PriceLabelsPage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedLabel, setSelectedLabel] = useState<PriceLabel | undefined>()
    const [labels, setLabels] = useState<PriceLabel[]>([])

    useEffect(() => {
        loadLabels()

        const handleEdit = (e: Event) => {
            const customEvent = e as CustomEvent
            setSelectedLabel(customEvent.detail)
            setIsSheetOpen(true)
        }

        window.addEventListener("edit-price-label", handleEdit)
        return () => window.removeEventListener("edit-price-label", handleEdit)
    }, [])

    const loadLabels = async () => {
        const res = await getPriceLabels()
        if (res.success && res.data) {
            setLabels(res.data)
        }
    }

    const handleSheetClose = () => {
        setIsSheetOpen(false)
        setSelectedLabel(undefined)
        loadLabels()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        مسميات التسعيرات
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        إدارة مسميات الأسعار مثل سعر الجملة وسعر المفرد
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedLabel(undefined)
                        setIsSheetOpen(true)
                    }}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    إضافة تسعيرة
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">إجمالي التسعيرات</p>
                            <h3 className="text-3xl font-bold mt-2">{labels.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Tag className="size-6 text-primary" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl border border-border/50 p-6">
                <PriceLabelTable data={labels} />
            </div>

            {/* Sheet */}
            <PriceLabelSheet
                open={isSheetOpen}
                onOpenChange={handleSheetClose}
                priceLabel={selectedLabel}
            />
        </div>
    )
}
