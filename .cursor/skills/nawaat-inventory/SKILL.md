---
name: nawaat-inventory
description: مخزون Nawaat — منتجات، variants، أكواد، استيراد CSV. استخدم عند العمل على inventory actions، product codes، variants، أو import.
---

# Nawaat Inventory

## هيكل الملفات

```
lib/actions/inventory/
├── product.actions.ts    # CRUD منتجات
├── product.queries.ts    # قراءة وبحث
├── price.actions.ts      # تسعير
├── unit.actions.ts       # وحدات المنتج
├── metadata.actions.ts   # tags, availability
├── new-tags.queries.ts   # منتجات جديدة
└── _shared.ts            # helpers (بدون 'use server')
lib/actions/colors.ts     # CRUD كتalog الألوان
```

## Product numbers

- **3 خانات** يدخلها المستخدم: `[A-Z0-9]{3}` — مثال: `001`, `A12`
- Config والتحقق: `lib/config/product-number.config.ts` + `validateProductNumber()` في `_shared.ts`
- فريد عالمياً على `Product.productNumber`
- رقم الصنف اليدوي (`itemNumber`) على `SKC` وليس `Product`

## Color catalog

- Model: `Color` — `code` (2–4 chars), `name`, `hexCode`, `order`, `isActive`
- Config: `lib/config/color.config.ts`
- Actions: `lib/actions/colors.ts`
- UI: `app/(dashboard)/colors/`
- SKC يرتبط إلزامياً بـ `colorId` — `@@unique([productId, colorId])`
- لون افتراضي: `ST` / "قياسي" (`DEFAULT_COLOR_CODE`)

## SKU codes

- صيغة: `{productNumber}-{color.code}[-{sizeLabel}]` — مثال: `001-RD`, `001-ST`, `001-RD-M`
- `buildSkuCode()` في `lib/actions/inventory/_shared.ts`

## Size presets

- `lib/config/variant-presets.ts` — SIZE/MATERIAL presets فقط (الألوان من جدول Color)

## Product attributes (كتalog + قيم SKC)

- Model: `ProductAttribute` — `code`, `name`, `description` (كتalog الأسماء)
- Actions: `lib/actions/product-attributes.ts`
- UI: `app/(dashboard)/product-attributes/`
- **قيم الصفات على SKC:** `SKC.attributes` (`Json` / `@db.JsonB`) — `{ [ProductAttribute.code]: string }`
- التحقق: `normalizeSkcAttributes()` في `lib/utils/skc-attributes.ts` — مفاتيح صارمة من الكتalog
- UI: `components/items/skc-attributes-form.tsx` في `SkcSheet` و `SkcEditSheet`

## Constraints

- `(name, brandId)` unique على Product
- `productNumber` unique
- `Color.code` و `Color.name` فريدان عالمياً
- بعد أي تعديل: `upsertProductToMeilisearch(id).catch(console.warn)`

## Import

- `lib/actions/import.ts` — CSV عبر papaparse
- `validateImportData()` ثم `importProductsBatch()`
- SKC افتراضي يربط `Color(ST)`

## Gallery & images

- `lib/actions/product-images.ts`
- `lib/actions/gallery.ts`
- `lib/actions/upload.ts`
- مسارات: `lib/utils/image-paths.ts`, `lib/config/image-storage.config.ts`

## Auth

كل exports تستخدم `requireAuth()` — لا أدوار.
