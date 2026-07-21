---
name: nawaat-orders
description: إدارة الطلبات في Nawaat — إنشاء، تعديل، حالات، snapshot السعر، فواتير. استخدم عند العمل على orders، OrderItem، فواتير، أو Bot orders API.
---

# Nawaat Orders

## حالات الطلب

مصدر الحقيقة: `lib/order-constants.ts` + انتقالات في `lib/orders/guards.ts`

```
pending    → confirmed | cancelled
confirmed  → processing | cancelled
processing → shipped | cancelled
shipped    → delivered | cancelled
delivered  → (نهائي)
cancelled  → (نهائي)
```

- التحقق من القيمة: `validateOrderStatus(status)` أو `VALID_ORDER_STATUSES`
- انتقال غير مسموح → `409 INVALID_STATUS_TRANSITION`
- UI labels في `ORDER_STATUS_CONFIG`

## Snapshot السعر (مهم)

عند إنشاء/تحديث طلب، احفظ في كل `OrderItem`:

```typescript
{
  productId, unitId?, quantity,
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

تغيير `unitId` على بند معلّق يعيد `resolveItemSnapshot`.

## الملفات الرئيسية

| الملف | الدور |
|-------|-------|
| `lib/orders/service.ts` | منطق الأعمال — مصدر الحقيقة (Bot + Dashboard) |
| `lib/actions/orders.ts` | غلاف Server Actions (`requireAuth` → service) |
| `lib/order-utils.ts` | resolveItemPrice, حساب الإجمالي |
| `lib/order-constants.ts` | حالات الطلب + UI config |
| `lib/orders/guards.ts` | mutable / transitions / deletable |
| `app/api/v1/bot/orders/` | Bot Orders API — مساران ثابتان |
| `app/invoice/[id]/page.tsx` | فاتورة قابلة للطباعة |

## قواعد العمل

1. **createOrder**: إن وُجد `customerId` وطلب `pending` لنفس العميل → أعده (`reused: true`) بدون إنشاء جديد. خلاف ذلك يولّد `orderNumber` عبر `generateItemNumber('order')`
2. **Bot POST**: `reused` → HTTP 200؛ إنشاء جديد → 201
3. **updateOrder**: يرفض `items.length === 0`؛ تعديل بنود/notes/deliveryInfo/customerId على `pending` فقط
4. **deliveryInfo**: نص حر (عنوان، كوريير، ملاحظات)
5. **Includes**: استخدم `ORDER_INCLUDE` من `lib/prisma-includes.ts`
6. **تعديل البنود**: `pending` فقط → `409 ORDER_NOT_MUTABLE`
7. **حذف الطلب**: `pending` أو `cancelled` فقط → وإلا `409 ORDER_NOT_DELETABLE`

## Bot Orders API — query parameters

مصدر HTTP — مساران ثابتان + `x-api-key` + `lib/orders/service.ts`

### `/api/v1/bot/orders`

| Method | Query | Body | الوظيفة |
|--------|-------|------|---------|
| GET | (فلاتر list) | — | قائمة |
| GET | `?id=uuid` | — | تفاصيل |
| GET | `?pending=true&phone=` | — | آخر طلب معلّق |
| POST | — | CreateOrder | إنشاء أو إعادة سلة pending |
| PATCH | **`?id=uuid`** | UpdateOrder | تحديث (انتقالات حالة صارمة) |
| DELETE | **`?id=uuid`** | — | حذف (pending/cancelled) |

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
POST /orders                              # { customerId } — سلة فارغة أو إعادة القائمة
POST /orders/items?orderId=UUID           # { productId, quantity }
PATCH /orders?id=UUID                     # { status: "confirmed", deliveryInfo }
```

## Dashboard (Server Actions)

```typescript
await createOrder({
  customerId, notes, deliveryInfo,
  items: [{ productId, unitId, quantity, unitPrice, currencyId, priceLabelId }]
})
// → { order, reused }
```

Actions تستدعي `lib/orders/service` بعد `requireAuth()`.

## حماية

- `replaceOrderItems` / `updateOrder` مع items: deleteMany + create
- لا تحذف كل البنود — validation صريح
- `customerId` اختياري (طلبات بدون عميل)
- سلة pending واحدة لكل عميل (reuse عند الإنشاء)
