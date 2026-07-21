---
name: nawaat-meilisearch
description: Meilisearch في Nawaat — مزامنة منتجات، بحث، لوحة التحكم. استخدم عند العمل على meilisearch-sync، search-engine panel، أو APIs في app/api/v1/dashboard/meilisearch.
---

# Nawaat Meilisearch

## الملفات

| الملف | الدور |
|-------|--------|
| `lib/meilisearch.ts` | عميل singleton + إعدادات index |
| `lib/utils/meilisearch-sync.ts` | مزامنة، upsert، delete، stats، `searchProductIdsInMeilisearch` |
| `lib/bot/normalize-search-query.ts` | تطبيع عربي (همزات، تشكيل، أرقام) — يُطبَّق عند الفهرسة والبحث |
| `app/api/v1/dashboard/meilisearch/*` | status, sync, search, indexes |

## Env

- `MEILISEARCH_HOST` (default: `http://localhost:7700`)
- `MEILISEARCH_MASTER_KEY`
- `MEILISEARCH_INDEX` (default: `products`)

## قواعد resilient

- إذا Meili غير متاح: أرجع `{ unavailable: true }` — **لا throw**
- بعد تعديل منتج/توفر/وحدات: `upsertProductToMeilisearch(id).catch(console.warn)`
- بعد حذف منتج: `deleteProductFromMeilisearch(id).catch(console.warn)`
- تعديل الأسعار لا يُحدّث Meili (لا سعر في المستند)

## Document shape

`MeiliProductDocument` في meilisearch-sync.ts — حقول بحث مطبّعة:
- `id`, `itemNumber`, `name` (displayName عند الوراثة), `productName`, `familyId`
- `attributeText`, `attributeValues`, `tags`, `alternativeNames`, `searchText`, `isAvailable`
- بدون سعر، وصف، تواريخ، أو brandId/categoryId

`searchableAttributes` (ترتيب): `itemNumber`, `name`, `alternativeNames`, `searchText`, `brand`, `attributeText`, `category`, `tags`

`filterableAttributes`: `id`, `isAvailable`, `brand`, `category`, `attributeValues`, `familyId`

بعد تغيير اسم `ProductFamily`: أعد فهرسة منتجات العائلة عبر `upsertProductsToMeilisearch`.

`synonyms`: بذرة صغيرة للمقاسات وقطن/cotton — قابلة للتوسيع في `MEILI_SETTINGS`

## APIs (dashboard JWT)

```typescript
const authError = await requireDashboardAuth()
if (authError) return authError
```

- `GET /status` — مقارنة documentCount مع db count
- `POST /sync` — مزامنة كاملة (تطبّق إعدادات الفهرس + المستندات)
- `GET /search` — بحث تجريبي

## Bot search

`GET /api/v1/bot/products/search` يستخدم Meilisearch عبر `searchProductIdsInMeilisearch`، ثم hydrate من Prisma، ثم **تجميع حسب `familyId`**.

- الاستجابة: عائلات `{ family, category, brand, matchCount, products[] }` — المطابق فقط
- `page`/`limit` بعدد العائلات؛ over-fetch داخلي؛ `hasMore` + `pagination.total` تقديري
- فلتر `familyCode` → `familyId` في Meili filter
- تطبيع عربي على `q` / `brand` / `attr` وعلى حقول الفهرس
- حقل `searchText` يجمع الاسم/البدائل/البراند/الفئة/الصفات/الوسوم/رقم الصنف + اسم العائلة
- تفكيك حذر لـ `q` — `parse=false` للتعطيل؛ relax عند الصفر
- فلاتر `brand` / `attr` / `available` / `familyId`: تطابق قيمة كاملة
- `meta.engine` · `meta.parsed` · `skuMatch` لمسار رقم الصنف
- عند تعطّل Meili: fallback Prisma بنفس التجميع
- بعد تغيير شكل المستند أو الإعدادات: **مزامنة كاملة مرة واحدة من لوحة search-engine**
