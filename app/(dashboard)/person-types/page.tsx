"use client"

import { useState, useEffect } from "react"
import { Plus, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PersonTypeSheet } from "@/components/person-types/person-type-sheet"
import { PersonTypeTable } from "@/components/person-types/person-type-table"
import { getPersonTypes } from "@/lib/actions/person-types"

interface PersonType {
    id: string
    name: string
    description: string | null
    color: string | null
    icon: string | null
    notes: string | null
    isDefault: boolean
    createdAt: Date
    updatedAt: Date
}

export default function PersonTypesPage() {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedType, setSelectedType] = useState<PersonType | undefined>()
    const [types, setTypes] = useState<PersonType[]>([])

    useEffect(() => {
        loadTypes()

        const handleEdit = (e: Event) => {
            const customEvent = e as CustomEvent
            setSelectedType(customEvent.detail)
            setIsSheetOpen(true)
        }

        window.addEventListener("edit-person-type", handleEdit)
        return () => window.removeEventListener("edit-person-type", handleEdit)
    }, [])

    const loadTypes = async () => {
        const res = await getPersonTypes()
        if (res.success && res.data) {
            setTypes(res.data)
        }
    }

    const handleSheetClose = () => {
        setIsSheetOpen(false)
        setSelectedType(undefined)
        loadTypes()
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-linear-to-l from-primary to-indigo-400 bg-clip-text text-transparent">
                        أنواع الأشخاص
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        إدارة تصنيفات وأنواع الأشخاص
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setSelectedType(undefined)
                        setIsSheetOpen(true)
                    }}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    إضافة نوع
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="glass-panel rounded-xl p-6 border border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">إجمالي الأنواع</p>
                            <h3 className="text-3xl font-bold mt-2">{types.length}</h3>
                        </div>
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <UserCog className="size-6 text-primary" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl border border-border/50 p-6">
                <PersonTypeTable data={types} />
            </div>

            {/* Sheet */}
            <PersonTypeSheet
                open={isSheetOpen}
                onOpenChange={handleSheetClose}
                personType={selectedType}
            />
        </div>
    )
}
