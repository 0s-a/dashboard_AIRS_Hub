"use client"

import { useState, useEffect } from "react"
import { Plus, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ColorSheet } from "@/components/colors/color-sheet"
import { ColorTable } from "@/components/colors/color-table"
import { getColors } from "@/lib/actions/colors"
import { Color } from "@prisma/client"

export default function ColorsPage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedColor, setSelectedColor] = useState<Color | undefined>()
    const [colors, setColors] = useState<Color[]>([])

    const loadColors = async () => {
        const res = await getColors()
        if (res.success && res.data) {
            setColors(res.data)
        }
    }

    useEffect(() => {
        void getColors().then((res) => {
            if (res.success && res.data) {
                setColors(res.data)
            }
        })
        const handleEdit = (e: Event) => {
            const customEvent = e as CustomEvent<Color>
            setSelectedColor(customEvent.detail)
            setIsSheetOpen(true)
        }
        window.addEventListener("edit-color", handleEdit)
        return () => window.removeEventListener("edit-color", handleEdit)
    }, [])

    const handleSheetClose = () => {
        setIsSheetOpen(false)
        setSelectedColor(undefined)
        loadColors()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        الألوان
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        كتalog مرجعي للألوان — كود 2–4 أحرف فريد لكل لون
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedColor(undefined)
                        setIsSheetOpen(true)
                    }}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    إضافة لون
                </Button>
            </div>

            <div className="glass-panel rounded-xl p-6 border border-border/50 w-fit min-w-48">
                <div className="flex items-center justify-between gap-8">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">إجمالي الألوان</p>
                        <h3 className="text-3xl font-bold mt-2">{colors.length}</h3>
                    </div>
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Palette className="size-6 text-primary" />
                    </div>
                </div>
            </div>

            <div className="glass-panel rounded-xl border border-border/50 p-6">
                <ColorTable data={colors} onRefresh={loadColors} />
            </div>

            <ColorSheet
                open={isSheetOpen}
                onOpenChange={(open) => {
                    if (!open) handleSheetClose()
                }}
                color={selectedColor}
            />
        </div>
    )
}
