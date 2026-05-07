"use client"

import { ColumnDef } from "@tanstack/react-table"

interface PersonType {
    id: string
    name: string
    createdAt: Date
    updatedAt: Date
}

import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export const columns: ColumnDef<PersonType>[] = [
    {
        accessorKey: "name",
        header: "اسم النوع",
        cell: ({ row }) => (
            <div className="font-medium">{row.original.name}</div>
        ),
    },
    {
        accessorKey: "createdAt",
        header: "تاريخ الإنشاء",
        cell: ({ row }) => (
            <div className="text-sm text-muted-foreground">
                {new Date(row.original.createdAt).toLocaleDateString('ar-SA')}
            </div>
        ),
    },
    {
        id: "actions",
        cell: function ActionsCell({ row }) {
            const type = row.original

            return (
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                    const event = new CustomEvent("edit-person-type", {
                                        detail: type
                                    })
                                    window.dispatchEvent(event)
                                }}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>تعديل</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        },
    },
]
