"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Loader2, Plus } from "lucide-react"
import type { Color, ProductAttribute } from "@prisma/client"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductPicker, type ProductOption } from "@/components/items/product-picker"
import { ColorPicker } from "@/components/items/color-picker"
import { SkcAttributesForm } from "@/components/items/skc-attributes-form"
import { SizeLabelField, previewSkuCode } from "@/components/items/size-label-field"
import { createItem, updateItem } from "@/lib/actions/item"
import { getSKCsPaginated } from "@/lib/actions/skc"
import { getColors } from "@/lib/actions/colors"
import { getProductAttributes } from "@/lib/actions/product-attributes"
import { getProductById } from "@/lib/actions/inventory"
import type { SkcAttributes } from "@/lib/utils/skc-attributes"
import { INVENTORY_LABELS } from "@/lib/config/inventory-labels"
import {
    getSpecLabel,
    normalizeSkuSpecKind,
    type SkuSpecKind,
    DEFAULT_SKU_SPEC_KIND,
} from "@/lib/config/sku-spec.config"

const itemFormSchema = z.object({
    productId: z.string().min(1, "اختر المنتج"),
    colorId: z.string().min(1, "اختر اللون"),
    itemNumber: z.string().optional(),
    sizeLabel: z.string().optional(),
    attributes: z.record(z.string(), z.string()).optional(),
})

type ItemFormValues = z.infer<typeof itemFormSchema>

export type ItemFormProps = {
    mode: "create" | "edit"
    itemId?: string
    initialProduct?: ProductOption | null
    productLocked?: boolean
    initialColorId?: string
    initialItemNumber?: string
    initialSizeLabel?: string
    initialAttributes?: SkcAttributes
    excludeColorIdFromUsed?: string
    initialSkuSpecKind?: SkuSpecKind
    onSuccess?: (data: { id?: string }) => void
    submitLabel?: string
}

export function ItemForm({
    mode,
    itemId,
    initialProduct,
    productLocked = false,
    initialColorId = "",
    initialItemNumber = "",
    initialSizeLabel = "",
    initialAttributes = {},
    excludeColorIdFromUsed,
    initialSkuSpecKind = DEFAULT_SKU_SPEC_KIND,
    onSuccess,
    submitLabel,
}: ItemFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [product, setProduct] = useState<ProductOption | null>(initialProduct ?? null)
    const [skuSpecKind, setSkuSpecKind] = useState<SkuSpecKind>(
        normalizeSkuSpecKind(initialSkuSpecKind ?? initialProduct?.skuSpecKind)
    )
    const [selectedColor, setSelectedColor] = useState<Color | null>(null)
    const [colors, setColors] = useState<Color[]>([])
    const [attributeCatalog, setAttributeCatalog] = useState<ProductAttribute[]>([])
    const [usedColorIds, setUsedColorIds] = useState<Set<string>>(new Set())
    const [catalogLoading, setCatalogLoading] = useState(true)

    const form = useForm<ItemFormValues>({
        resolver: zodResolver(itemFormSchema),
        defaultValues: {
            productId: initialProduct?.id ?? "",
            colorId: initialColorId,
            itemNumber: initialItemNumber,
            sizeLabel: initialSizeLabel,
            attributes: initialAttributes,
        },
    })

    const productId = form.watch("productId")
    const sizeLabel = form.watch("sizeLabel") ?? ""
    const attributes = form.watch("attributes") ?? {}

    useEffect(() => {
        let cancelled = false
        setCatalogLoading(true)
        void Promise.all([getColors(true), getProductAttributes()]).then(([colorsRes, attrsRes]) => {
            if (cancelled) return
            if (colorsRes.success && colorsRes.data) {
                setColors(colorsRes.data)
                const match = colorsRes.data.find(c => c.id === initialColorId)
                if (match) setSelectedColor(match)
            }
            if (attrsRes.success && attrsRes.data) setAttributeCatalog(attrsRes.data)
            setCatalogLoading(false)
        })
        return () => { cancelled = true }
    }, [initialColorId])

    useEffect(() => {
        if (!productLocked || !initialProduct?.id) return
        if (initialProduct.productNumber !== undefined) return
        void getProductById(initialProduct.id).then(res => {
            if (res.success && res.data) {
                const loaded: ProductOption = {
                    id: res.data.id,
                    name: res.data.name,
                    productNumber: res.data.productNumber ?? null,
                    skuSpecKind: res.data.skuSpecKind,
                }
                setProduct(loaded)
                setSkuSpecKind(normalizeSkuSpecKind(res.data.skuSpecKind))
                form.setValue("productId", loaded.id)
            }
        })
    }, [productLocked, initialProduct, form])

    useEffect(() => {
        if (!productId) {
            setUsedColorIds(new Set())
            return
        }
        void getSKCsPaginated({ productId, limit: 100 }).then(res => {
            if (res.success && res.data) {
                const ids = new Set(res.data.map(row => row.colorId))
                if (excludeColorIdFromUsed) ids.delete(excludeColorIdFromUsed)
                setUsedColorIds(ids)
            }
        })
    }, [productId, excludeColorIdFromUsed])

    function handleProductChange(next: ProductOption | null) {
        setProduct(next)
        setSkuSpecKind(normalizeSkuSpecKind(next?.skuSpecKind))
        form.setValue("productId", next?.id ?? "", { shouldValidate: true })
        form.setValue("colorId", "", { shouldValidate: true })
        setSelectedColor(null)
    }

    function handleColorChange(next: Color | null) {
        setSelectedColor(next)
        form.setValue("colorId", next?.id ?? "", { shouldValidate: true })
    }

    function onSubmit(values: ItemFormValues) {
        if (!product?.productNumber) {
            toast.error("المنتج بلا رقم منتج — عيّن رقم المنتج أولاً")
            return
        }

        const attrs = values.attributes && Object.keys(values.attributes).length > 0
            ? values.attributes
            : null

        startTransition(async () => {
            if (mode === "create") {
                const res = await createItem({
                    productId: values.productId,
                    colorId: values.colorId,
                    itemNumber: values.itemNumber?.trim() || null,
                    sizeLabel: values.sizeLabel?.trim() || null,
                    attributes: attrs,
                })
                if (res.success) {
                    toast.success("تم إضافة الصنف")
                    onSuccess?.({ id: res.data.id })
                    router.refresh()
                } else {
                    toast.error(res.error || "فشل إضافة الصنف")
                }
            } else if (itemId) {
                const res = await updateItem(itemId, {
                    colorId: values.colorId,
                    itemNumber: values.itemNumber?.trim() || null,
                    sizeLabel: values.sizeLabel?.trim() || null,
                    attributes: attrs,
                })
                if (res.success) {
                    toast.success("تم تحديث الصنف")
                    onSuccess?.({ id: itemId })
                    router.refresh()
                } else {
                    toast.error(res.error || "فشل التحديث")
                }
            }
        })
    }

    const codePreview = product?.productNumber && selectedColor
        ? previewSkuCode(product.productNumber, selectedColor.code, sizeLabel)
        : null

    const defaultSubmitLabel = mode === "create" ? "إنشاء الصنف" : "حفظ التعديلات"

    if (catalogLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {mode === "create" && (
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">{INVENTORY_LABELS.product}</CardTitle>
                            <CardDescription>اختر المنتج الأساسي</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="productId"
                                render={() => (
                                    <FormItem>
                                        <FormLabel>{INVENTORY_LABELS.product}</FormLabel>
                                        <FormControl>
                                            <ProductPicker
                                                value={product}
                                                onChange={handleProductChange}
                                                disabled={productLocked || isPending}
                                                fetchOnMount={!productLocked}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                )}

                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">{INVENTORY_LABELS.color}</CardTitle>
                        <CardDescription>
                            {mode === "create"
                                ? `كل ${INVENTORY_LABELS.item} جديد = ${INVENTORY_LABELS.product} + ${INVENTORY_LABELS.color}. الألوان المستخدمة معطّلة.`
                                : "تغيير اللون يؤثر على كل مقاسات هذا اللون"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="colorId"
                            render={() => (
                                <FormItem>
                                    <FormLabel>{INVENTORY_LABELS.color}</FormLabel>
                                    <FormControl>
                                        <ColorPicker
                                            colors={colors}
                                            value={selectedColor}
                                            onChange={handleColorChange}
                                            usedColorIds={usedColorIds}
                                            disabled={(!productId && mode === "create") || isPending}
                                        />
                                    </FormControl>
                                    {!productId && mode === "create" && (
                                        <FormDescription>اختر المنتج أولاً</FormDescription>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">{getSpecLabel(skuSpecKind)}</CardTitle>
                        <CardDescription>
                            اختياري — اتركه فارغاً لـ «{INVENTORY_LABELS.uniformSize}»
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="sizeLabel"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{getSpecLabel(skuSpecKind)}</FormLabel>
                                    <FormControl>
                                        <SizeLabelField
                                            id="item-size-label"
                                            value={field.value ?? ""}
                                            onChange={field.onChange}
                                            disabled={isPending}
                                            specKind={skuSpecKind}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                {codePreview && (
                    <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-sm">
                        <p className="text-muted-foreground mb-1">معاينة {INVENTORY_LABELS.itemCode}</p>
                        <p className="font-mono font-semibold text-foreground" dir="ltr">{codePreview}</p>
                    </div>
                )}

                {product && !product.productNumber && (
                    <p className="text-sm text-destructive">
                        هذا المنتج بلا رقم منتج — لن يُنشأ كود صالح حتى تعيين الرقم من صفحة المنتجات.
                    </p>
                )}

                <FormField
                    control={form.control}
                    name="itemNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{INVENTORY_LABELS.itemNumber} (اختياري)</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="رقم داخلي اختياري..."
                                    disabled={isPending}
                                    {...field}
                                />
                            </FormControl>
                            <FormDescription>{`لا يؤثر على ${INVENTORY_LABELS.itemCode} — للمرجع الداخلي فقط`}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <SkcAttributesForm
                    catalog={attributeCatalog}
                    value={attributes}
                    onChange={next => form.setValue("attributes", next)}
                    disabled={isPending}
                />

                <Button type="submit" disabled={isPending} className="w-full gap-2">
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : mode === "create" ? (
                        <Plus className="h-4 w-4" />
                    ) : null}
                    {submitLabel ?? defaultSubmitLabel}
                </Button>
            </form>
        </Form>
    )
}
