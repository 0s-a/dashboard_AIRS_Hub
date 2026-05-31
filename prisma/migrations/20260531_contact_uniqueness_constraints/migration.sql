-- DropIndex: remove old composite uniqueness (type + value)
DROP INDEX IF EXISTS "contact_global_unique";

-- CreateIndex: global uniqueness on value alone (phone number can never repeat)
CREATE UNIQUE INDEX "contact_value_unique" ON "Contact"("value");

-- CreateIndex: one contact of each type per customer
CREATE UNIQUE INDEX "contact_customer_type_unique" ON "Contact"("customerId", "type");

-- CreateIndex: one contact of each type per supervisor
CREATE UNIQUE INDEX "contact_supervisor_type_unique" ON "Contact"("supervisorId", "type");
