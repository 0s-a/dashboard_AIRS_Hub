---
name: nawaat-bot-api
description: Bot API في Nawaat — عقد HTTP للبوتات (customers، orders، brands، products search/price/image، notifications). استخدم عند العمل على app/api/v1/bot أو public/openapi.json.
---

# Nawaat Bot API

## الحدود

| الطبقة | المسار | Auth |
|--------|--------|------|
| Bot HTTP | `/api/v1/bot/**` | `x-api-key` عبر `validateApiKey` |
| Dashboard ops | `/api/v1/dashboard/meilisearch/**` | JWT cookie |
| Dashboard CRUD | `lib/actions/**` | `requireAuth` — ليس REST |

إذا لم يُضبط `BOT_API_KEY` → كل طلبات البوت **503** `MISCONFIGURED`.

عقد منشور يدوي: `public/openapi.json` (يجب أن يطابق الكود؛ لا `/persons`).

## Envelope

```typescript
apiSuccess(data, status?, meta?)
// { success: true, data, ...meta }

apiError(message, status, { code?, details? })
// { success: false, error, code?, details? }
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

### Products & pricing — `lib/bot/`

| Method | Path | ملاحظات |
|--------|------|---------|
| GET | `/api/v1/bot/brands` | قائمة البراندات — `{ name, code }` فقط، مرتبة أبجدياً |
| GET | `/api/v1/bot/products/search` | `q` مطلوب · نتائج **عائلات** (`family` + `products[]` مطابق فقط) · `page`/`limit` بعدد العائلات · `familyCode` · `hasMore`/`skuMatch` · تفكيك `parse` · فلاتر `brand`/`attr`/`available` · `meta.engine` + `meta.parsed` |
| GET | `/api/v1/bot/products/price` | `productId` أو `itemNumber` · `customerId`/`currency` اختياريان |
| GET | `/api/v1/bot/products/image` | `productId` أو `itemNumber` · الصورة الرئيسية فقط |

لا يوجد `GET /api/v1/bot/products` (قائمة عامة) ولا `POST /check-price`.

### Notifications — `lib/bot/notifications.ts`

| Method | Path | ملاحظات |
|--------|------|---------|
| POST | `/api/v1/bot/notifications` | عقد خفيف: `type` + `q` (+ `phone`/`customerId`؛ و`productId`/`itemNumber` لـ `out_of_stock`) · dedup 24 ساعة · استجابة `{ id, type, created }` |

لا يوجد `GET` — القراءة عبر Dashboard Server Actions.

## هيكل الملفات

| المسار | الدور |
|--------|-------|
| `app/api/v1/bot/**/route.ts` | رفيع: auth + Zod + استدعاء service |
| `lib/api-utils.ts` | validateApiKey، envelope، هاتف، pagination |
| `lib/orders/` | طلبات البوت (service + snapshot + schemas) |
| `lib/customers/` | عملاء البوت (upsert، search، status، pricing) |
| `lib/bot/brands.ts` | قائمة البراندات (name + code) |
| `lib/bot/resolve-product.ts` | حل المنتج بـ productId أو itemNumber |
| `lib/bot/product-search.ts` | بحث منتجات (Meili + تطبيع + تفكيك + Prisma hydrate / fallback) |
| `lib/bot/parse-product-query.ts` | قاموس Brand/attrs + تفكيك حذر لـ `q` |
| `lib/bot/normalize-search-query.ts` | تطبيع عربي/SKU لاستعلام البحث والفهرسة |
| `lib/bot/product-price.ts` | سعر المنتج |
| `lib/bot/product-image.ts` | الصورة الرئيسية |
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
