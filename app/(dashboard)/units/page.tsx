"use client"

import { useState, useEffect } from "react"
import { Plus, Package, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UnitSheet } from "@/components/units/unit-sheet"
import { UnitTable } from "@/components/units/unit-table"
import { UnitRow } from "@/components/units/columns"
import { getUnits } from "@/lib/actions/units"

export default function UnitsPage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedUnit, setSelectedUnit] = useState<UnitRow | undefined>()
    const [units, setUnits] = useState<UnitRow[]>([])

    useEffect(() => {
        loadUnits()

        const handleEdit = (e: Event) => {
            const customEvent = e as CustomEvent
            setSelectedUnit(customEvent.detail)
            setIsSheetOpen(true)
        }

        window.addEventListener("edit-unit", handleEdit)
        return () => window.removeEventListener("edit-unit", handleEdit)
    }, [])

    const loadUnits = async () => {
        const res = await getUnits()
        if (res.success && res.data) {
            setUnits(res.data as UnitRow[])
        }
    }

    const handleSheetClose = () => {
        setIsSheetOpen(false)
        setSelectedUnit(undefined)
        loadUnits()
    }

    const activeCount = units.filter(u => u.isActive).length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background/50 backdrop-blur-xl p-6 rounded-2xl border border-border/50 shadow-xs">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary via-primary/90 to-indigo-500 bg-clip-text text-transparent flex items-center gap-3">
                        <Package className="h-8 w-8 text-primary" />
                        وحدات القياس
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        إدارة وحدات التعبئة والتغليف للمنتجات. النظام يقوم بالترقيم تلقائياً لتسهيل العمل.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedUnit(undefined)
                        setIsSheetOpen(true)
                    }}
                    className="gap-2 h-11 px-6 rounded-xl shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold"
                >
                    <Plus className="h-5 w-5" />
                    إضافة وحدة جديدة
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">إجمالي الوحدات</p>
                            <h3 className="text-3xl font-bold mt-2">{units.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Package className="size-6 text-primary" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">الوحدات النشطة</p>
                            <h3 className="text-3xl font-bold mt-2">{activeCount}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <CheckCircle2 className="size-6 text-green-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-2xl border border-border/50 p-1 sm:p-2 bg-background/40 shadow-xs">
                {units.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/10 rounded-xl border border-dashed border-border/60 m-4">
                        <div className="size-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-5 ring-1 ring-primary/20">
                            <Package className="size-8 text-primary/60" />
                        </div>
                        <p className="text-muted-foreground font-medium">لا توجد وحدات بعد</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                            أضف وحدة مثل حبة، كرتون، درزن...
                        </p>
                        <Button
                            onClick={() => { setSelectedUnit(undefined); setIsSheetOpen(true) }}
                            className="mt-6 gap-2 rounded-xl shadow-xs"
                            size="lg"
                        >
                            <Plus className="h-5 w-5" />
                            تأسيس أول وحدة
                        </Button>
                    </div>
                ) : (
                    <UnitTable data={units} onRefresh={loadUnits} />
                )}
            </div>

            {/* Sheet */}
            <UnitSheet
                open={isSheetOpen}
                onOpenChange={handleSheetClose}
                unit={selectedUnit}
            />
        </div>
    )
}
