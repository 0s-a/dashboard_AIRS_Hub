-- AddUniqueConstraint: AnnouncementMessage (announcementId, personId)
-- Idempotency guard — prevents duplicate records for the same person in the same campaign.
-- If duplicates already exist, delete the extra ones first (keep lowest messageIndex).
DELETE FROM "AnnouncementMessage"
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY "announcementId", "personId" ORDER BY "messageIndex") AS rn
        FROM "AnnouncementMessage"
    ) t
    WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnnouncementMessage_announcementId_personId_key"
ON "AnnouncementMessage"("announcementId", "personId");
