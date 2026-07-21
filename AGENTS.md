# Nawaat CRM — Agent Instructions

تعليمات للوكلاء الذين يعملون على هذا المستودع. للبشر: راجع README.md.

## نظرة سريعة

- **Nawaat CRM**: Next.js 16 + Prisma + PostgreSQL + Meilisearch
- واجهة عربية RTL
- Server Actions في `lib/actions/`
- Bot API في `app/api/v1/bot/` (محمي بـ `x-api-key`)
- Dashboard API يستخدم `requireDashboardAuth()` من `lib/route-auth.ts`
- `middleware.ts` يحمي لوحة التحكم — redirect إلى `/login` بدون JWT

## نموذج المصادقة

- **لا نظام أدوار** — كل مستخدم مسجّل = صلاحيات كاملة
- JWT cookie (`auth-token`) عبر `middleware.ts` + `requireAuth()` في Server Actions
- ثلاث طبقات API:
  1. Dashboard: JWT (`requireDashboardAuth`)
  2. Bot: `x-api-key` (`validateApiKey`)
- استثناءات عامة: `getStoreSettings()`, `getOrderById()`, `getDefaultCurrency()` (login + فاتورة)

## أوامر التطوير

### Next.js / جودة الكود

| الأمر | الوظيفة |
|-------|---------|
| `npm run dev` | تشغيل Next.js في وضع التطوير (يُشغَّل تلقائياً داخل حاوية Docker) |
| `npm run build` | بناء الإنتاج |
| `npm run start` | تشغيل بناء الإنتاج |
| `npm run lint` | ESLint |

### Docker — تطوير

| الأمر | الوظيفة |
|-------|---------|
| `npm run up` | تشغيل postgres + rabbitmq + meilisearch + nextjs |
| `npm run down` | إيقاف الخدمات |
| `npm run rebuild` | إعادة بناء وتشغيل الحاويات |
| `npm run logs` | سجلات جميع خدمات التطوير |
| `npm run logs:app` | سجلات حاوية التطبيق فقط |
| `npm run shell` | shell داخل حاوية nextjs |
| `npm run reset:dev` | إيقاف مع حذف volumes ثم إعادة التشغيل — **يحذف بيانات postgres و rabbitmq و meilisearch** |

### Prisma — داخل حاوية التطوير

يتطلب `npm run up` أولاً (حاوية `nawaat_nextjs_dev`).

| الأمر | الوظيفة |
|-------|---------|
| `npm run db:migrate` | `prisma migrate dev` — إنشاء وتطبيق migrations |
| `npm run db:generate` | `prisma generate` — بعد كل تغيير في schema |
| `npm run db:seed` | بذر بيانات التطوير |
| `npm run db:push` | `prisma db push` — **تطوير فقط**؛ بديل سريع لـ migrate، ممنوع في الإنتاج |

### Docker — إنتاج

| الأمر | الوظيفة |
|-------|---------|
| `npm run prod:deploy` | بناء وتشغيل بيئة الإنتاج |
| `npm run prod:down` | إيقاف بيئة الإنتاج |
| `npm run prod:logs` | سجلات خدمات الإنتاج |
| `npm run prod:shell` | shell داخل حاوية الإنتاج (`nawaat_nextjs`) |
| `npm run prod:migrate` | `prisma migrate deploy` يدوياً — اختياري؛ الحاوية تشغّله تلقائياً عند البدء |

### اختبارات

`npm test` placeholder حالياً — لا يوجد إطار اختبار (Jest/Vitest/Playwright) في المشروع.

**منافذ التطوير:** app `3000`, postgres `5430`, meilisearch `7700`, rabbitmq `5672` / `15672`.

## بنية المشروع

| المسار | الدور |
|--------|-------|
| `app/(dashboard)/` | صفحات لوحة التحكم |
| `app/api/v1/bot/` | Bot API (x-api-key) |
| `app/api/v1/bot/orders/` | Orders Bot API (`x-api-key`) — مصدر HTTP واحد |
| `lib/orders/` | منطق Bot Orders API (service, snapshot, schemas) |
| `lib/customers/` | منطق Bot Customers API |
| `lib/bot/` | product-search، product-price، product-image، notifications |
| `public/openapi.json` | عقد Bot API المنشور |
| `lib/actions/` | منطق الأعمال (Server Actions) |
| `lib/api-utils.ts` | validateApiKey, apiSuccess, apiError |
| `lib/action-utils.ts` | safeAction, safeActionWithRevalidation |
| `lib/order-utils.ts` | resolveItemPrice |
| `lib/meilisearch.ts` | عميل Meilisearch |
| `lib/prisma-includes.ts` | Prisma include/select constants |
| `prisma/schema.prisma` | مصدر الحقيقة للبيانات |
| `app/(dashboard)/product-attributes/` | كتالوج صفات المنتج (`ProductAttribute`) |
| `app/(dashboard)/product-families/` | المنتجات الرئيسية (`ProductFamily`) — تجميع فقط |
| `lib/actions/product-attributes.ts` | CRUD صفات المنتج |
| `lib/actions/product-families.ts` | CRUD المنتجات الرئيسية |

## قواعد التسعير

- التسعير عبر **PriceLabel** وليس tiers ثابتة (RETAIL/WHOLESALE/VIP في README قديم — تجاهله)
- `ProductPrice` = مفتاح فريد: `productId + priceLabelId + unitId` (بالعملة الافتراضية دائماً)
- التحويل لعملات أخرى عبر `exchangeRate` في `lib/currency-utils.ts` (`convertFromDefault`)
- كل عميل له `priceLabelId` اختياري + عملات عبر `CustomerCurrency` (تفضيل عرض)
- عند إنشاء طلب: **snapshot إلزامي** في `OrderItem`:
 - `unitPrice`, `currencyId`, `priceLabelId` (بعد التحويل إن لزم)
- عرض السعر: `resolveItemPrice()` في `lib/order-utils.ts`
 1. snapshot (unitPrice) — الأولوية
 2. تسعيرة العميل من ProductPrice
 3. التسعيرة الافتراضية (isDefault)
 4. أي سعر
- Bot product price: يفلتر بـ `customer.priceLabelId` ويحوّل لعملة مطلوبة أو عملات العميل (`GET /api/v1/bot/products/price`)

## قواعد الطلبات

- الحالات: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`
- مصدر الحقيقة: `lib/order-constants.ts`
- `updateOrder` يرفض items فارغة
- `deliveryInfo` نص حر لبيانات التوصيل
- فاتورة: `app/invoice/[id]/page.tsx`

## أنماط الكود

### Server Actions

```typescript
export const getX = () => safeAction(() => prisma.x.findMany(), 'رسالة خطأ')

export const createX = (data) =>
  safeActionWithRevalidation(() => prisma.x.create({ data }), '/path', 'رسالة خطأ')
```

- `'use server'` في أعلى كل ملف action
- `requireAuth()` للعمليات الحساسة — لا أدوار
- استثناءات: `auth.ts`, `getStoreSettings()`, `getOrderById()`, `getDefaultCurrency()`
- تعديلات المخزون: `upsertProductToMeilisearch(id).catch(console.warn)`

### Bot API

```typescript
const authError = validateApiKey(req)
if (authError) return authError
return apiSuccess(data) // أو apiError(message, status, { code })
```

## Bot API Contract

- **Bot = HTTP** تحت `app/api/v1/bot/**` (`x-api-key`)؛ **Dashboard CRUD = Server Actions**؛ Dashboard HTTP = Meilisearch ops؛ بحث منتجات البوت = Meili + Prisma fallback
- مصدر الحقيقة للمسارات: الكود — و`public/openapi.json` مرآة يدوية (لا `/persons`)
- Route رفيع؛ المنطق في `lib/orders/`, `lib/customers/`, `lib/bot/`
- Envelope: `apiSuccess` / `apiError` مع `code` إنجليزي ورسالة عربية
- الهاتف: `normalizePhonePatterns` / `validatePhoneInput`؛ الصفحات: `parsePagination`
- قواعد مفصّلة: `.cursor/rules/bot-api.mdc` · Skill: `nawaat-bot-api`

## ما يجب تجنّبه

- لا تضع أسراراً في الملفات المُلتزَم بها
- لا تعتمد على README للتقنيات الحالية
- لا تستخدم `db push --accept-data-loss` على بيانات حقيقية
- Meilisearch: الأخطاء تُعالَج بصمت — لا تُعطّل التطبيق
- أقل diff ممكن — لا تعيد هيكلة ملفات غير مطلوبة
- Server Actions في `lib/actions/` — لا منطق أعمال في components

## سير عمل PR

1. شغّل Bugbot review على تغييرات الفرع (`branch changes`)
2. أصلح findings الصحيحة
3. `npm run lint` و `npm run build`
4. `gh pr create` مع body يتضمن Test plan

## Skills و Rules

- Skills: `nawaat-pricing`, `nawaat-orders`, `nawaat-meilisearch`, `nawaat-inventory`, `nawaat-bot-api`
- Rules: `.cursor/rules/*.mdc`
- Frontend: `frontend-architecture`, `frontend-design`, `frontend-patterns`, `frontend-state`
- خريطة معمارية: [PROJECT.md](PROJECT.md)
