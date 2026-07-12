import { notFound } from "next/navigation"
import { getOrderById } from "@/lib/actions/orders"
import { getDefaultCurrency } from "@/lib/actions/currencies"
import { getStoreSettings } from "@/lib/actions/store-settings"
import { resolveItemPrice, calcOrderTotal } from "@/lib/order-utils"
import { InvoicePrintActions } from "@/components/orders/invoice-print-actions"
import Image from "next/image"

interface Props {
    params: Promise<{ id: string }>
}

export default async function InvoicePage({ params }: Props) {
    const { id } = await params
    
    // جلب البيانات اللازمة للفاتورة
    const [orderRes, defaultCurrencyRes, storeSettingsRes] = await Promise.all([
        getOrderById(id),
        getDefaultCurrency(),
        getStoreSettings()
    ])

    if (!orderRes.success || !orderRes.data) return notFound()

    const order = JSON.parse(JSON.stringify(orderRes.data)) as any
    const defaultSymbol = defaultCurrencyRes.success ? (defaultCurrencyRes.data?.symbol ?? "") : ""
    const customerPLId = order.customer?.priceLabelId ?? null
    const totalAmount = calcOrderTotal(order.items ?? [], customerPLId)
    const currencySymbol = defaultSymbol
    
    const storeName = storeSettingsRes.success && storeSettingsRes.data ? storeSettingsRes.data.name : "نواة"
    const storeLogo = storeSettingsRes.success && storeSettingsRes.data ? storeSettingsRes.data.logo : null

    return (
        <div className="min-h-screen bg-gray-100 py-8 print:p-0 print:bg-white flex flex-col items-center">
            {/* أزرار الطباعة والإغلاق (مخفية عند الطباعة) */}
            <InvoicePrintActions />

            {/* ورقة الفاتورة - إيصال حراري (80mm) */}
            <div className="w-full max-w-[300px] bg-white text-black p-4 shadow-lg print:shadow-none print:p-2 print:max-w-[80mm] mx-auto text-center font-mono">
                
                {/* ── الترويسة ── */}
                <div className="flex flex-col items-center gap-2 mb-4">
                    {storeLogo ? (
                        <Image src={storeLogo} alt={storeName} width={80} height={40} className="object-contain" unoptimized />
                    ) : (
                        <h1 className="text-xl font-black tracking-tighter">{storeName}</h1>
                    )}
                    <span className="text-[10px] text-gray-500 border-b border-dashed border-gray-400 pb-2 w-full">فاتورة مبيعات / RECEIPT</span>
                </div>
                
                <div className="text-xs text-left w-full space-y-1 mb-4 border-b border-dashed border-gray-400 pb-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">رقم الطلب:</span>
                        <span className="font-bold">#{order.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">التاريخ:</span>
                        <span>{new Date(order.createdAt).toLocaleDateString("ar-SA")}</span>
                    </div>
                    {order.customer?.name && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">العميل:</span>
                            <span className="font-bold truncate max-w-[120px]">{order.customer.name}</span>
                        </div>
                    )}
                </div>

                {/* ── المنتجات ── */}
                <div className="w-full mb-4">
                    <div className="flex justify-between text-[10px] font-bold border-b border-gray-800 pb-1 mb-2">
                        <span className="text-right">الصنف</span>
                        <span className="text-left">الإجمالي</span>
                    </div>
                    
                    <div className="space-y-3">
                        {(order.items ?? []).map((item: any, i: number) => {
                            const { price, symbol, priceLabelName } = resolveItemPrice(item, customerPLId)
                            const lineTotal = price * (item.quantity ?? 0)
                            const sym = symbol || defaultSymbol
                            
                            return (
                                <div key={i} className="text-xs text-right flex flex-col gap-0.5">
                                    <div className="font-bold leading-tight">
                                        {item.product?.name ?? "—"}
                                    </div>
                                    <div className="flex justify-between text-[11px] text-gray-700">
                                        <span>
                                            {item.quantity} × {price.toLocaleString("ar-YE")} {sym}
                                        </span>
                                        <span className="font-bold text-black">
                                            {lineTotal.toLocaleString("ar-YE")} {sym}
                                        </span>
                                    </div>
                                    {(item.sku || item.unit || priceLabelName) && (
                                        <div className="text-[9px] text-gray-500 flex gap-1">
                                            {item.sku && (
                                                <span>
                                                    ({[item.sku.skc?.color?.name, item.sku.sizeLabel].filter(Boolean).join(' / ') || item.sku.skuCode})
                                                </span>
                                            )}
                                            {item.unit && <span>[{item.unit.name}]</span>}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* ── الإجماليات ── */}
                <div className="w-full border-t border-dashed border-gray-400 pt-2 mb-6">
                    <div className="flex justify-between text-sm font-bold mt-2">
                        <span>الإجمالي:</span>
                        <span>{totalAmount.toLocaleString("ar-YE")} {currencySymbol}</span>
                    </div>
                </div>

                {/* ── التذييل (Footer) ── */}
                <div className="w-full text-center space-y-1">
                    <p className="text-xs font-bold">شكراً لزيارتكم!</p>
                    <p className="text-[9px] text-gray-500">نظام نواة للمبيعات</p>
                </div>
                
            </div>
        </div>
    )
}
