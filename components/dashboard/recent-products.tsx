"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Package as PackageIcon, ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"

interface Product {
    id: string
    name: string
    productPrices: Array<{ priceLabelName: string; value: number; currencySymbol: string }>
    mediaImages: Array<{ url: string; isPrimary: boolean }> | null
    isAvailable: boolean
    unit: string
    packaging?: string | null
    createdAt: Date
}

interface RecentProductsProps {
    products: Product[]
}

function timeAgo(date: Date | string) {
    const now = new Date()
    const d = new Date(date)
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
    if (diff < 60) return "الآن"
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`
    return `منذ ${Math.floor(diff / 86400)} ي`
}

export function RecentProducts({ products }: RecentProductsProps) {
    if (!products || products.length === 0) {
        return (
            <Card className="col-span-3 border border-border/40 bg-card/80 backdrop-blur-sm shadow-lg rounded-2xl overflow-hidden">
                <div className="h-1 w-full bg-linear-to-r from-indigo-500 to-purple-500" />
                <CardHeader>
                    <CardTitle className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/8">
                            <PackageIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        أحدث المنتجات
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <PackageIcon className="size-10 text-muted-foreground/20" />
                        <span className="text-sm font-medium">لا توجد منتجات حتى الآن</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-3 border border-border/40 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500 rounded-2xl overflow-hidden">
            {/* Accent bar */}
            <div className="h-1 w-full bg-linear-to-r from-indigo-500 to-purple-500" />

            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/8">
                            <PackageIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-base font-bold">أحدث المنتجات</span>
                    </CardTitle>
                    <Link
                        href="/inventory"
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-bold group transition-colors"
                    >
                        عرض الكل
                        <ArrowLeft className="size-3.5 group-hover:-translate-x-1 transition-transform duration-300" />
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {products.map((product, index) => (
                        <div
                            key={product.id}
                            className="group flex items-center gap-4 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 border border-transparent hover:border-primary/15 transition-all duration-300"
                        >
                            {/* Number */}
                            <span className="text-[10px] font-black text-muted-foreground/40 w-4 text-center tabular-nums">
                                {index + 1}
                            </span>

                            {/* Image */}
                            <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-background border border-border/50 shadow-sm">
                                {(() => {
                                    const imgs = product.mediaImages
                                    const src = imgs?.find(i => i.isPrimary)?.url ?? imgs?.[0]?.url
                                    return src ? (
                                        <Image
                                            src={src}
                                            alt={product.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full w-full bg-muted/30">
                                            <PackageIcon className="h-5 w-5 text-muted-foreground/30" />
                                        </div>
                                    )
                                })()}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-bold text-sm truncate group-hover:text-primary transition-colors duration-300">
                                        {product.name}
                                    </p>
                                    {product.isAvailable && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-[18px] bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-bold">
                                            متوفر
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
                                    <Clock className="size-3" />
                                    <span className="font-medium">{timeAgo(product.createdAt)}</span>
                                </div>
                            </div>

                            {/* Price */}
                            <div className="text-left flex flex-col items-end gap-0.5">
                                {product.productPrices && product.productPrices.length > 0 ? (
                                    <div className="flex flex-col items-end">
                                        <p className="font-mono font-black text-sm text-primary tabular-nums">
                                            {product.productPrices[0].value.toFixed(2)} {product.productPrices[0].currencySymbol}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground/50 font-bold">{product.productPrices[0].priceLabelName || 'سعر'}</p>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground/40 italic font-medium">بدون سعر</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
