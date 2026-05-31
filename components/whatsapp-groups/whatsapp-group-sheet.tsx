"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
    Loader2, Save, MessageSquare, X, Users, User, Plus,
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
import { createWhatsappGroup, updateWhatsappGroup } from "@/lib/actions/whatsapp-groups"
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

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="pb-4 border-b border-border/50">
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
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-5 px-1">

                    {/* اسم المجموعة */}
                    <div className="space-y-2">
                        <Label htmlFor="grp-name" className="text-sm font-semibold">
                            اسم المجموعة <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="grp-name"
                            placeholder="مثال: مجموعة أحمد محمد"
                            className="h-10 rounded-xl"
                            {...register("name")}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>

                    {/* رقم المجموعة */}
                    <div className="space-y-2">
                        <Label htmlFor="grp-number" className="text-sm font-semibold">
                            رقم المجموعة
                            <span className="text-muted-foreground text-xs font-normal mr-2">(اختياري)</span>
                        </Label>
                        <Input
                            id="grp-number"
                            placeholder="120363...@g.us"
                            className="h-10 rounded-xl font-mono text-sm"
                            dir="ltr"
                            {...register("groupNumber")}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            المعرّف الفريد للمجموعة على واتساب — يُستخدم للتكامل مع البوت
                        </p>
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
                                    className={`w-full h-10 rounded-xl justify-between font-normal ${!selectedCustomer ? "text-muted-foreground" : ""}`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <User className="size-4 text-muted-foreground shrink-0" />
                                        <span className="truncate">
                                            {selectedCustomer?.name ?? "اختر عميلاً..."}
                                        </span>
                                    </div>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 rounded-xl" align="start">
                                <Command>
                                    <CommandInput placeholder="ابحث عن عميل..." />
                                    <CommandList>
                                        <CommandEmpty>لا يوجد عملاء</CommandEmpty>
                                        <CommandGroup>
                                            {customers.map(c => (
                                                <CommandItem
                                                    key={c.id}
                                                    value={c.name ?? c.id}
                                                    onSelect={() => selectCustomer(c.id)}
                                                    className="gap-2"
                                                >
                                                    <div className={`size-5 rounded-md flex items-center justify-center shrink-0 ${selectedCustomerId === c.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                                        <User className="size-3" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-medium truncate">{c.name ?? "—"}</span>
                                                        {c.contacts.find(x => x.type === "phone") && (
                                                            <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">
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
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">
                                المشرفون <span className="text-destructive">*</span>
                            </Label>
                            <Popover open={supervisorOpen} onOpenChange={setSupervisorOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" type="button" className="h-7 gap-1 text-xs rounded-lg">
                                        <Plus className="size-3" /> إضافة مشرف
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 p-0 rounded-xl" align="end">
                                    <Command>
                                        <CommandInput placeholder="ابحث عن مشرف..." />
                                        <CommandList>
                                            <CommandEmpty>لا يوجد مشرفون</CommandEmpty>
                                            <CommandGroup>
                                                {supervisors.map(s => (
                                                    <CommandItem
                                                        key={s.id}
                                                        value={s.name}
                                                        onSelect={() => toggleSupervisor(s.id)}
                                                        className="gap-2"
                                                    >
                                                        <div className={`size-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${selectedSupervisorIds.includes(s.id) ? "bg-violet-500 text-white" : "bg-muted"}`}>
                                                            <Users className="size-3" />
                                                        </div>
                                                        <span className="text-sm">{s.name}</span>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* قائمة المشرفين المختارين */}
                        {selectedSupervisors.length > 0 ? (
                            <div className="flex flex-wrap gap-2 p-3 rounded-xl border bg-muted/30">
                                {selectedSupervisors.map(s => (
                                    <Badge
                                        key={s.id}
                                        variant="secondary"
                                        className="gap-1.5 pr-1 rounded-lg font-medium"
                                    >
                                        <Users className="size-3 text-violet-600" />
                                        {s.name}
                                        <button
                                            type="button"
                                            onClick={() => removeSupervisor(s.id)}
                                            className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                                        >
                                            <X className="size-2.5" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl border border-dashed bg-muted/20 text-center text-xs text-muted-foreground">
                                لم يتم اختيار مشرفين بعد
                            </div>
                        )}
                        {errors.supervisorIds && (
                            <p className="text-xs text-destructive">{errors.supervisorIds.message}</p>
                        )}
                    </div>

                    {/* ملاحظات */}
                    <div className="space-y-2">
                        <Label htmlFor="grp-notes" className="text-sm font-semibold">ملاحظات</Label>
                        <Textarea
                            id="grp-notes"
                            placeholder="ملاحظات داخلية عن المجموعة..."
                            className="rounded-xl resize-none min-h-[80px] text-sm"
                            {...register("notes")}
                        />
                    </div>

                    {/* الحالة */}
                    <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
                        <div>
                            <p className="text-sm font-semibold">حالة المجموعة</p>
                            <p className="text-xs text-muted-foreground">
                                {isActive ? "المجموعة نشطة وتظهر في النظام" : "المجموعة معطّلة"}
                            </p>
                        </div>
                        <Switch
                            checked={isActive ?? true}
                            onCheckedChange={v => setValue("isActive", v)}
                        />
                    </div>

                    {/* زر الحفظ */}
                    <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl font-bold gap-2">
                        {isLoading
                            ? <><Loader2 className="size-4 animate-spin" /> جاري الحفظ...</>
                            : <><Save className="size-4" /> {isEditing ? "حفظ التعديلات" : "إنشاء المجموعة"}</>
                        }
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    )
}
