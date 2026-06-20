"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WhatsappGroupSheet } from "@/components/whatsapp-groups/whatsapp-group-sheet"
import { useRouter } from "next/navigation"

interface CreateGroupButtonProps {
    customers: any[]
    supervisors: any[]
}

export function CreateGroupButton({ customers, supervisors }: CreateGroupButtonProps) {
    const [open, setOpen] = useState(false)
    const router = useRouter()

    return (
        <>
            <Button className="rounded-xl gap-2" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                <span>مجموعة جديدة</span>
            </Button>

            <WhatsappGroupSheet
                open={open}
                onOpenChange={setOpen}
                customers={customers}
                supervisors={supervisors}
                onSaved={() => router.refresh()}
            />
        </>
    )
}
