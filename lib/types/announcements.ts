/**
 * lib/types/announcements.ts
 *
 * Shared type definitions for the Announcement system.
 * Located outside 'use server' to avoid bundler type-erasure issues.
 */

// ─── Throttle / Rate-Limit Config ────────────────────────────────────────────

export interface ThrottleConfig {
    delayBetweenSeconds: number          // 0 = no delay
    sendWindowStart:     string | null   // "09:00" or null
    sendWindowEnd:       string | null   // "18:00" or null
}

export const DEFAULT_THROTTLE: ThrottleConfig = {
    delayBetweenSeconds: 0,
    sendWindowStart:     null,
    sendWindowEnd:       null,
}

// ── Advanced audience builder types ──────────────────────────────────────────

export type ConditionType = 'tag' | 'exclude_tag'

export interface AudienceCondition {
    id:    string        // client-side UUID
    type:  ConditionType
    value: string        // tagName
    label: string        // human-readable
}

/** One filter group — conditions inside are ORed together */
export interface FilterGroup {
    id:         string
    conditions: AudienceCondition[]
}

/**
 * Logic: AND across groups, OR inside each group.
 * Example: (group=VIP) AND (tag=عطور)
 */
export interface CustomerFilters {
    all?:          boolean

    tags?:         string[]
    excludeTags?:  string[]
    excludeIds?:   string[]
    isActive?:     boolean
    filterGroups?: FilterGroup[]   // Advanced builder mode
    manualIds?:    string[]        // اختيار يدوي لأشخاص محددين
    [key: string]: unknown
}


export interface ProductFilters {
    all?:         boolean
    categoryIds?: string[]
    tags?:        string[]
    excludeTags?: string[]
    manualIds?:   string[]         // اختيار يدوي لمنتجات محددة
    [key: string]: unknown
}

// ── Minimal customer data needed for rendering ──────────────────────────────────
// contacts are resolved internally (whatsappNumber extracted), NOT exported raw.

export interface CustomerPayload {
    id:            string
    name:          string | null
    priceLabelIds: string[]               // أسعار المخصصة لهذا العميل (CustomerPriceLabel)
    contacts:      Array<{ type: string; value: string }>  // internal only — extracted before publishing
}

// ── Minimal product data needed for rendering ─────────────────────────────────

export interface ProductPricePayload {
    priceLabelId: string          // ID التسعيرة — للمطابقة مع priceLabels العميل
    label:        string          // e.g. "سعر الجملة"
    value:        string          // formatted number e.g. "1500"
    currency:     string          // e.g. "ريال يمني"
    symbol:       string          // e.g. "ر.ي"
    unit:         string          // e.g. "قطعة"
    isDefaultCurrency: boolean    // هل هذا السعر بالعملة الافتراضية
}

export interface ProductPayload {
    id:          string
    name:        string
    itemNumber:  string
    brand:       string | null                 // العلامة التجارية
    description: string | null                 // الوصف
    category:    string | null                 // الفئة
    tags:        string[]                      // الوسوم
    variants:    Array<{ id: string; name: string; hex: string | null; variantNumber: string; price: string | null }>
    prices:      ProductPricePayload[]         // كل الأسعار المرتبطة بالمنتج
    units:       Array<{ name: string; isBase: boolean; conversionFactor: number; barcode: string | null }>
    imageUrl:    string | null                 // الصورة الأساسية (primary)
    allImages:   string[]                      // كل صور المنتج
}

// ── Rendered message — the ONLY thing published to RabbitMQ body ──────────────
// whatsappNumber is NOT here — it goes to AMQP message headers only.

export interface RenderedMessage {
    customerName:   string | null
    customerId:     string
    messageBody:  string                 // Formatted text after template interpolation
    imageUrls:    string[]               // Product image URLs (text_image templates)
    templateType: 'text' | 'text_image'
}

// ── Template structure (matches MessageTemplate model) ───────────────────────

export interface MessageTemplateData {
    id:           string
    name:         string
    type:         'text' | 'text_image'
    sendMode:     'combined' | 'per_product'   // combined = one msg all products | per_product = one msg per product
    bodyTemplate: string
    productBlock: string
    separator:    string
    isDefault:    boolean
}

