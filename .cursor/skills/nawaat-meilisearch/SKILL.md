---
name: nawaat-meilisearch
description: Meilisearch في Nawaat — مزامنة أصناف، بحث، لوحة التحكم. استخدم عند العمل على meilisearch-sync، search-engine panel، أو APIs في app/api/v1/dashboard/meilisearch.
---

# Nawaat Meilisearch

## الملفات

| الملف | الدور |
|-------|--------|
| `lib/meilisearch.ts` | عميل singleton + إعدادات index |
| `lib/utils/meilisearch-sync.ts` | مزامنة، upsert، delete، stats، `searchItemIdsInMeilisearch` |
| `lib/bot/normalize-search-query.ts` | تطبيع عربي — فهرسة + بحث البوت |
| `app/api/v1/dashboard/meilisearch/*` | status, sync, search, indexes |

## Env

- `MEILISEARCH_HOST` (default: `http://localhost:7700`)
- `MEILISEARCH_MASTER_KEY`
- `MEILISEARCH_INDEX` (default: `items`)

## قواعد resilient

- إذا Meili غير متاح: أرجع `{ unavailable: true }` — **لا throw**
- بعد تعديل صنف/توفر/وحدات: `upsertItemToMeilisearch(id).catch(console.warn)`
- بعد حذف صنف: `removeItemFromMeilisearch(id).catch(console.warn)`
- بعد تعديل منتج (اسم/براند/تصنيف): `syncItemsByProductId(productId)`
- تعديل الأسعار لا يُحدّث Meili

## Document shape

`MeiliItemDocument` — وثيقة = **صنف** (`Item`):
- `id`, `itemNumber`, `name` (اسم الصنف), `productName` (اسم المنتج), `productId`
- `brand`, `category` (من المنتج)
- `attributeText`, `attributeValues`, `tags`, `alternativeNames`, `searchText`, `isAvailable`

`filterableAttributes`: `id`, `isAvailable`, `brand`, `category`, `attributeValues`, `productId`

## Bot search

`GET /api/v1/bot/products/search` — Meili عبر `searchItemIdsInMeilisearch` ثم hydrate ثم تجميع حسب `productId` (SPU).
سعر/صورة الصنف: `GET /api/v1/bot/items/price` و `/items/image` بـ `itemId` أو `itemNumber`.

بعد تغيير شكل المستند: مزامنة كاملة من لوحة محرك البحث.
