---
name: nawaat-inventory
description: مخزون Nawaat — منتج (SPU) وصنف (SKU)، صفات أصناف. استخدم عند العمل على products، items، أو item-attributes.
---

# Nawaat Inventory

## النموذج

| عربي | إنجليزي | الدور |
|------|---------|--------|
| **منتج** | `Product` | SPU — تعريف تجاري؛ `code`, `name`, `categoryId`, `brandId` |
| **صنف** | `Item` | SKU — وحدة قابلة للبيع؛ أسعار، وحدات، صور، صفات، طلبات |

```
Product (منتج)
  ├── brandId, categoryId
  └── items[] → Item (صنف)
        ├── itemNumber, name, slug, isAvailable
        ├── itemAttributes[], itemUnits[], itemPrices[], itemImages[]
        └── orderItems[]
```

## منتج (`Product`)

| الحقل | الوصف |
|-------|--------|
| `code` | كود فريد |
| `name` | اسم المنتج |
| `description` | وصف اختياري |
| `categoryId` | تصنيف إلزامي |
| `brandId` | براند إلزامي |

- لا أسعار / وحدات / صور / طلبات على المنتج
- حذف المنتج يُرفض إن وُجدت أصناف مرتبطة (`onDelete: Restrict`)
- UI: `app/(dashboard)/products/` · Actions: `lib/actions/products.ts`
- عند تعديل الاسم/البراند/التصنيف: `syncItemsByProductId(id)` لـ Meilisearch

## صنف (`Item`)

| الحقل | الوصف |
|-------|--------|
| `itemNumber` | رقم الصنف — فريد إلزامي |
| `name` | اسم الصنف (منفصل عن اسم المنتج دائماً) |
| `productId` | ربط بالمنتج — إلزامي |
| `description` | وصف اختياري |
| `alternativeNames` / `tags` | بحث ووسوم — على الصنف فقط |
| `isAvailable` | التوفر |

**البراند والتصنيف** من `item.product` (للعرض).

- UI: `app/(dashboard)/items/` (+ `/items/[id]`) · Actions: `lib/actions/items/`
- بعد أي تعديل: `upsertItemToMeilisearch(id).catch(console.warn)`

## صفات الأصناف

| الجدول | الدور |
|--------|--------|
| `ItemAttribute` | كتالوج: `code`, `name`, `examples` |
| `ItemAttributeValue` | وسيط: `itemId` + `attributeId` + `value`، `@@unique([itemId, attributeId])` |

- UI: `app/(dashboard)/product-attributes/` (تسمية عربية: صفات الأصناف)
- Actions: `lib/actions/item-attributes.ts`
- بذرة: `color`, `size`, `capacity`, `volume`, `weight`

## هيكل الملفات

```
lib/actions/products.ts       # CRUD منتجات (SPU)
lib/actions/items/
├── item.actions.ts           # CRUD أصناف + صفات الوسيط
├── item.queries.ts
├── price.actions.ts          # ItemPrice
├── unit.actions.ts           # ItemUnit
├── metadata.actions.ts       # tags, availability
├── new-tags.queries.ts
└── _shared.ts
lib/actions/item-attributes.ts
lib/actions/item-images.ts
```

## التسعير والوحدات

- `ItemPrice`: `(itemId, priceLabelId, unitId)` → `value` (عملة افتراضية)
- `ItemUnit`: وحدات البيع لكل صنف (+ باركود)

## Constraints

- `Product.code` unique؛ `Item.itemNumber` و `slug` unique
- `productId` إلزامي على الصنف
- لا استيراد CSV — أُزيل من النظام

## Auth

كل exports تستخدم `requireAuth()` — لا أدوار.
