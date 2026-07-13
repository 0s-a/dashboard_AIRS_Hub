/** مصطلحات واجهة المخزون — لا تستخدم SKC/SKU/SPU أمام المستخدم */

import { formatProductAttributes } from '@/lib/utils/product-attributes'

export const INVENTORY_LABELS = {
    product: 'منتج',
    item: 'صنف',
    items: 'الأصناف',
    attributes: 'الصفات',
    uniformSize: 'قياس موحّد',
    itemCode: 'كود الصنف',
    itemNumber: 'رقم الصنف',
    addItem: 'إضافة صنف',
    editItem: 'تعديل الصنف',
    deleteItem: 'حذف الصنف',
    itemNotFound: 'الصنف غير موجود',
} as const

export function formatItemTitle(
    attrs: { name?: string; value: string }[] | null | undefined
): string {
    return formatProductAttributes(attrs) || '—'
}
