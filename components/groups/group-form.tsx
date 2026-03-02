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
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Group } from "@prisma/client"
import { useState } from "react"
import { toast } from "sonner"
import { createGroup, updateGroup } from "@/lib/actions/groups"
import { Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

import { Switch } from "@/components/ui/switch"

const formSchema = z.object({
    name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
    number: z.string().min(1, "رقم المجموعة مطلوب"),
    tags: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    category: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface GroupFormProps {
    group?: Group
    onSuccess?: () => void
}

export function GroupForm({ group, onSuccess }: GroupFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [tagInput, setTagInput] = useState("")

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: group?.name || "",
            number: group?.number || "",
            tags: (group?.tags as string[]) || [], // Tags stored as JSON array
            isActive: group?.isActive ?? true,
            category: group?.category || "",
        },
    })

    const tags = form.watch("tags") || []

    const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            const value = tagInput.trim()
            if (value && !tags.includes(value)) {
                form.setValue("tags", [...tags, value])
            }
            setTagInput("")
        }
    }

    const removeTag = (tagToRemove: string) => {
        form.setValue("tags", tags.filter(tag => tag !== tagToRemove))
    }

    async function onSubmit(values: FormValues) {
        setIsLoading(true)

        try {
            let result
            if (group) {
                result = await updateGroup(group.id, values)
            } else {
                result = await createGroup(values)
            }

            if (result.success) {
                toast.success(group ? 'تم تحديث المجموعة' : 'تمت إضافة المجموعة')
                form.reset()
                onSuccess?.()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error('حدث خطأ غير متوقع')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground tracking-wider">رقم المجموعة</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="مثال: G-100"
                                        className="h-11 bg-muted/30 focus-visible:bg-transparent transition-colors text-lg! font-mono"
                                        dir="ltr"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground tracking-wider">اسم المجموعة</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="مثال: كبار الشخصيات"
                                        className="h-11 bg-muted/30 focus-visible:bg-transparent transition-colors"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground tracking-wider">التصنيف</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="مثال: ذهبي، جملة..."
                                        className="h-11 bg-muted/30 focus-visible:bg-transparent transition-colors"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 p-4 bg-muted/20">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">حالة المجموعة</FormLabel>
                                <FormDescription>
                                    تحديد ما إذا كانت المجموعة مفعلة أم معطلة حالياً.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {/* Tags Field */}
                <FormField
                    control={form.control}
                    name="tags"
                    render={() => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                                وسوم المجموعة
                            </FormLabel>
                            <FormControl>
                                <div className="space-y-3">
                                    <Input
                                        placeholder="اكتب الوسم واضغط Enter..."
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={addTag}
                                        className="h-11 bg-muted/30 focus-visible:bg-transparent transition-colors"
                                    />
                                    {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-3 bg-muted/20 border border-border/50 rounded-xl min-h-[50px]">
                                            {tags.map((tag, index) => (
                                                <Badge
                                                    key={index}
                                                    variant="secondary"
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                                >
                                                    {tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTag(tag)}
                                                        className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                            <FormDescription className="text-[10px]">
                                أضف وسوماً لتصنيف المجموعة بفعالية (مثال: ذهبي، جملة...). اضغط Enter للإضافة.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button
                    type="submit"
                    className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
                    disabled={isLoading}
                >
                    {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {group ? "حفظ التغييرات" : "إضافة المجموعة"}
                </Button>
            </form>
        </Form>
    )
}
