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

## Persons API

### `GET /persons` — قائمة الأشخاص

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` / `q` | string | بحث بالاسم أو رقم الهاتف |
| `active` | `true` \| `false` | فلترة بالحالة |
| `page` | number | رقم الصفحة |
| `limit` | number | عدد النتائج (max: 100) |

**مثال:**
```
GET /api/v1/bot/persons?search=أحمد&active=true&limit=20
```

---

### `POST /persons` — إنشاء أو تحديث شخص (Upsert)

**Body:**
```json
{
  "name": "أحمد محمد",
  "contacts": [
    { "type": "phone", "value": "0501234567", "label": "جوال", "isPrimary": true }
  ],
  "groupNumber": "966501234567@s.whatsapp.net",
  "groupName": "مجموعة السعودية",
  "personTypeId": "uuid",
  "source": "whatsapp",
  "tags": {},
  "currencyIds": ["uuid"],
  "priceLabelIds": ["uuid"]
}
```

**الاستجابة:** تُضيف حقل `action: "created" | "updated"` لمعرفة هل تمت الإضافة أو التحديث.

**منطق Upsert:**
1. يبحث بالـ contacts (هاتف/بريد) أولاً
2. ثم يبحث بـ groupNumber
3. إذا وجده → يحدّث البيانات الجديدة فقط
4. إذا لم يجده → ينشئ سجلاً جديداً

---

### `GET /persons/:id` — تفاصيل شخص

```
GET /api/v1/bot/persons/{uuid}
```

---

### `PUT /persons/:id` — تحديث شخص

نفس بنية الـ POST body، جميع الحقول اختيارية.

---

### `DELETE /persons/:id` — حذف شخص

```
DELETE /api/v1/bot/persons/{uuid}
```

---

### `GET /persons/search` — بحث بجهة الاتصال

```
GET /api/v1/bot/persons/search?q=0501234567
```

| Param | Alias | Description |
|-------|-------|-------------|
| `q` | `value`, `phone`, `email` | قيمة الاتصال للبحث |
| `page` / `limit` | — | pagination |

يدعم تطبيع أرقام الهواتف السعودية تلقائياً (05... = 966...).

---

### `GET /persons/group` — بحث بـ groupNumber

```
GET /api/v1/bot/persons/group?groupNumber=966501234567@s.whatsapp.net
```

---

### `PATCH /persons/:id/toggle` — تبديل حالة النشاط

```
PATCH /api/v1/bot/persons/{uuid}/toggle
```

---

### `PATCH /persons/group/:groupNumber/toggle` — تبديل النشاط بـ groupNumber

```
PATCH /api/v1/bot/persons/group/966501234567%40s.whatsapp.net/toggle
```

> **ملاحظة:** يجب URL-encode الـ groupNumber إذا احتوى على `@`.

---

### `GET /persons/:id/pricing` — تسعيرات الشخص

```
GET /api/v1/bot/persons/{uuid}/pricing
```

**الاستجابة:**
```json
{
  "success": true,
  "data": {
    "personId": "...",
    "personName": "...",
    "personType": { "id": "...", "name": "...", "color": "...", "icon": "..." },
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
| `personId` | uuid | فلترة الأسعار حسب تسعيرة الشخص |
| `available` | `true` \| `false` | فلترة بالتوفر |
| `category` | uuid | فلترة بالتصنيف |
| `brand` | string | فلترة بالعلامة التجارية |

**الاستجابة تتضمن:** `searchMode: "fulltext" | "ilike_fallback"`

---

## Orders API

### `POST /orders` — إنشاء طلب جديد

```json
{
  "personId": "uuid",
  "groupNumber": "966501234567@s.whatsapp.net",
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

> `personId` أو `groupNumber` — واحد منهما كافٍ لربط الطلب بالشخص.

---

### `GET /orders` — قائمة الطلبات

| Param | Type | Description |
|-------|------|-------------|
| `personId` | uuid | فلترة بالشخص |
| `groupNumber` | string | فلترة بـ groupNumber |
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
  "personId": "uuid",
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
    "personName": "...",
    "prices": [
      { "label": "سعر الجملة", "value": 150, "currency": { "code": "SAR", "symbol": "ر.س" }, "unit": "كرتون" }
    ]
  }
}
```

> إذا لم يُعثر على الشخص → تُعاد جميع أسعار المنتج.  
> إذا وُجد الشخص → تُعاد فقط الأسعار المخصصة له.

---

## Announcements API

### `GET /announcements` — قائمة الإعلانات

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | `sent` | حالة الإعلان |
| `page` / `limit` | number | — | pagination |

---

## Webhook (n8n)

### `POST /api/webhooks/n8n` — نتيجة إرسال رسالة

**Auth:** `Authorization: Bearer {N8N_WEBHOOK_SECRET}` أو `x-n8n-api-key: {N8N_WEBHOOK_SECRET}`

**Body (الصيغة الجديدة — Source of Truth):**
```json
{
  "messageId": "uuid",
  "status": "success",
  "providerId": "WAMID...",
  "errorReason": null
}
```

> **Idempotent:** إعادة الإرسال لنفس الـ messageId تُعاد بـ `alreadyProcessed: true` دون تأثير على العدادات.
