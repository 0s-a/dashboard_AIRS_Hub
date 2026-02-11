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
import { createCustomer, updateCustomer } from "@/lib/actions/crm"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Customer } from "@prisma/client"

const formSchema = z.object({
    name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
    phoneNumber: z.string().min(8, "رقم الهاتف غير صحيح"),
})

type FormValues = z.infer<typeof formSchema>

interface CustomerFormProps {
    customer?: Customer
    onSuccess?: () => void
}

export function CustomerForm({ customer, onSuccess }: CustomerFormProps) {
    const router = useRouter()

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: customer?.name || "",
            phoneNumber: customer?.phoneNumber || "",
        },
    })

    async function onSubmit(values: FormValues) {
        try {
            let res;
            if (customer) {
                res = await updateCustomer(customer.phoneNumber, { name: values.name })
            } else {
                res = await createCustomer(values)
            }

            if (res.success) {
                toast.success(customer ? "تم تحديث العميل" : "تم إضافة العميل")
                if (onSuccess) onSuccess()
                router.refresh()
            } else {
                toast.error("حدث خطأ ما")
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
                            <FormLabel>الاسم الكامل</FormLabel>
                            <FormControl>
                                <Input placeholder="مثال: محمد أحمد" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>رقم الهاتف</FormLabel>
                            <FormControl>
                                <Input placeholder="+966..." {...field} disabled={!!customer} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full">
                    {customer ? "حفظ التعديلات" : "إضافة عميل جديد"}
                </Button>
            </form>
        </Form>
    )
}
