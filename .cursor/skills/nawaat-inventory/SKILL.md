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
| `name` | اسم المنتج (نسخة احتياطية عند الوراثة) |
| `familyId` | اختياري — ربط بمنتج رئيسي (`ProductFamily`) |
| `inheritsFamilyName` | إن `true` → اسم العرض من العائلة |
| `brandId` | البراند |
| `categoryId` | التصنيف |
| `isAvailable` | التوفر |

**اسم العرض:** `resolveProductDisplayName()` في `lib/utils/product-display-name.ts` — يُرجع `family.name` عند الوراثة وإلا `Product.name`. يظهر كـ `displayName` في `serializeProduct` (عنوان مختصر لحوارات الحذف/التسعير فقط).

**تفريق الأسماء في UI:** الشاشات الرئيسية تعرض دائماً الحقلين منفصلين — **اسم المنتج** = `Product.name`، و**اسم المنتج الرئيسي** = `family.name` — حتى عند تفعيل الوراثة. لا تُدمج التسميتان في عنوان القائمة/التفاصيل.

## المنتجات الرئيسية (تجميع فقط)

| الجدول | الدور |
|--------|--------|
| `ProductFamily` | طبقة تجميع: `code`, `name`, `description` — **لا** أسعار/صور/طلبات |
| `Product.familyId` | ربط اختياري؛ `onDelete: SetNull` |

- البيع يبقى على `Product`
- UI: `app/(dashboard)/product-families/` · Actions: `lib/actions/product-families.ts`
- حذف العائلة يُرفض إن وُجدت منتجات مرتبطة
- الواجهة تفرّق دائماً بين اسم العائلة واسم المنتج؛ `displayName` ليس بديلاً عن إخفاء أحدهما

**لا يوجد:** Color، SKC، SKU، `sizeLabel`، `specKind`، `productNumber`

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
lib/utils/product-display-name.ts  # displayName / وراثة الاسم
```

## التسعير والوحدات

- `ProductPrice`: `(productId, priceLabelId, unitId)` → `value` (بالعملة الافتراضية؛ التحويل عبر exchangeRate)
- `ProductUnit`: وحدات البيع لكل منتج
- بعد أي تعديل: `upsertProductToMeilisearch(id).catch(console.warn)`

## Constraints

- `itemNumber` unique (إلزامي)
- `ProductAttribute.code` و `name` فريدان
- `ProductAttributeValue`: unique `(productId, attributeId)`

## Import CSV

أعمدة إلزامية: `name`, `itemNumber`, `categoryCode`, `brandCode`  
أعمدة صفات اختيارية: `color`, `size`, `capacity`, `volume`, `weight`

## Gallery & images

- `ProductImage.productId` — معرض لكل منتج
- مجلد التخزين: `itemNumber` أو `product.id`

## Auth

كل exports تستخدم `requireAuth()` — لا أدوار.
