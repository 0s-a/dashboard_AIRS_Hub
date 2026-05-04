-- Migration: إعادة هيكلة جداول الإعلانات
-- يُنفذ بعد prisma migrate dev لنقل البيانات الموجودة

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. نقل personIds[] → personFilters.manualIds
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE "Announcement"
SET "personFilters" = jsonb_set(
    COALESCE("personFilters"::jsonb, '{}'::jsonb),
    '{manualIds}',
    to_jsonb("personIds")
)
WHERE array_length("personIds", 1) > 0
  AND NOT ("personFilters"::jsonb ? 'manualIds');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. نقل productIds[] → productFilters.manualIds
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE "Announcement"
SET "productFilters" = jsonb_set(
    COALESCE("productFilters"::jsonb, '{}'::jsonb),
    '{manualIds}',
    to_jsonb("productIds")
)
WHERE array_length("productIds", 1) > 0
  AND NOT ("productFilters"::jsonb ? 'manualIds');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. نقل queueingProgress من batchProgress JSON
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE "Announcement"
SET "queueingProgress" = COALESCE(("batchProgress"::jsonb->>'queueingCount')::int, 0)
WHERE "batchProgress" IS NOT NULL
  AND "batchProgress"::text != '{}';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. تحديث AnnouncementMessage.personId — تعيين NOT NULL
--    (السجلات التي personId = NULL يجب حذفها أو تصحيحها أولاً)
-- ═══════════════════════════════════════════════════════════════════════════════
DELETE FROM "AnnouncementMessage"
WHERE "personId" IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. إضافة productIds لكل AnnouncementMessage الحالية
--    (بما أن المنتجات هي نفسها لكل رسائل الحملة، ننسخ من productIds/productFilters)
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE "AnnouncementMessage" am
SET "productIds" = COALESCE(
    (SELECT to_jsonb(a."productIds") FROM "Announcement" a WHERE a.id = am."announcementId"),
    '[]'::jsonb
)
WHERE am."productIds" = '[]'::jsonb;
