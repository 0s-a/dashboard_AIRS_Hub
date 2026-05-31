"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, ToggleLeft, ToggleRight, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WhatsappGroupSheet } from "@/components/whatsapp-groups/whatsapp-group-sheet"
import {
    deleteWhatsappGroup,
    toggleWhatsappGroupActive,
    resendWhatsappGroupWebhook,
} from "@/lib/actions/whatsapp-groups"
import { toast } from "sonner"

interface GroupDetailActionsProps {
    group: any
    allCustomers: any[]
    allSupervisors: any[]
}

export function GroupDetailActions({ group, allCustomers, allSupervisors }: GroupDetailActionsProps) {
    const router = useRouter()
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [isDeleting, setIsDeleting]   = useState(false)
    const [isToggling, setIsToggling]   = useState(false)
    const [isSending, setIsSending]     = useState(false)

    const handleDelete = async () => {
        if (!confirm(`هل تريد حذف مجموعة "${group.name}"؟ لا يمكن التراجع عن هذا الإجراء.`)) return
        setIsDeleting(true)
        const res = await deleteWhatsappGroup(group.id)
        if (res.success) {
            toast.success("تم حذف المجموعة")
            router.push("/whatsapp-groups")
        } else {
            toast.error(res.error ?? "تعذّر الحذف")
            setIsDeleting(false)
        }
    }

    const handleToggle = async () => {
        setIsToggling(true)
        const res = await toggleWhatsappGroupActive(group.id, !group.isActive)
        if (res.success) {
            toast.success(group.isActive ? "تم تعطيل المجموعة" : "تم تفعيل المجموعة")
            router.refresh()
        } else {
            toast.error(res.error ?? "تعذّر تغيير الحالة")
        }
        setIsToggling(false)
    }

    const handleResend = async () => {
        setIsSending(true)
        const toastId = toast.loading("جاري الإرسال إلى n8n...")
        const res = await resendWhatsappGroupWebhook(group.id)
        toast.dismiss(toastId)
        if (res.success) {
            const data = res.data as { memberCount: number }
            toast.success(`تم الإرسال بنجاح — ${data?.memberCount ?? 0} أرقام`, {
                description: "تم إرسال بيانات المجموعة إلى n8n",
            })
        } else {
            toast.error(res.error ?? "تعذّر الإرسال", {
                description: "تحقق من إعدادات N8N_WHATSAPP_WEBHOOK_URL",
            })
        }
        setIsSending(false)
    }

    return (
        <>
            <div className="flex items-center gap-2 flex-wrap">
                {/* إعادة الإرسال إلى n8n */}
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                    onClick={handleResend}
                    disabled={isSending}
                    title="إعادة إرسال بيانات المجموعة إلى n8n"
                >
                    {isSending
                        ? <Loader2 className="size-4 animate-spin" />
                        : <Send className="size-4" />
                    }
                    {isSending ? "جاري الإرسال..." : "إرسال إلى n8n"}
                </Button>

                {/* تفعيل / تعطيل */}
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl"
                    onClick={handleToggle}
                    disabled={isToggling}
                >
                    {group.isActive
                        ? <><ToggleLeft className="size-4 text-amber-500" /> تعطيل</>
                        : <><ToggleRight className="size-4 text-emerald-500" /> تفعيل</>
                    }
                </Button>

                {/* تعديل */}
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl"
                    onClick={() => setIsSheetOpen(true)}
                >
                    <Pencil className="size-4" />
                    تعديل
                </Button>

                {/* حذف */}
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl text-destructive hover:text-destructive hover:border-destructive/30"
                    onClick={handleDelete}
                    disabled={isDeleting}
                >
                    <Trash2 className="size-4" />
                    حذف
                </Button>
            </div>

            <WhatsappGroupSheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                group={group}
                customers={allCustomers}
                supervisors={allSupervisors}
                onSaved={() => router.refresh()}
            />
        </>
    )
}
