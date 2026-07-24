---
name: nawaat-pricing
description: إدارة التسعير في Nawaat — PriceLabel، ItemPrice، تسعيرة العميل، Bot item price. استخدم عند تعديل أسعار الأصناف، مسميات التسعير، حساب سعر العميل، أو GET /api/v1/bot/items/price.
---

# Nawaat Pricing

## نموذج البيانات

```
PriceLabel (مسمى تسعير)
    ↓
ItemPrice (itemId + priceLabelId + unitId → value بالعملة الافتراضية)
    ↓
Customer.priceLabelId + CustomerCurrency (تفضيل عرض)
    ↓
convertFromDefault(value, currency) عبر exchangeRate
```

- **ليس** tiers ثابتة — النظام يستخدم PriceLabel مرن
- `ItemPrice` unique: `(itemId, priceLabelId, unitId)` — دائماً بالعملة الافتراضية
- عملات أخرى تُحسب لحظياً: `value / exchangeRate` (`lib/currency-utils.ts`)

## الملفات الرئيسية

| الملف | الدور |
|-------|---------|
| `lib/actions/items/price.actions.ts` | CRUD أسعار الصنف |
| `lib/actions/price-labels.ts` | إدارة مسميات التسعير |
| `lib/currency-utils.ts` | `convertFromDefault` / `roundMoney` |
| `lib/orders/snapshot.ts` | تثبيت السعر في OrderItem |
| `app/api/v1/bot/items/price/route.ts` | حساب السعر للبوت |
| `lib/bot/item-price.ts` | منطق سعر البوت |
| `lib/bot/resolve-item.ts` | حل الصنف بـ itemId أو itemNumber |
| `lib/order-utils.ts` | `resolveItemPrice()` للعرض |

## قواعد العمل

1. **إضافة سعر**: يتطلب `priceLabelId`, `unitId`, `value >= 0`
2. **isAutoCalculated**: للأسعار المحسوبة من وحدة أساسية
3. **بعد أي تعديل سعر**: لا مزامنة Meili
4. **Snapshot الطلب**: يثبّت `unitPrice` + `currencyId` + `priceLabelId` على `OrderItem` عبر `itemId`

## تدفق Bot item price

```
itemId | itemNumber → resolve Item (SKU)
    → optional customerId → PriceLabel + CustomerCurrency
    → filter by priceLabelId → convertFromDefault → prices[]
```

استجابة: `{ itemId, itemNumber, name, customerId, prices }`
