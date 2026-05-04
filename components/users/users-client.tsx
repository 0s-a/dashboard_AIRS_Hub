"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserSheet } from "@/components/users/user-sheet"
import { UserTable } from "@/components/users/user-table"
import type { UserRow } from "@/components/users/user-columns"

interface UsersClientProps {
    initialUsers: UserRow[]
}

export function UsersClient({ initialUsers }: UsersClientProps) {
    const [users, setUsers] = useState<UserRow[]>(initialUsers)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<UserRow | undefined>()

    const handleEdit = (user: UserRow) => {
        setSelectedUser(user)
        setIsSheetOpen(true)
    }

    const handleRefresh = (updated: UserRow[]) => {
        setUsers(updated)
    }

    const handleSheetClose = (open: boolean) => {
        if (!open) {
            setIsSheetOpen(false)
            setSelectedUser(undefined)
        }
    }

    return (
        <>
            <Button
                onClick={() => { setSelectedUser(undefined); setIsSheetOpen(true) }}
                className="gap-2"
            >
                <Plus className="h-4 w-4" />
                إضافة مستخدم
            </Button>

            <div className="glass-panel rounded-xl border border-border/50 p-6">
                <UserTable data={users} onEdit={handleEdit} onRefresh={handleRefresh} />
            </div>

            <UserSheet
                open={isSheetOpen}
                onOpenChange={handleSheetClose}
                user={selectedUser}
                onSaved={handleRefresh}
            />
        </>
    )
}
