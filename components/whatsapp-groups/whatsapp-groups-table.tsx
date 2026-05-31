"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/ui/data-table"
import { whatsappGroupColumns } from "./group-columns"
import { WhatsappGroupSheet } from "./whatsapp-group-sheet"
import type { WhatsappGroupRow } from "@/lib/types/whatsapp-groups"

interface WhatsappGroupsTableProps {
    data: WhatsappGroupRow[]
    customers: { id: string; name: string | null; contacts: { type: string; value: string }[] }[]
    supervisors: { id: string; name: string; contacts: { type: string; value: string }[] }[]
}

export function WhatsappGroupsTable({ data, customers, supervisors }: WhatsappGroupsTableProps) {
    const router = useRouter()
    const [, startTransition] = useTransition()
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedGroup, setSelectedGroup] = useState<WhatsappGroupRow | undefined>()

    const handleEdit = (group: WhatsappGroupRow) => {
        setSelectedGroup(group)
        setIsSheetOpen(true)
    }

    const handleRefresh = () => {
        startTransition(() => router.refresh())
    }

    const handleSheetClose = (open: boolean) => {
        if (!open) {
            setIsSheetOpen(false)
            setSelectedGroup(undefined)
        }
    }

    const columns = whatsappGroupColumns({ onEdit: handleEdit, onRefresh: handleRefresh })

    return (
        <>
            <DataTable
                columns={columns}
                data={data}
                searchPlaceholder="ابحث باسم المجموعة، العميل، أو المشرف..."
            />

            <WhatsappGroupSheet
                open={isSheetOpen}
                onOpenChange={handleSheetClose}
                group={selectedGroup}
                customers={customers}
                supervisors={supervisors}
                onSaved={handleRefresh}
            />
        </>
    )
}
