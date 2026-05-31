-- =====================================================
-- Migration: add_whatsapp_groups
-- Adds WhatsappGroup and WhatsappGroupSupervisor tables
-- =====================================================

-- WhatsappGroup: ربط عميل واحد بمجموعة واتساب
CREATE TABLE "WhatsappGroup" (
    "id"          TEXT NOT NULL,
    "groupNumber" TEXT,
    "name"        TEXT NOT NULL,
    "notes"       TEXT,
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "customerId"  TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappGroup_pkey" PRIMARY KEY ("id")
);

-- قيد الفرادة: عميل واحد = مجموعة واحدة
CREATE UNIQUE INDEX "WhatsappGroup_groupNumber_key" ON "WhatsappGroup"("groupNumber");
CREATE UNIQUE INDEX "WhatsappGroup_customerId_key"  ON "WhatsappGroup"("customerId");
CREATE INDEX "WhatsappGroup_isActive_idx"           ON "WhatsappGroup"("isActive");

-- WhatsappGroupSupervisor: جدول وسيط بسيط
CREATE TABLE "WhatsappGroupSupervisor" (
    "groupId"      TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,

    CONSTRAINT "WhatsappGroupSupervisor_pkey" PRIMARY KEY ("groupId","supervisorId")
);

-- Foreign keys
ALTER TABLE "WhatsappGroup"
    ADD CONSTRAINT "WhatsappGroup_customerId_fkey"
    FOREIGN KEY ("customerId")
    REFERENCES "Customer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsappGroupSupervisor"
    ADD CONSTRAINT "WhatsappGroupSupervisor_groupId_fkey"
    FOREIGN KEY ("groupId")
    REFERENCES "WhatsappGroup"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsappGroupSupervisor"
    ADD CONSTRAINT "WhatsappGroupSupervisor_supervisorId_fkey"
    FOREIGN KEY ("supervisorId")
    REFERENCES "Supervisor"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
