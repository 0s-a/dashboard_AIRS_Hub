"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Tags } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AttributeSheet } from "@/components/product-attributes/attribute-sheet"
import { AttributeTable } from "@/components/product-attributes/attribute-table"
import { getItemAttributes } from "@/lib/actions/item-attributes"
import type { SerializedItemAttributeCatalog } from "@/lib/types/item-attribute"

export default function ProductAttributesPage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selected, setSelected] = useState<SerializedItemAttributeCatalog | undefined>()
    const [attributes, setAttributes] = useState<SerializedItemAttributeCatalog[]>([])

    const loadAttributes = useCallback(async () => {
        const res = await getItemAttributes()
        if (res.success && res.data) {
            setAttributes(res.data)
        }
    }, [])

    useEffect(() => {
        void loadAttributes()
    }, [loadAttributes])

    const handleSheetClose = () => {
        setIsSheetOpen(false)
        setSelected(undefined)
        void loadAttributes()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        صفات الأصناف
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        كتالوج الصفات — لون، مقاس، سعة… مع أمثلة قيم للتعبئة السريعة على الأصناف
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setSelected(undefined)
                        setIsSheetOpen(true)
                    }}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    إضافة صفة
                </Button>
            </div>

            <div className="glass-panel rounded-xl p-6 border border-border/50 w-fit min-w-48">
                <div className="flex items-center justify-between gap-8">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">إجمالي الصفات</p>
                        <h3 className="text-3xl font-bold mt-2">{attributes.length}</h3>
                    </div>
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Tags className="size-6 text-primary" />
                    </div>
                </div>
            </div>

            <div className="glass-panel rounded-xl border border-border/50 p-6">
                <AttributeTable
                    data={attributes}
                    onEdit={(attr) => {
                        setSelected(attr)
                        setIsSheetOpen(true)
                    }}
                    onRefresh={loadAttributes}
                />
            </div>

            <AttributeSheet
                open={isSheetOpen}
                onOpenChange={(open) => {
                    if (!open) handleSheetClose()
                    else setIsSheetOpen(true)
                }}
                attribute={selected}
            />
        </div>
    )
}
