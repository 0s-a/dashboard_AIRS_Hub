---
name: nawaat-meilisearch
description: Meilisearch في Nawaat — مزامنة منتجات، بحث، لوحة التحكم. استخدم عند العمل على meilisearch-sync، search-engine panel، أو APIs في app/api/v1/dashboard/meilisearch.
---

# Nawaat Meilisearch

## الملفات

| الملف | الدور |
|-------|-------|
| `lib/meilisearch.ts` | عميل singleton + إعدادات index |
| `lib/utils/meilisearch-sync.ts` | مزامنة، upsert، delete، stats |
| `app/api/v1/dashboard/meilisearch/*` | status, sync, search, indexes |

## Env

- `MEILISEARCH_HOST` (default: `http://localhost:7700`)
- `MEILISEARCH_MASTER_KEY`
- `MEILISEARCH_INDEX` (default: `products`)

## قواعد resilient

- إذا Meili غير متاح: أرجع `{ unavailable: true }` — **لا throw**
- بعد تعديل منتج/سعر: `upsertProductToMeilisearch(id).catch(console.warn)`
- بعد حذف منتج: `deleteProductFromMeilisearch(id).catch(console.warn)`

## Document shape

`MeiliProductDocument` في meilisearch-sync.ts:
- id, productCode, name, brand, category, tags, isAvailable, minPrice, ...

## APIs (dashboard JWT)

```typescript
const authError = await requireDashboardAuth()
if (authError) return authError
```

- `GET /status` — مقارنة documentCount مع db count
- `POST /sync` — مزامنة كاملة
- `GET /search` — بحث تجريبي

## Bot search

`app/api/v1/bot/products/search` يستخدم PostgreSQL FTS — ليس Meili مباشرة.
