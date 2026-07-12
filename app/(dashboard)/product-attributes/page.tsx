"use client"

import { useState, useEffect } from "react"
import { Plus, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AttributeSheet } from "@/components/product-attributes/attribute-sheet"
import { AttributeTable } from "@/components/product-attributes/attribute-table"
import { getProductAttributes } from "@/lib/actions/product-attributes"
import { ProductAttribute } from "@prisma/client"

export default function ProductAttributesPage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedAttribute, setSelectedAttribute] = useState<ProductAttribute | undefined>()
    const [attributes, setAttributes] = useState<ProductAttribute[]>([])

    const loadAttributes = async () => {
        const res = await getProductAttributes()
        if (res.success && res.data) {
            setAttributes(res.data)
        }
    }

    useEffect(() => {
        void getProductAttributes().then((res) => {
            if (res.success && res.data) {
                setAttributes(res.data)
            }
        })
        const handleEdit = (e: Event) => {
            const customEvent = e as CustomEvent<ProductAttribute>
            setSelectedAttribute(customEvent.detail)
            setIsSheetOpen(true)
        }
        window.addEventListener("edit-product-attribute", handleEdit)
        return () => window.removeEventListener("edit-product-attribute", handleEdit)
    }, [])

    const handleSheetClose = () => {
        setIsSheetOpen(false)
        setSelectedAttribute(undefined)
        loadAttributes()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        خصائص المنتجات
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        كتالوج مرجعي لأسماء صفات المنتجات
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedAttribute(undefined)
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
                        <SlidersHorizontal className="size-6 text-primary" />
                    </div>
                </div>
            </div>

            <div className="glass-panel rounded-xl border border-border/50 p-6">
                <AttributeTable data={attributes} onRefresh={loadAttributes} />
            </div>

            <AttributeSheet
                open={isSheetOpen}
                onOpenChange={(open) => {
                    if (!open) handleSheetClose()
                }}
                attribute={selectedAttribute}
            />
        </div>
    )
}
