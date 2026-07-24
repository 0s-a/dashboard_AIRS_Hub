# API Reference — AIRS Hub Bot API

Base URL: `https://your-domain.com/api/v1/bot`  
Auth: كل طلب يجب أن يحتوي على هيدر `x-api-key: {BOT_API_KEY}`

---

## Authentication

```
x-api-key: <BOT_API_KEY>
```

**استجابة الخطأ عند فشل المصادقة:**
```json
{ "success": false, "error": "غير مصرح — مفتاح x-api-key ناقص أو غير صحيح", "code": "UNAUTHORIZED" }
```

Webhook اختياري لحالة الطلب: عيّن `BOT_ORDER_WEBHOOK_URL` (+ `BOT_ORDER_WEBHOOK_SECRET` اختياري). يُرسل `POST` عند تغيّر الحالة بعد `PATCH /orders`.
---

## صيغة الاستجابة الموحّدة

### نجاح ✅
```json
{
  "success": true,
  "data": { ... },
  "pagination": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

### خطأ أعمال ❌ (HTTP 200 — فرّع على `success` / `code`)
```json
{
  "success": false,
  "error": "رسالة الخطأ",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

أخطاء المصادقة فقط تُرجع رمزاً غير 200: `UNAUTHORIZED` → 401، `MISCONFIGURED` → 503.

**رموز الأخطاء الشائعة:**

| Code | HTTP | المعنى |
|------|------|--------|
| `UNAUTHORIZED` | 401 | مفتاح API غير صحيح أو غائب |
| `MISCONFIGURED` | 503 | BOT_API_KEY غير معيّن في البيئة |
| `VALIDATION_ERROR` | 200 | بيانات الطلب غير صحيحة |
| `MISSING_PARAM` | 200 | معلمة مطلوبة غائبة |
| `NOT_FOUND` | 200 | السجل غير موجود |
| `DUPLICATE_CONTACT` | 200 | رقم هاتف/بريد مكرر |
| `DUPLICATE_FIELD` | 200 | حقل فريد مكرر |
| `PRICE_NOT_FOUND` | 200 | لا توجد تسعيرة مطابقة |
| `INTERNAL_ERROR` | 200 | خطأ داخلي في الخادم |

---

## Pagination

جميع endpoints القائمة تقبل:

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `page` | 1 | — | رقم الصفحة |
| `limit` | 20–50 | 100 | عدد النتائج في الصفحة |

---

## Customers API

### `GET /customers` — قائمة العملاء

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` / `q` | string | بحث بالاسم أو رقم الهاتف |
| `active` | `true` \| `false` | فلترة بالحالة |
| `page` | number | رقم الصفحة |
| `limit` | number | عدد النتائج (max: 100) |

**مثال:**
```
GET /api/v1/bot/customers?search=أحمد&active=true&limit=20
```

---

### `POST /customers` — إنشاء أو تحديث عميل (Upsert)

**Body:**
```json
{
  "name": "أحمد محمد",
  "contacts": [
    { "type": "phone", "value": "0501234567", "label": "جوال", "isPrimary": true }
  ],
  "source": "whatsapp",
  "tags": {},
  "currencyIds": ["uuid"],
  "priceLabelIds": ["uuid"]
}
```

**الاستجابة:** تُضيف حقل `action: "created" | "updated"` لمعرفة هل تمت الإضافة أو التحديث.

**منطق Upsert:**
1. يبحث بالـ contacts (هاتف/بريد) أولاً
2. إذا وجده → يحدّث البيانات الجديدة فقط
3. إذا لم يجده → ينشئ سجلاً جديداً

---

### `GET /customers/:id` — تفاصيل عميل

```
GET /api/v1/bot/customers/{uuid}
```

---

### `PUT /customers/:id` — تحديث عميل

نفس بنية الـ POST body، جميع الحقول اختيارية.

---

### `DELETE /customers/:id` — حذف عميل

```
DELETE /api/v1/bot/customers/{uuid}
```

---

### `GET /customers/search` — بحث برقم الهاتف

```
GET /api/v1/bot/customers/search?phone=0501234567
```

| Param | Alias | Description |
|-------|-------|-------------|
| `phone` | `q`, `value` | **مطلوب** — رقم الهاتف للبحث |

- يدعم تطبيع أرقام الهواتف السعودية (05 / 966 / 5) واليمنية (967) تلقائياً.
- يقبل `q` و `value` كـ alias للتوافق مع البوتات القديمة.
- **لا** يقبل إيميلات أو نصوصاً عشوائية (يُرجع `400 INVALID_PHONE`).

**استجابة — عميل موجود:**
```json
{
  "success": true,
  "found": true,
  "data": {
    "id": "uuid",
    "name": "محمد علي",
    "isActive": true,
    "source": "bot",
    "lastInteraction": "2026-05-23T04:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z",
    "contacts": [
      { "id": "uuid", "type": "phone", "value": "0512345678", "label": "جوال", "isPrimary": true }
    ],
    "priceLabels": [{ "id": "uuid", "name": "تاجر" }],
    "currencies": [{ "id": "uuid", "name": "ريال سعودي", "code": "SAR", "symbol": "ر.س" }],
    "tags": [{ "id": "uuid", "name": "VIP" }],
    "stats": {
      "totalOrders": 12,
      "lastOrderAt": "2026-05-20T10:00:00Z",
      "lastOrderStatus": "delivered"
    }
  },
  "meta": {
    "phone": "0512345678",
    "patterns": ["0512345678", "512345678", "966512345678"]
  }
}
```

**استجابة — عميل غير موجود:**
```json
{
  "success": true,
  "found": false,
  "data": null,
  "meta": { "phone": "0599000000", "patterns": ["0599000000", "599000000", "966599000000"] }
}
```

**رموز الخطأ الخاصة بهذا الـ endpoint:**

| Code | HTTP | المعنى |
|------|------|--------|
| `MISSING_PHONE` | 400 | لم يُمرَّر رقم الهاتف |
| `INVALID_PHONE` | 400 | الإدخال ليس رقم هاتف صالحاً |




---

### `GET /customers/:id/pricing` — تسعيرات العميل

```
GET /api/v1/bot/customers/{uuid}/pricing
```

**الاستجابة:**
```json
{
  "success": true,
  "data": {
    "customerId": "...",
    "customerName": "...",
    "currencies": [{ "id": "...", "code": "SAR", "symbol": "ر.س", "name": "ريال سعودي" }],
    "priceLabels": [{ "id": "...", "name": "سعر الجملة" }]
  }
}
```

---

## Products API

### `GET /products/search` — بحث مجمّع حسب المنتج (SPU)

بحث Meilisearch-first ثم hydrate من Prisma. **`data[]` دائماً مجموعات منتج**: كل عنصر = `product` + `items[]` للأصناف **المطابقة فقط**. `page`/`limit` بعدد المنتجات (مع over-fetch داخلي). تفكيك حذر لـ `q` (`parse` افتراضي true). لجلب صنف كامل برقم الصنف استخدم `GET /items/by-number`. عند تعطّل Meili: Prisma fallback.

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | **مطلوب** — اسم أو رقم أو اسم بديل أو براند أو صفة |
| `brand` | string | اختياري صريح — تطابق كامل لاسم العلامة بعد التطبيع |
| `attr` | string (متكرر) | اختياري — تطابق كامل لقيمة صفة؛ عدة `attr` = AND |
| `available` | boolean | اختياري — `true` للمتاح فقط / `false` لغير المتاح |
| `parse` | boolean | اختياري — افتراضي `true`؛ `false` يعطّل تفكيك `q` |
| `productCode` | string | اختياري — كود المنتج (SPU)؛ غير موجود → نتائج فارغة |
| `customerId` | uuid | اختياري — تسعيرة وعملات العميل لأسعار الأصناف في النتائج |
| `currency` | string | اختياري — فرض رمز عملة للأسعار المضمّنة |
| `page` / `limit` | number | صفحات **المنتجات** (حد أقصى 50) |

**الاستجابة:** `{ product: { code, name }, category, brand, items[] }` — لكل صنف: `id`, `itemNumber`, `name`, `isAvailable`, `alternativeNames[]`, `primaryImage`, `prices[]`, `attributes`. الـ meta: `engine`, `hasMore`, `parsed?`, و`pagination.total` تقديري؛ وعند تمرير `customerId` يُعاد `meta.customerId` للمستعمل في التسعير.

### `GET /items/by-number` — بطاقة صنف برقم الصنف

عند عدم الوجود (HTTP 200 + soft error):
```json
{
  "success": false,
  "error": "الصنف غير موجود",
  "code": "NOT_FOUND",
  "details": { "suggestSearch": true, "q": "..." }
}
```
→ البوت يستدعي `GET /products/search?q=...`.

### `GET /items/by-id` — بطاقة صنف بـ UUID

نفس شكل by-number؛ مطلوب `itemId`.

### `GET /items/price` — سعر صنف

| Param | Type | Description |
|-------|------|-------------|
| `itemId` أو `itemNumber` | string | **أحدهما مطلوب** |
| `customerId` | uuid | اختياري — تسمية التسعير وعملات العميل |
| `currency` | string | اختياري — رمز عملة هدف (مثل `USD`) |

---

### `GET /items/image` — الصورة الرئيسية للصنف

| Param | Type | Description |
|-------|------|-------------|
| `itemId` أو `itemNumber` | string | **أحدهما مطلوب** |

---

## Orders API

### `POST /orders` — إنشاء طلب جديد

```json
{
  "customerId": "uuid",

  "notes": "ملاحظات الطلب",
  "items": [
    {
      "itemId": "uuid",
      "priceLabelId": "uuid",
      "unitId": "uuid",
      "quantity": 2,
      "notes": "لون أحمر"
    }
  ]
}
```

> `customerId` — كافٍ لربط الطلب بالعميل.

---

### `GET /orders` — قائمة الطلبات

| Param | Type | Description |
|-------|------|-------------|
| `customerId` | uuid | فلترة بالعميل |

| `status` | string | فلترة بالحالة |

---

## Notifications API

### `POST /notifications` — إنشاء إشعار بحث (عقد خفيف)

البوت يرسل الحد الأدنى؛ الخادم يشتق `productName` و`source` ويحل العميل من الهاتف. Dedup خلال 24 ساعة يعيد الإشعار الموجود بـ `created: false` و`200`.

```json
{ "type": "not_found", "q": "تكييف سامسونج", "phone": "0501234567" }
```

```json
{ "type": "out_of_stock", "q": "ABC-1", "itemNumber": "ABC-1", "phone": "0501234567" }
```

| حقل | مطلوب | ملاحظات |
|------|--------|---------|
| `type` | نعم | `out_of_stock` \| `not_found` |
| `q` | نعم | alias: `searchQuery` |
| `phone` | لا | alias: `phoneNumber`؛ يُطبَّع ويُحل `customerId` إن أمكن |
| `customerId` | لا | إن وُجد يجب أن يكون صالحاً |
| `itemId` / `itemNumber` | لـ `out_of_stock` | أحدهما إلزامي عند نفاد المخزون |

**الاستجابة:**

```json
{ "success": true, "data": { "id": "...", "type": "not_found", "created": true } }
```

القراءة والأرشفة عبر لوحة التحكم فقط — لا يوجد `GET` على Bot API.

---

## Item Price API

### `GET /items/price` — استعلام عن سعر صنف

```
GET /api/v1/bot/items/price?itemNumber=ABC-1&customerId=uuid&currency=SAR
```

**الاستجابة:**
```json
{
  "success": true,
  "data": {
    "itemId": "...",
    "itemNumber": "ABC-1",
    "name": "...",
    "customerId": "...",
    "prices": [
      { "label": "سعر الجملة", "value": 150, "currency": { "code": "SAR", "symbol": "ر.س" }, "unit": "كرتون" }
    ]
  }
}
```

> بدون `customerId` → التسمية الافتراضية والعملة الافتراضية (أو `currency` إن مُرِّرت).  
> مع `customerId` → تسعيرة العميل وعملاته (ما لم تُفرض `currency`).
