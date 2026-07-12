-- Migration: add_unit_to_order_item_and_delivery_info

-- ربط OrderItem بجدول Unit
ALTER TABLE "OrderItem" ADD COLUMN "unitId" TEXT;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "OrderItem_unitId_idx" ON "OrderItem"("unitId");

-- إضافة حقل معلومات التوصيل لـ Order
ALTER TABLE "Order" ADD COLUMN "deliveryInfo" TEXT;
