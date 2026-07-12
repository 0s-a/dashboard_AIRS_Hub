---
name: nawaat-pricing
description: إدارة التسعير في Nawaat — PriceLabel، ProductPrice، تسعيرة العميل، check-price. استخدم عند تعديل أسعار المنتجات، مسميات التسعير، حساب سعر العميل، أو Bot check-price endpoint.
---

# Nawaat Pricing

## نموذج البيانات

```
PriceLabel (مسمى تسعير)
    ↓
ProductPrice (productId + priceLabelId + currencyId + unitId → value)
    ↓
Customer.priceLabelId (تسعيرة العميل الافتراضية)
```

- **ليس** tiers ثابتة (RETAIL/WHOLESALE/VIP) — النظام يستخدم PriceLabel مرن
- `ProductPrice` unique constraint: `(productId, priceLabelId, currencyId, unitId)`
- `CustomerCurrency`: عملات مخصصة لكل عميل

## الملفات الرئيسية

| الملف | الدور |
|-------|-------|
| `lib/actions/inventory/price.actions.ts` | CRUD أسعار المنتج، نسخ، auto-pricing |
| `lib/actions/price-labels.ts` | إدارة مسميات التسعير |
| `app/api/v1/bot/check-price/route.ts` | حساب السعر للبوت |
| `lib/order-utils.ts` | `resolveItemPrice()` للعرض |

## قواعد العمل

1. **إضافة سعر**: يتطلب `priceLabelId`, `currencyId`, `unitId`, `value >= 0`
2. **isAutoCalculated**: للأسعار المحسوبة تلقائياً من سعر أساسي
3. **نسخ الأسعار**: `copyProductPrices` في price.actions
4. **بعد أي تعديل سعر**: `upsertProductToMeilisearch(productId).catch(console.warn)`
5. **P2002**: رسالة "هذا التسعير (المسمى + العملة + الوحدة) موجود بالفعل"

## تدفق Bot check-price

```
phoneNumber → normalizePhonePatterns() → find customer
    → customer.priceLabelId → filter product.productPrices
    → return prices[] with label, value, currency, unit
```

إذا لم يُعثر على عميل: يُرجع كل أسعار المنتج.

## Snapshot في الطلبات

عند إنشاء طلب، احفظ في `OrderItem`:
- `unitPrice`, `currencyId`, `priceLabelId`

هذه القيم **لا تتغير** لاحقاً حتى لو تغيّرت أسعار المنتج.

## أمثلة

```typescript
// إضافة سعر
await addProductPrice(productId, {
  priceLabelId, currencyId, unitId, value: 100
})

// Bot check-price body
{ "phoneNumber": "+966501234567", "productId": "uuid" }
```
