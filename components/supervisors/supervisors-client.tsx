"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SupervisorSheet } from "@/components/supervisors/supervisor-sheet"
import { SupervisorTable } from "@/components/supervisors/supervisor-table"
import type { SupervisorRow } from "@/components/supervisors/supervisor-columns"

interface SupervisorsClientProps {
    initialSupervisors: SupervisorRow[]
}

export function SupervisorsClient({ initialSupervisors }: SupervisorsClientProps) {
    const [supervisors, setSupervisors] = useState<SupervisorRow[]>(initialSupervisors)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedSupervisor, setSelectedSupervisor] = useState<SupervisorRow | undefined>()

    const handleEdit = (s: SupervisorRow) => {
        setSelectedSupervisor(s)
        setIsSheetOpen(true)
    }

    const handleRefresh = (updated: SupervisorRow[]) => {
        setSupervisors(updated)
    }

    const handleSheetClose = (open: boolean) => {
        if (!open) {
            setIsSheetOpen(false)
            setSelectedSupervisor(undefined)
        }
    }

    return (
        <>
            <Button
                onClick={() => { setSelectedSupervisor(undefined); setIsSheetOpen(true) }}
                className="gap-2"
            >
                <Plus className="h-4 w-4" />
                إضافة مشرف
            </Button>

            <div className="glass-panel rounded-xl border border-border/50 p-6">
                <SupervisorTable data={supervisors} onEdit={handleEdit} onRefresh={handleRefresh} />
            </div>

            <SupervisorSheet
                open={isSheetOpen}
                onOpenChange={handleSheetClose}
                supervisor={selectedSupervisor}
                onSaved={handleRefresh}
            />
        </>
    )
}
