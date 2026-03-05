"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Package as PackageIcon, Box } from "lucide-react"
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

export function RecentProducts({ products }: RecentProductsProps) {
    if (!products || products.length === 0) {
        return (
            <Card className="col-span-3 border-border/50 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PackageIcon className="h-5 w-5 text-primary" />
                        أحدث المنتجات
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        لا توجد منتجات حتى الآن
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-3 border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <PackageIcon className="h-5 w-5 text-primary" />
                        أحدث المنتجات
                    </CardTitle>
                    <Link
                        href="/inventory"
                        className="text-sm text-primary hover:underline font-medium"
                    >
                        عرض الكل ←
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="group flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 hover:border-primary/30 transition-all duration-200"
                        >
                            <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-background border border-border/50">
                                {(() => {
                                    const imgs = product.mediaImages
                                    const src = imgs?.find(i => i.isPrimary)?.url ?? imgs?.[0]?.url
                                    return src ? (
                                        <Image
                                            src={src}
                                            alt={product.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full w-full">
                                            <PackageIcon className="h-5 w-5 text-muted-foreground/40" />
                                        </div>
                                    )
                                })()}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                        {product.name}
                                    </p>
                                    {product.isAvailable && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                                            متوفر
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="text-left flex flex-col items-end gap-1">
                                {product.productPrices && product.productPrices.length > 0 ? (
                                    <div className="flex flex-col items-end">
                                        <p className="font-mono font-bold text-sm text-primary">
                                            {product.productPrices[0].value.toFixed(2)} {product.productPrices[0].currencySymbol}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">{product.productPrices[0].priceLabelName || 'سعر'}</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic mt-1">لا يوجد سعر</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
