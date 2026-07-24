---
name: nawaat-bot-api
description: Bot API في Nawaat — عقد HTTP للبوتات (customers، orders، brands، products search، items by-number/price/image، notifications). استخدم عند العمل على app/api/v1/bot أو public/openapi.json.
---

# Nawaat Bot API

## الحدود

| الطبقة | المسار | Auth |
|--------|--------|------|
| Bot HTTP | `/api/v1/bot/**` | `x-api-key` عبر `validateApiKey` |
| Dashboard ops | `/api/v1/dashboard/meilisearch/**` | JWT cookie |
| Dashboard CRUD | `lib/actions/**` | `requireAuth` — ليس REST |

إذا لم يُضبط `BOT_API_KEY` → كل طلبات البوت **503** `MISCONFIGURED`.

**أخطاء الأعمال (Bot):** HTTP **200** + `{ success: false, error, code }` حتى لا تتوقف أدوات الأتمتة (n8n). استثناء: `UNAUTHORIZED` (401) و`MISCONFIGURED` (503).

الحقول الاختيارية تقبل `null` / `""` / `"null"` وتُعامل كـ غير مُمرَّرة (`lib/zod-optional.ts`).

عقد منشور يدوي: `public/openapi.json` (يجب أن يطابق الكود؛ لا `/persons`).

**نموذج المخزون:** `Product` = منتج (SPU)، `Item` = صنف (SKU).
- بحث مجمّع: `GET /products/search` → منتجات + أصناف مطابقة
- عمليات صنف: `GET /items/*` بـ `itemId` أو `itemNumber`
- بنود الطلبات والإشعارات: `itemId` (وليس `productId` للصنف)

## Envelope

```typescript
apiSuccess(data, status?, meta?)
// { success: true, data, ...meta }

botApiError(message, logicalStatus, { code?, details? })
// HTTP 200 دائماً — { success: false, error, code?, details? }
// فرّع على success/code. المصادقة تبقى 401/503 عبر validateApiKey.
```

- رسالة `error` عربية · `code` إنجليزي للبوت
- قواعد كاملة: `.cursor/rules/bot-api.mdc`

## خريطة endpoints

### Customers — `lib/customers/`

| Method | Path | الوظيفة |
|--------|------|---------|
| POST | `/api/v1/bot/customers` | Upsert (هاتف + write-once للاسم) |
| GET | `/api/v1/bot/customers/search` | بحث بالهاتف (`phone`؛ aliases: `q`, `value`) |
| GET | `/api/v1/bot/customers/{id}` | جلب |
| PUT | `/api/v1/bot/customers/{id}` | تحديث |
| DELETE | `/api/v1/bot/customers/{id}` | حذف |
| GET | `/api/v1/bot/customers/{id}/pricing` | عملات + مسمى تسعير |
| PATCH | `/api/v1/bot/customers/{id}/status` | `{ isActive: boolean }` |

### Orders — skill `nawaat-orders` · `lib/orders/`

| Method | Path |
|--------|------|
| GET/POST/PATCH/DELETE | `/api/v1/bot/orders` (`?id=` / `?pending=true`) |
| POST/PUT/PATCH/DELETE | `/api/v1/bot/orders/items` (`?orderId=` / `?itemId=`) |

بنود الطلب: `{ itemId, quantity, ... }` — معرّف الصنف القابل للبيع.

### Products & Items — `lib/bot/`

| Method | Path | ملاحظات |
|--------|------|---------|
| GET | `/api/v1/bot/brands` | قائمة البراندات — `{ name, code }` فقط، مرتبة أبجدياً |
| GET | `/api/v1/bot/products/search` | `q` مطلوب · نتائج: `product{code,name}` + أسماء `category`/`brand` + `items[]` (`id`, `alternativeNames`, `primaryImage`, `prices`, صفات) · `customerId`/`currency` اختياريان · عند تمرير `customerId` يُعاد في meta · **ليس** لبطاقة كاملة برقم/UUID |
| GET | `/api/v1/bot/items/by-number` | `itemNumber` مطلوب · بطاقة صنف (عرض موحّد مع البحث + وحدات/أسعار/صور) · عند NOT_FOUND: `details.suggestSearch` · `customerId`/`currency` اختياريان |
| GET | `/api/v1/bot/items/by-id` | `itemId` مطلوب · نفس بطاقة by-number |
| GET | `/api/v1/bot/items/price` | `itemId` أو `itemNumber` · `customerId`/`currency` اختياريان |
| GET | `/api/v1/bot/items/image` | `itemId` أو `itemNumber` · الصورة الرئيسية فقط |

لا يوجد `GET /api/v1/bot/products` (قائمة عامة) ولا `POST /check-price`. رقم الصنف الدقيق → `/items/by-number`؛ معرّف UUID → `/items/by-id`.

**Webhook (اختياري):** عند تغيّر حالة طلب يُرسل `POST` إلى `BOT_ORDER_WEBHOOK_URL` بالجسم `{ event: "order.status_changed", orderId, orderNumber, previousStatus, status, customerId, at }` — لا يوقف تحديث الطلب عند الفشل.

### Notifications — `lib/bot/notifications.ts`

| Method | Path | ملاحظات |
|--------|------|---------|
| POST | `/api/v1/bot/notifications` | عقد خفيف: `type` + `q` (+ `phone`/`customerId`؛ و`itemId`/`itemNumber` لـ `out_of_stock`) · dedup 24 ساعة · استجابة `{ id, type, created }` |

لا يوجد `GET` — القراءة عبر Dashboard Server Actions.

## هيكل الملفات

| المسار | الدور |
|--------|-------|
| `app/api/v1/bot/**/route.ts` | رفيع: auth + Zod + استدعاء service |
| `lib/api-utils.ts` | validateApiKey، envelope، `botApiError`، هاتف، pagination |
| `lib/orders/` | طلبات البوت (service + snapshot + schemas) |
| `lib/customers/` | عملاء البوت (upsert، search، status، pricing) |
| `lib/bot/brands.ts` | قائمة البراندات (name + code) |
| `lib/bot/resolve-item.ts` | حل الصنف بـ `itemId` أو `itemNumber` |
| `lib/bot/resolve-item-number.ts` | حل معرّف الصنف برقم الصنف (تطبيع + regexp) |
| `lib/bot/item-by-number.ts` | بطاقة صنف كاملة برقم الصنف |
| `lib/bot/product-search/` | بحث منتجات مجمّع (Meili + تطبيع + تفكيك + Prisma hydrate / fallback) |
| `lib/bot/parse-product-query.ts` | قاموس Brand/attrs + تفكيك حذر لـ `q` |
| `lib/bot/normalize-search-query.ts` | تطبيع عربي/SKU لاستعلام البحث والفهرسة |
| `lib/bot/item-price.ts` | سعر الصنف |
| `lib/bot/item-image.ts` | الصورة الرئيسية |
| `lib/bot/notifications.ts` | إشعارات البحث |

## SOP — endpoint جديد

1. Zod في `lib/<domain>/` أو `lib/bot/`
2. منطق في service
3. route رفيع
4. حدّث `public/openapi.json`
5. حدّث هذا الـ skill إن تغيّر العقد

## روابط domains

- طلبات / snapshot → `nawaat-orders`
- تسعير / PriceLabel / تحويل عملة → `nawaat-pricing`
- Meilisearch → `nawaat-meilisearch` (بحث البوت عبر Meili + fallback Prisma)
