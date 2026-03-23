"use client"

import { useState, useEffect } from "react"
import { Plus, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CategorySheet } from "@/components/categories/category-sheet"
import { CategoryTable } from "@/components/categories/category-table"
import { getCategories } from "@/lib/actions/categories"
import { Category } from "@prisma/client"

export default function CategoriesPage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<Category | undefined>()
    const [categories, setCategories] = useState<Category[]>([])

    useEffect(() => {
        loadCategories()

        // Listen for edit events from the table
        const handleEdit = (e: Event) => {
            const customEvent = e as CustomEvent
            setSelectedCategory(customEvent.detail)
            setIsSheetOpen(true)
        }

        window.addEventListener("edit-category", handleEdit)
        return () => window.removeEventListener("edit-category", handleEdit)
    }, [])

    const loadCategories = async () => {
        const res = await getCategories()
        if (res.success && res.data) {
            setCategories(res.data)
        }
    }

    const handleSheetClose = () => {
        setIsSheetOpen(false)
        setSelectedCategory(undefined)
        loadCategories()
    }

    const activeCount = categories.filter(c => c.isActive).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        التصنيفات الرئيسية
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        إدارة تصنيفات المنتجات والمجموعات
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedCategory(undefined)
                        setIsSheetOpen(true)
                    }}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    إضافة تصنيف
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">إجمالي التصنيفات</p>
                            <h3 className="text-3xl font-bold mt-2">{categories.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Layers className="size-6 text-primary" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">التصنيفات النشطة</p>
                            <h3 className="text-3xl font-bold mt-2">{activeCount}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <span className="text-2xl">✓</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl border border-border/50 p-6">
                <CategoryTable data={categories} onRefresh={loadCategories} />
            </div>

            {/* Sheet */}
            <CategorySheet
                open={isSheetOpen}
                onOpenChange={handleSheetClose}
                category={selectedCategory}
            />
        </div>
    )
}
