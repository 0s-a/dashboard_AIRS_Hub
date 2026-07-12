---
name: nawaat-orders
description: إدارة الطلبات في Nawaat — إنشاء، تعديل، حالات، snapshot السعر، فواتير. استخدم عند العمل على orders، OrderItem، فواتير، أو Bot orders API.
---

# Nawaat Orders

## حالات الطلب

من `lib/order-constants.ts`:

```
pending → confirmed → processing → shipped → delivered
                                              ↘ cancelled
```

- التحقق: `validateOrderStatus(status)` أو `VALID_ORDER_STATUSES`
- UI labels في `ORDER_STATUS_CONFIG`

## Snapshot السعر (مهم)

عند إنشاء/تحديث طلب، احفظ في كل `OrderItem`:

```typescript
{
  productId, variantId?, unitId?, quantity,
  unitPrice,      // snapshot — لا يتغير
  currencyId,     // snapshot
  priceLabelId,   // snapshot
}
```

**عرض السعر**: `resolveItemPrice()` في `lib/order-utils.ts`

1. `unitPrice` snapshot — الأولوية القصوى
2. تسعيرة العميل من ProductPrice (للطلبات القديمة)
3. التسعيرة الافتراضية (isDefault)
4. أي سعر بالعملة الافتراضية

## الملفات الرئيسية

| الملف | الدور |
|-------|-------|
| `lib/orders/service.ts` | منطق الأعمال — Bot Orders API |
| `lib/actions/orders.ts` | Server Actions للوحة التحكم |
| `lib/order-utils.ts` | resolveItemPrice, حساب الإجمالي |
| `lib/order-constants.ts` | حالات الطلب |
| `app/api/v1/bot/orders/` | Bot Orders API — مساران ثابتان |
| `app/invoice/[id]/page.tsx` | فاتورة قابلة للطباعة |

## قواعد العمل

1. **createOrder**: يولّد `orderNumber` عبر `generateItemNumber('order')` داخل transaction
2. **updateOrder (dashboard)**: يرفض `items.length === 0`
3. **deliveryInfo**: نص حر (عنوان، كوريير، ملاحظات)
4. **Includes**: استخدم `ORDER_INCLUDE` من `lib/prisma-includes.ts`
5. **تعديل البنود (Bot API)**: مسموح على `pending` فقط → `409 ORDER_NOT_MUTABLE`

## Bot Orders API — query parameters

مصدر HTTP — مساران ثابتان + `x-api-key` + `lib/orders/service.ts`

### `/api/v1/bot/orders`

| Method | Query | Body | الوظيفة |
|--------|-------|------|---------|
| GET | (فلاتر list) | — | قائمة |
| GET | `?id=uuid` | — | تفاصيل |
| GET | `?pending=true&phone=` | — | آخر طلب معلّق |
| POST | — | CreateOrder | إنشاء |
| PATCH | **`?id=uuid`** | UpdateOrder | تحديث |
| DELETE | **`?id=uuid`** | — | حذف |

### `/api/v1/bot/orders/items`

| Method | Query | Body | الوظيفة |
|--------|-------|------|---------|
| POST | **`?orderId=uuid`** | OrderItem | إضافة/دمج |
| PUT | **`?orderId=uuid`** | ReplaceItems | استبدال كامل |
| PATCH | **`?orderId=&itemId=`** | UpdateItem | تعديل بند |
| DELETE | **`?orderId=&itemId=`** | — | حذف بند |

### تدفق البوت (واتساب)

```bash
GET  /orders?pending=true&phone=0501234567
POST /orders                              # { customerId } — سلة فارغة
POST /orders/items?orderId=UUID           # { productId, quantity }
PATCH /orders?id=UUID                     # { status: "confirmed", deliveryInfo }
```

## Dashboard (Server Actions)

```typescript
await createOrder({
  customerId, notes, deliveryInfo,
  items: [{ productId, variantId, unitId, quantity, unitPrice, currencyId, priceLabelId }]
})
```

## حماية

- `replaceOrderItems` / dashboard `updateOrder`: deleteMany + create
- لا تحذف كل البنود في dashboard — validation صريح
- `customerId` اختياري (طلبات بدون عميل)
