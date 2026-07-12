# Nawaat CRM

نظام إدارة متجر وعلاقات عملاء (CRM) بالعربية — يشغّل لوحة تحكم إدارية وبوت واتساب عبر API آمن.

## الميزات

- **المخزون**: منتجات، variants، تصنيفات، براندات، استيراد CSV، Meilisearch
- **التسعير**: PriceLabel × عملة × وحدة — تسعيرة ديناميكية لكل عميل
- **الطلبات**: دورة حياة كاملة مع snapshot للسعر، فواتير قابلة للطباعة
- **CRM**: عملاء، مشرفون
- **البوت**: API محمي بـ `x-api-key` للبحث والتسعير والطلبات

## التقنيات

| الطبقة | التقنية |
|--------|---------|
| Frontend | Next.js 16, React 19, Tailwind, shadcn/ui |
| Backend | Server Actions, Prisma, PostgreSQL |
| Search | Meilisearch |
| Deploy | Docker |

## البدء السريع (Docker)

```bash
cp .env.example .env.development   # ثم عبّئ القيم
npm run up                         # postgres + rabbitmq + meilisearch + app
npm run db:migrate
npm run db:seed                    # اختياري
```

افتح `http://localhost:3000`

### أوامر مفيدة

| الأمر | الوظيفة |
|-------|---------|
| `npm run down` | إيقاف الخدمات |
| `npm run rebuild` | إعادة بناء وتشغيل الحاويات |
| `npm run logs` | سجلات جميع خدمات التطوير |
| `npm run logs:app` | سجلات التطبيق |
| `npm run shell` | shell داخل الحاوية |
| `npm run db:generate` | توليد Prisma client بعد تغيير schema |
| `npm run lint` | ESLint |
| `npm run build` | بناء الإنتاج |
| `npm run reset:dev` | إعادة ضبط كاملة — **يحذف بيانات قاعدة البيانات والخدمات** |

> قائمة أوامر كاملة (تطوير، إنتاج، prisma): راجع [AGENTS.md](AGENTS.md).

**منافذ التطوير:** app `3000`, postgres `5430`, meilisearch `7700`, rabbitmq `5672`

## التسعير

- كل عميل له **PriceLabel** (مسمى تسعير) اختياري
- `POST /api/v1/bot/check-price` يحسب السعر حسب `customer.priceLabelId`

## API البوت

جميع طلبات `/api/v1/bot/*` تتطلب:

```
x-api-key: <BOT_API_KEY>
```

راجع `app/api-docs` أو `public/openapi.json` للتوثيق الكامل.

## للمطورين والوكلاء

- **[AGENTS.md](AGENTS.md)** — تعليمات Cursor والوكلاء
- **[PROJECT.md](PROJECT.md)** — خريطة معمارية
- **`.cursor/rules/`** — قواعد المشروع
- **`.cursor/skills/`** — مهارات متخصصة

## المصادقة

- لوحة التحكم: JWT cookie — كل المستخدمين لهم نفس الصلاحيات (لا أدوار)
- البوت: `x-api-key`
- Webhooks: `N8N_WEBHOOK_SECRET`
