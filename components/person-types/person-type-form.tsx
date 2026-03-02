"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createPersonType, updatePersonType } from "@/lib/actions/person-types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PersonType {
    id: string
    name: string
    description: string | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
}

const formSchema = z.object({
    name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
    description: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
})

interface PersonTypeFormProps {
    personType?: PersonType
    onSuccess?: () => void
}

export function PersonTypeForm({ personType, onSuccess }: PersonTypeFormProps) {
    const router = useRouter()

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: personType?.name || "",
            description: personType?.description || "",
            notes: personType?.notes || "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            let res
            if (personType) {
                res = await updatePersonType(personType.id, values)
            } else {
                res = await createPersonType(values)
            }

            if (res.success) {
                toast.success(personType ? "تم تحديث النوع" : "تم إنشاء النوع")
                if (onSuccess) onSuccess()
                router.refresh()
            } else {
                toast.error(res.error || "حدث خطأ ما")
            }
        } catch (error) {
            toast.error("خطأ في الإرسال")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>اسم النوع *</FormLabel>
                            <FormControl>
                                <Input placeholder="مثال: تاجر، VIP..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الوصف</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="وصف لهذا النوع..."
                                    {...field}
                                    value={field.value || ""}
                                    className="resize-none"
                                    rows={2}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>ملاحظات</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="ملاحظات إضافية..."
                                    {...field}
                                    value={field.value || ""}
                                    className="resize-none"
                                    rows={2}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full">
                    {personType ? "حفظ التعديلات" : "إضافة نوع جديد"}
                </Button>
            </form>
        </Form>
    )
}
