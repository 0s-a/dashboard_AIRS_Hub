"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
    Loader2, Save, MessageSquare, X, Users, User, Plus, Settings, Send
} from "lucide-react"
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
    Command, CommandEmpty, CommandGroup,
    CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { createWhatsappGroup, updateWhatsappGroup, resendWhatsappGroupWebhook } from "@/lib/actions/whatsapp-groups"
import { whatsappGroupSchema } from "@/lib/validations/whatsapp-groups"
import type { WhatsappGroupRow } from "@/lib/types/whatsapp-groups"
import type { z } from "zod"

type FormValues = z.infer<typeof whatsappGroupSchema>

interface WhatsappGroupSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    group?: WhatsappGroupRow
    customers: { id: string; name: string | null; contacts: { type: string; value: string }[] }[]
    supervisors: { id: string; name: string; contacts: { type: string; value: string }[] }[]
    onSaved: () => void
}

export function WhatsappGroupSheet({
    open, onOpenChange, group, customers, supervisors, onSaved
}: WhatsappGroupSheetProps) {
    const isEditing = !!group
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [customerOpen, setCustomerOpen] = useState(false)
    const [supervisorOpen, setSupervisorOpen] = useState(false)
    const [selectedSupervisorIds, setSelectedSupervisorIds] = useState<string[]>([])
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(whatsappGroupSchema),
        defaultValues: {
            name: "", groupNumber: "", notes: "",
            isActive: true, customerId: "", supervisorIds: [],
        },
    })

    // Reset form when group changes
    useEffect(() => {
        if (open) {
            if (group) {
                const sids = group.supervisors.map(s => s.supervisorId)
                reset({
                    name:          group.name,
                    groupNumber:   group.groupNumber ?? "",
                    notes:         group.notes ?? "",
                    isActive:      group.isActive,
                    customerId:    group.customerId,
                    supervisorIds: sids,
                })
                setSelectedCustomerId(group.customerId)
                setSelectedSupervisorIds(sids)
            } else {
                reset({ name: "", groupNumber: "", notes: "", isActive: true, customerId: "", supervisorIds: [] })
                setSelectedCustomerId("")
                setSelectedSupervisorIds([])
            }
        }
    }, [open, group, reset])

    const toggleSupervisor = (id: string) => {
        setSelectedSupervisorIds(prev => {
            const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
            setValue("supervisorIds", next)
            return next
        })
    }

    const removeSupervisor = (id: string) => {
        setSelectedSupervisorIds(prev => {
            const next = prev.filter(s => s !== id)
            setValue("supervisorIds", next)
            return next
        })
    }

    const selectCustomer = (id: string) => {
        setSelectedCustomerId(id)
        setValue("customerId", id)
        setCustomerOpen(false)
    }

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true)
        try {
            const payload = {
                ...data,
                name:          data.name || "",
                isActive:      data.isActive ?? true,
                groupNumber:   data.groupNumber?.trim() || null,
                notes:         data.notes?.trim() || null,
                supervisorIds: selectedSupervisorIds,
            }

            const res = isEditing
                ? await updateWhatsappGroup(group!.id, payload)
                : await createWhatsappGroup(payload)

            if (res.success) {
                toast.success(isEditing ? "تم تحديث المجموعة بنجاح" : "تم إنشاء المجموعة بنجاح")
                onOpenChange(false)
                onSaved()
                router.refresh()
            } else {
                toast.error((res as any).error ?? "حدث خطأ أثناء الحفظ", { duration: 6000 })
            }
        } catch {
            toast.error("حدث خطأ غير متوقع")
        } finally {
            setIsLoading(false)
        }
    }

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId)
    const selectedSupervisors = supervisors.filter(s => selectedSupervisorIds.includes(s.id))
    const isActive = watch("isActive")
    
    const [isSendingN8n, setIsSendingN8n] = useState(false)
    const handleResendN8n = async () => {
        if (!group?.id) return
        setIsSendingN8n(true)
        try {
            const res = await resendWhatsappGroupWebhook(group.id)
            if (res.success) {
                toast.success("تم إرسال بيانات المجموعة إلى n8n بنجاح")
            } else {
                toast.error((res as any).error ?? "حدث خطأ أثناء الإرسال")
            }
        } catch {
            toast.error("حدث خطأ غير متوقع")
        } finally {
            setIsSendingN8n(false)
        }
    }
    
    // حساب اسم المجموعة تلقائياً للعرض
    const suffix = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_SUFFIX || " | بيوتفي"
    const autoGroupName = selectedCustomer ? `${selectedCustomer.name}${suffix}` : (isEditing ? group!.name : "")

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-4 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <MessageSquare className="size-5 text-emerald-600" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold">
                                    {isEditing ? "تعديل المجموعة" : "إنشاء مجموعة واتساب"}
                                </SheetTitle>
                                <SheetDescription className="text-xs">
                                    {isEditing ? "عدّل بيانات مجموعة الواتساب" : "أدخل بيانات المجموعة الجديدة"}
                                </SheetDescription>
                            </div>
                        </div>
                        {isEditing && (
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-9 gap-2 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700"
                                onClick={handleResendN8n}
                                disabled={isSendingN8n}
                            >
                                {isSendingN8n ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                إرسال لـ n8n
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-5 px-1 pb-10">

                    {/* القسم الأول: البيانات الأساسية */}
                    {isEditing && (
                        <div className="p-5 rounded-2xl border border-border/50 bg-card shadow-sm space-y-5">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <div className="size-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                                    <MessageSquare className="size-3.5 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-sm">البيانات الأساسية</h3>
                            </div>

                            <div className="flex gap-4">
                                {/* اسم المجموعة */}
                                <div className="space-y-2 flex-1">
                                    <Label htmlFor="grp-name" className="text-sm font-semibold">
                                        اسم المجموعة
                                    </Label>
                                    <Input
                                        id="grp-name"
                                        value={autoGroupName}
                                        readOnly
                                        className="h-10 rounded-xl bg-muted text-muted-foreground select-none cursor-not-allowed"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        يتم توليد اسم المجموعة تلقائياً بناءً على اسم العميل.
                                    </p>
                                </div>

                                {/* كود المجموعة */}
                                <div className="space-y-2 w-24">
                                    <Label className="text-sm font-semibold">الكود</Label>
                                    <div className="h-10 rounded-xl bg-muted border border-border/50 flex items-center justify-center font-mono font-bold tracking-widest text-muted-foreground">
                                        {group?.code || '---'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* القسم الثاني: الارتباطات */}
                    <div className="p-5 rounded-2xl border border-border/50 bg-card shadow-sm space-y-5">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <div className="size-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                                <Users className="size-3.5 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-sm">الارتباطات</h3>
                        </div>

                        {/* اختيار العميل */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">
                                العميل <span className="text-destructive">*</span>
                            </Label>
                            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        type="button"
                                        className={`w-full h-11 rounded-xl justify-between font-normal bg-background hover:bg-muted/50 transition-colors ${!selectedCustomer ? "text-muted-foreground" : ""}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="size-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                                                <User className="size-3.5" />
                                            </div>
                                            <span className="truncate font-medium">
                                                {selectedCustomer?.name ?? "اضغط لاختيار عميل..."}
                                            </span>
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0 rounded-xl border-border/50 shadow-lg" align="start">
                                    <Command>
                                        <CommandInput placeholder="ابحث عن عميل..." className="h-10" />
                                        <CommandList className="max-h-60">
                                            <CommandEmpty className="py-6 text-sm text-center text-muted-foreground">لا يوجد عملاء مطابقين</CommandEmpty>
                                            <CommandGroup>
                                                {customers.map(c => (
                                                    <CommandItem
                                                        key={c.id}
                                                        value={c.name ?? c.id}
                                                        onSelect={() => selectCustomer(c.id)}
                                                        className="gap-3 py-2 cursor-pointer"
                                                    >
                                                        <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${selectedCustomerId === c.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted"}`}>
                                                            <User className="size-4" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-bold truncate">{c.name ?? "—"}</span>
                                                            {c.contacts.find(x => x.type === "phone") && (
                                                                <span className="text-[11px] text-muted-foreground font-mono mt-0.5" dir="ltr">
                                                                    {c.contacts.find(x => x.type === "phone")?.value}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {errors.customerId && <p className="text-xs text-destructive">{errors.customerId.message}</p>}
                        </div>

                        {/* اختيار المشرفين */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">
                                    المشرفون <span className="text-destructive">*</span>
                                </Label>
                                <Popover open={supervisorOpen} onOpenChange={setSupervisorOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="secondary" size="sm" type="button" className="h-8 gap-1.5 text-xs rounded-lg hover:bg-secondary/80">
                                            <Plus className="size-3.5" /> إضافة مشرف
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-0 rounded-xl border-border/50 shadow-lg" align="end">
                                        <Command>
                                            <CommandInput placeholder="ابحث عن مشرف..." className="h-10" />
                                            <CommandList className="max-h-60">
                                                <CommandEmpty className="py-6 text-sm text-center text-muted-foreground">لا يوجد مشرفون</CommandEmpty>
                                                <CommandGroup>
                                                    {supervisors.map(s => (
                                                        <CommandItem
                                                            key={s.id}
                                                            value={s.name}
                                                            onSelect={() => toggleSupervisor(s.id)}
                                                            className="gap-3 py-2 cursor-pointer"
                                                        >
                                                            <div className={`size-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${selectedSupervisorIds.includes(s.id) ? "bg-violet-500 text-white shadow-sm" : "bg-muted"}`}>
                                                                <Users className="size-4" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold">{s.name}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* قائمة المشرفين المختارين */}
                            <div className="bg-background rounded-xl border border-border/50 overflow-hidden">
                                {selectedSupervisors.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 p-3 bg-muted/10">
                                        {selectedSupervisors.map(s => (
                                            <Badge
                                                key={s.id}
                                                variant="outline"
                                                className="gap-2 pr-2 py-1.5 rounded-lg font-medium bg-background border-border/50 shadow-sm"
                                            >
                                                <div className="size-5 rounded-md bg-violet-500/10 flex items-center justify-center">
                                                    <Users className="size-3 text-violet-600" />
                                                </div>
                                                {s.name}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSupervisor(s.id)}
                                                    className="ml-0.5 rounded-sm hover:bg-destructive hover:text-destructive-foreground transition-colors p-1"
                                                >
                                                    <X className="size-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                                        <Users className="size-6 text-muted-foreground/30" />
                                        <span>لم يتم اختيار مشرفين بعد. أضف مشرفاً لإدارة المجموعة.</span>
                                    </div>
                                )}
                            </div>
                            {errors.supervisorIds && (
                                <p className="text-xs text-destructive">{errors.supervisorIds.message}</p>
                            )}
                        </div>
                    </div>

                    {/* القسم الثالث: إعدادات إضافية */}
                    <div className="p-5 rounded-2xl border border-border/50 bg-card shadow-sm space-y-5">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <div className="size-6 rounded-md bg-muted flex items-center justify-center">
                                <Settings className="size-3.5 text-muted-foreground" />
                            </div>
                            <h3 className="font-bold text-sm">إعدادات إضافية</h3>
                        </div>

                        {/* ملاحظات */}
                        <div className="space-y-2">
                            <Label htmlFor="grp-notes" className="text-sm font-semibold">ملاحظات (اختياري)</Label>
                            <Textarea
                                id="grp-notes"
                                placeholder="ملاحظات داخلية عن المجموعة..."
                                className="rounded-xl resize-none min-h-[80px] text-sm bg-background"
                                {...register("notes")}
                            />
                        </div>

                    </div>

                    {/* زر الحفظ */}
                    <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl font-bold gap-2 text-base shadow-md">
                        {isLoading
                            ? <><Loader2 className="size-5 animate-spin" /> جاري الحفظ...</>
                            : <><Save className="size-5" /> {isEditing ? "حفظ التعديلات" : "إنشاء المجموعة"}</>
                        }
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    )
}
