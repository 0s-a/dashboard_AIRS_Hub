/** مصطلحات واجهة المخزون — لا تستخدم SKC/SKU/SPU أمام المستخدم */

export const INVENTORY_LABELS = {
    product: 'منتج',
    item: 'صنف',
    items: 'الأصناف',
    color: 'لون',
    uniformSize: 'قياس موحّد',
    itemCode: 'كود الصنف',
    itemNumber: 'رقم الصنف',
    addItem: 'إضافة صنف',
    editItem: 'تعديل الصنف',
    deleteItem: 'حذف الصنف',
    itemNotFound: 'الصنف غير موجود',
    colorUnavailable: 'اللون غير متوفر — لا يمكن بيع هذا الصنف',
    sharedImagesNote: 'الصور مشتركة لجميع أصناف نفس اللون',
} as const

export {
    getSpecLabel,
    getSpecPluralLabel,
    getAddSpecLabel,
    getSiblingSpecsLabel,
    formatSpecValue,
    formatItemTitleWithSpec as formatItemTitle,
} from '@/lib/config/sku-spec.config'
