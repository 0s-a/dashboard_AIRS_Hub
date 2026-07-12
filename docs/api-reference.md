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
{ "success": false, "error": "Unauthorized — invalid or missing x-api-key", "code": "UNAUTHORIZED" }
```

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

### خطأ ❌
```json
{
  "success": false,
  "error": "رسالة الخطأ",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

**رموز الأخطاء الشائعة:**

| Code | HTTP | المعنى |
|------|------|--------|
| `UNAUTHORIZED` | 401 | مفتاح API غير صحيح أو غائب |
| `MISCONFIGURED` | 503 | BOT_API_KEY غير معيّن في البيئة |
| `VALIDATION_ERROR` | 400 | بيانات الطلب غير صحيحة |
| `MISSING_PARAM` | 400 | معلمة مطلوبة غائبة |
| `NOT_FOUND` | 404 | السجل غير موجود |
| `DUPLICATE_CONTACT` | 409 | رقم هاتف/بريد مكرر |
| `DUPLICATE_FIELD` | 409 | حقل فريد مكرر |
| `PRICE_NOT_FOUND` | 400 | لا توجد تسعيرة مطابقة |
| `INTERNAL_ERROR` | 500 | خطأ داخلي في الخادم |

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

### `GET /products` — قائمة المنتجات

| Param | Type | Description |
|-------|------|-------------|
| `search` / `q` | string | بحث بالاسم أو الرقم أو العلامة التجارية |
| `available` | `true` \| `false` | فلترة بالتوفر |
| `category` | uuid | فلترة بالتصنيف |

---

### `GET /products/search` — بحث نصي متقدم

يستخدم PostgreSQL Full-Text Search مع fallback لـ ILIKE.

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | **مطلوب** — نص البحث |
| `customerId` | uuid | فلترة الأسعار حسب تسعيرة العميل |
| `available` | `true` \| `false` | فلترة بالتوفر |
| `category` | uuid | فلترة بالتصنيف |
| `brand` | string | فلترة بالعلامة التجارية |

**الاستجابة تتضمن:** `searchMode: "fulltext" | "ilike_fallback"`

---

## Orders API

### `POST /orders` — إنشاء طلب جديد

```json
{
  "customerId": "uuid",

  "notes": "ملاحظات الطلب",
  "items": [
    {
      "productId": "uuid",
      "priceLabelId": "uuid",
      "variantId": "uuid",
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

### `POST /notifications` — إنشاء إشعار AI

```json
{
  "type": "out_of_stock",
  "searchQuery": "جهاز تكييف",
  "productId": "uuid",
  "productName": "تكييف سامسونج",
  "phoneNumber": "0501234567",
  "customerId": "uuid",
  "source": "bot"
}
```

| type | الاستخدام |
|------|-----------|
| `out_of_stock` | المنتج موجود لكن غير متوفر |
| `not_found` | المنتج غير موجود في الكتالوج |

---

### `GET /notifications` — قائمة الإشعارات

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | فلترة بالنوع |
| `isRead` | `true` \| `false` | فلترة بحالة القراءة |
| `page` / `limit` | number | pagination |

---

## Check Price API

### `POST /check-price` — استعلام عن سعر منتج لشخص

```json
{
  "phoneNumber": "0501234567",
  "productId": "uuid"
}
```

**الاستجابة:**
```json
{
  "success": true,
  "data": {
    "productId": "...",
    "productName": "...",
    "customerName": "...",
    "prices": [
      { "label": "سعر الجملة", "value": 150, "currency": { "code": "SAR", "symbol": "ر.س" }, "unit": "كرتون" }
    ]
  }
}
```

> إذا لم يُعثر على العميل → تُعاد جميع أسعار المنتج.  
> إذا وُجد العميل → تُعاد فقط الأسعار المخصصة له.
