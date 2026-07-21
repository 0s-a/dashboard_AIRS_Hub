---
name: nawaat-inventory
description: مخزون Nawaat — منتجات مسطّحة، صفات منتج، استيراد CSV. استخدم عند العمل على inventory actions، products، أو import.
---

# Nawaat Inventory

## نموذج المنتج (مسطّح)

كل صف في `Product` = منتج قابل للبيع واحد:

| الحقل | الوصف |
|-------|--------|
| `itemNumber` | رقم الصنف — يدخله المستخدم (فريد) |
| `name` | اسم المنتج (دائماً مستقل) |
| `familyId` | **إلزامي** — ربط بمنتج رئيسي (`ProductFamily`) |
| `brandId` | البراند (يبقى على المنتج) |
| `isAvailable` | التوفر |

**التصنيف** ليس على `Product` — يُؤخذ من `ProductFamily.categoryId` ويُسرَّل كـ `product.category` للعرض.

**الأسماء:** لا وراثة. `Product.name` و `family.name` منفصلان دائماً. `displayName` في التسلسل/Bot = مرادف لـ `name` فقط (توافق API).

## المنتجات الرئيسية (تجميع + تصنيف)

| الجدول | الدور |
|--------|--------|
| `ProductFamily` | تجميع + `categoryId` إلزامي — **لا** أسعار/صور/طلبات |
| `Product.familyId` | إلزامي؛ `onDelete: Restrict` |

- البيع يبقى على `Product`
- UI: `app/(dashboard)/product-families/` · Actions: `lib/actions/product-families.ts`
- حذف العائلة يُرفض إن وُجدت منتجات مرتبطة
- تغيير تصنيف العائلة يظهر على كل أصنافها

**لا يوجد:** Color، SKC، SKU، `sizeLabel`، `specKind`، `productNumber`، `inheritsFamilyName`، `Product.categoryId`

## صفات المنتج

| الجدول | الدور |
|--------|--------|
| `ProductAttribute` | كتالوج: `code`, `name`, `examples` (JSON string[]) |
| `ProductAttributeValue` | وسيط: `productId` + `attributeId` + `value`، `@@unique([productId, attributeId])` |

- المنتج قد يكون بلا صفات أو بعدة صفات
- كل صفة مرة واحدة فقط لكل منتج
- بذرة أساسية: `color`, `size`, `capacity`, `volume`, `weight`
- UI كتالوج: `app/(dashboard)/product-attributes/`
- Actions: `lib/actions/product-attributes.ts`

## هيكل الملفات

```
lib/actions/inventory/
├── product.actions.ts    # CRUD منتجات + استبدال صفات الوسيط
├── product.queries.ts    # قراءة وبحث
├── price.actions.ts      # تسعير (productId)
├── unit.actions.ts       # وحدات المنتج
├── metadata.actions.ts   # tags, availability
├── new-tags.queries.ts   # منتجات جديدة
└── _shared.ts            # helpers + serialize
lib/actions/product-attributes.ts  # كتالوج الصفات
lib/actions/product-families.ts    # المنتجات الرئيسية (تجميع)
lib/actions/product-images.ts
lib/actions/import.ts
lib/utils/product-attributes.ts    # formatProductAttributes
```

## التسعير والوحدات

- `ProductPrice`: `(productId, priceLabelId, unitId)` → `value` (بالعملة الافتراضية؛ التحويل عبر exchangeRate)
- `ProductUnit`: وحدات البيع لكل منتج
- بعد أي تعديل: `upsertProductToMeilisearch(id).catch(console.warn)`

## Constraints

- `itemNumber` unique (إلزامي)
- `familyId` إلزامي؛ `ProductFamily.categoryId` إلزامي
- `ProductAttribute.code` و `name` فريدان
- `ProductAttributeValue`: unique `(productId, attributeId)`

## Import CSV

أعمدة إلزامية: `name`, `itemNumber`, `familyCode`, `brandCode`  
التصنيف من العائلة (لا `categoryCode` على صف المنتج)  
أعمدة صفات اختيارية: `color`, `size`, `capacity`, `volume`, `weight`

## Gallery & images

- `ProductImage.productId` — معرض لكل منتج
- مجلد التخزين: `itemNumber` أو `product.id`

## Auth

كل exports تستخدم `requireAuth()` — لا أدوار.
