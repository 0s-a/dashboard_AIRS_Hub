---
name: nawaat-pricing
description: إدارة التسعير في Nawaat — PriceLabel، ProductPrice، تسعيرة العميل، Bot product price. استخدم عند تعديل أسعار المنتجات، مسميات التسعير، حساب سعر العميل، أو GET /api/v1/bot/products/price.
---

# Nawaat Pricing

## نموذج البيانات

```
PriceLabel (مسمى تسعير)
    ↓
ProductPrice (productId + priceLabelId + unitId → value بالعملة الافتراضية)
    ↓
Customer.priceLabelId + CustomerCurrency (تفضيل عرض)
    ↓
convertFromDefault(value, currency) عبر exchangeRate
```

- **ليس** tiers ثابتة (RETAIL/WHOLESALE/VIP) — النظام يستخدم PriceLabel مرن
- `ProductPrice` unique: `(productId, priceLabelId, unitId)` — دائماً بالعملة الافتراضية
- عملات أخرى تُحسب لحظياً: `value / exchangeRate` (`lib/currency-utils.ts`)
- `CustomerCurrency`: تفضيل عرض للعميل/البوت، ليس صف سعر مخزّن

## الملفات الرئيسية

| الملف | الدور |
|-------|---------|
| `lib/actions/inventory/price.actions.ts` | CRUD أسعار المنتج، نسخ، auto-pricing |
| `lib/actions/price-labels.ts` | إدارة مسميات التسعير |
| `lib/currency-utils.ts` | `convertFromDefault` / `roundMoney` |
| `lib/orders/snapshot.ts` | تثبيت السعر المحوّل في OrderItem |
| `app/api/v1/bot/products/price/route.ts` | حساب السعر للبوت |
| `lib/bot/product-price.ts` | منطق سعر البوت |
| `lib/order-utils.ts` | `resolveItemPrice()` للعرض |

## قواعد العمل

1. **إضافة سعر**: يتطلب `priceLabelId`, `unitId`, `value >= 0` (بدون currencyId)
2. **isAutoCalculated**: للأسعار المحسوبة تلقائياً من وحدة أساسية
3. **نسخ الأسعار**: `copyPriceLabelPrices`
4. **بعد أي تعديل سعر**: `revalidateProductPricing` فقط — لا مزامنة Meili (المستند بلا سعر)
5. **P2002**: رسالة "هذا التسعير (المسمى + الوحدة) موجود بالفعل"
6. **Snapshot الطلب**: يحوّل لعملة العميل (أول CustomerCurrency أو الافتراضية) ويثبّت `unitPrice` + `currencyId`

## تدفق Bot product price

```
productId | itemNumber → resolve product
    → optional customerId → PriceLabel + CustomerCurrency
    → optional currency code → target currency only
    → filter by priceLabelId (أو default label)
    → convertFromDefault → prices[]
```

## Snapshot في الطلبات

عند إنشاء طلب، احفظ في `OrderItem`:
- `unitPrice`, `currencyId`, `priceLabelId`

هذه القيم **لا تتغير** لاحقاً حتى لو تغيّرت أسعار المنتج أو أسعار الصرف.

## أمثلة

```typescript
await addProductPrice(productId, {
  priceLabelId, unitId, value: 100
})

await addProductPricesForAllUnits(productId, {
  priceLabelId, basePriceValue: 100
})

// Bot GET /api/v1/bot/products/price
// ?itemNumber=ABC-1&customerId=uuid&currency=USD
```
