/**
 * lib/utils/message-builder.ts
 *
 * Transforms a message template + customer data + product list into a
 * ready-to-send rendered message for n8n/WhatsApp.
 *
 * Supported variables:
 *   Body:     {{customer.name}}, {{customer.id}}, {{customer.whatsapp}}, {{customer.group}}, {{products}}
 *   Product:  {{product.name}}, {{product.itemNumber}}, {{product.variants}}, {{product.image}}
 */

import type {
    CustomerPayload,
    ProductPayload,
    RenderedMessage,
    MessageTemplateData,
} from '@/lib/types/announcements'

// ─── Default Templates (used when no template is selected) ───────────────────

export const DEFAULT_TEXT_TEMPLATE: Omit<MessageTemplateData, 'id'> = {
    name:         'النموذج الافتراضي',
    type:         'text',
    sendMode:     'combined',
    bodyTemplate: `مرحباً {{customer.name}} 👋

لدينا عروض جديدة خصيصاً لك:

{{products}}

للطلب تواصل معنا مباشرة ✨`,
    productBlock: `📦 *{{product.name}}*
رقم المنتج: {{product.itemNumber}}
الألوان: {{product.variants}}`,
    separator:    '\n\n',
    isDefault:    true,
}

export const DEFAULT_IMAGE_TEMPLATE: Omit<MessageTemplateData, 'id'> = {
    name:         'نموذج مع صور',
    type:         'text_image',
    sendMode:     'combined',
    bodyTemplate: `مرحباً {{customer.name}} 👋

إليك أحدث المنتجات المتوفرة:

{{products}}

للطلب تواصل معنا مباشرة ✨`,
    productBlock: `📦 *{{product.name}}*
رقم المنتج: {{product.itemNumber}}
الألوان: {{product.variants}}
🖼 {{product.image}}`,
    separator:    '\n---\n',
    isDefault:    false,
}

// ─── Variable Definitions (for the UI variable picker) ───────────────────────

export const BODY_VARIABLES = [
    { key: '{{customer.name}}',     label: 'اسم العميل',     icon: '👤' },
    { key: '{{customer.id}}',       label: 'معرّف العميل',   icon: '🆔' },
    { key: '{{customer.whatsapp}}', label: 'رقم الواتساب',   icon: '📱' },
    { key: '{{products}}',        label: 'كتلة المنتجات',  icon: '📦' },
] as const

export const PRODUCT_VARIABLES = [
    // ─ أساسي ──────────────────────────────────────────────────────
    { key: '{{product.name}}',        label: 'اسم المنتج',          icon: '📦', group: 'أساسي' },
    { key: '{{product.itemNumber}}',  label: 'رقم المنتج',          icon: '#️⃣', group: 'أساسي' },
    { key: '{{product.brand}}',       label: 'العلامة التجارية',    icon: '🏷️', group: 'أساسي' },
    { key: '{{product.category}}',    label: 'الفئة',                 icon: '📂', group: 'أساسي' },
    { key: '{{product.description}}', label: 'الوصف',                 icon: '📝', group: 'أساسي' },
    { key: '{{product.tags}}',        label: 'الوسوم',              icon: '🏷️', group: 'أساسي' },
    // ─ متغيرات ────────────────────────────────────────────────
    { key: '{{product.variants}}',    label: 'المتغيرات (أسماء)',   icon: '🎨', group: 'متغيرات' },
    { key: '{{product.variantNumbers}}', label: 'أرقام المتغيرات',   icon: '#️⃣', group: 'متغيرات' },
    { key: '{{product.variantCount}}', label: 'عدد المتغيرات',   icon: '🔢', group: 'متغيرات' },
    // ─ أسعار ─────────────────────────────────────────────────
    { key: '{{product.prices}}',      label: 'كل الأسعار',          icon: '💰', group: 'أسعار' },
    { key: '{{product.price1}}',      label: 'السعر الأول',          icon: '💵', group: 'أسعار' },
    { key: '{{product.price2}}',      label: 'السعر الثاني',          icon: '💵', group: 'أسعار' },
    // ─ وحدات ─────────────────────────────────────────────────
    { key: '{{product.units}}',       label: 'وحدات البيع',          icon: '📦', group: 'وحدات' },
    { key: '{{product.baseUnit}}',    label: 'الوحدة الأساسية',       icon: '📦', group: 'وحدات' },
    // ─ صور ────────────────────────────────────────────────────
    { key: '{{product.image}}',       label: 'الصورة الرئيسية',       icon: '🖼', group: 'صور' },
    { key: '{{product.images}}',      label: 'كل الصور',            icon: '🖼', group: 'صور' },
] as const

// ─── Renderer ─────────────────────────────────────────────────────────────────

/**
 * Resolves the prices to show for a product given the customer's assigned price labels.
 *
 * Priority chain:
 *   1. Prices whose priceLabelId matches one of the customer's assigned labels
 *   2. Prices in the default currency (isDefaultCurrency === true)
 *   3. All prices (last resort)
 */
function resolveCustomerPrices(
    allPrices: ProductPayload['prices'],
    priceLabelIds: string[]
): ProductPayload['prices'] {
    // 1 — Customer has assigned labels → show only matching ones
    if (priceLabelIds.length > 0) {
        const matched = allPrices.filter(p => priceLabelIds.includes(p.priceLabelId))
        if (matched.length > 0) return matched
    }
    // 2 — Fallback: default currency prices
    const defaultCurrencyPrices = allPrices.filter(p => p.isDefaultCurrency)
    if (defaultCurrencyPrices.length > 0) return defaultCurrencyPrices
    // 3 — Last resort: all prices
    return allPrices
}

/**
 * Renders a single product block by replacing all product-level variables.
 * Personalizes prices based on priceLabelIds assigned to the customer.
 */
function renderProductBlock(
    block: string,
    product: ProductPayload,
    priceLabelIds: string[]
): string {
    // ─ Variants ──────────────────────────────────────────────────────
    const variantNames   = product.variants.map(v => v.name).join('، ')
    const variantNumbers = product.variants.map(v => v.variantNumber).join('، ')
    const variantCount   = String(product.variants.length)

    // ─ Prices (personalized) ─────────────────────────────────────────
    const prices     = resolveCustomerPrices(product.prices, priceLabelIds)
    const pricesText = prices.length
        ? prices.map(p => `${p.label}: ${p.value} ${p.symbol} / ${p.unit}`).join('\n')
        : '—'
    const price1 = prices[0] ? `${prices[0].value} ${prices[0].symbol}` : '—'
    const price2 = prices[1] ? `${prices[1].value} ${prices[1].symbol}` : '—'

    // ─ Units ───────────────────────────────────────────────────────
    const unitsText = product.units.map(u => u.name).join('، ') || '—'
    const baseUnit  = product.units.find(u => u.isBase)?.name ?? '—'

    // ─ Images ──────────────────────────────────────────────────────
    const allImagesText = product.allImages.join('\n') || ''

    return block
        // ─ Basic ─
        .replace(/\{\{product\.name\}\}/g,        product.name)
        .replace(/\{\{product\.itemNumber\}\}/g,  product.itemNumber)
        .replace(/\{\{product\.brand\}\}/g,       product.brand       ?? '—')
        .replace(/\{\{product\.category\}\}/g,    product.category    ?? '—')
        .replace(/\{\{product\.description\}\}/g, product.description ?? '—')
        .replace(/\{\{product\.tags\}\}/g,        product.tags.join('، ') || '—')
        // ─ Variants ─
        .replace(/\{\{product\.variants\}\}/g,       variantNames   || '—')
        .replace(/\{\{product\.variantNumbers\}\}/g, variantNumbers || '—')
        .replace(/\{\{product\.variantCount\}\}/g,   variantCount)
        // ─ Prices (personalized) ─
        .replace(/\{\{product\.prices\}\}/g, pricesText)
        .replace(/\{\{product\.price1\}\}/g, price1)
        .replace(/\{\{product\.price2\}\}/g, price2)
        // ─ Units ─
        .replace(/\{\{product\.units\}\}/g,    unitsText)
        .replace(/\{\{product\.baseUnit\}\}/g, baseUnit)
        // ─ Images ─
        .replace(/\{\{product\.image\}\}/g,  product.imageUrl   ?? '')
        .replace(/\{\{product\.images\}\}/g, allImagesText)
}


/**
 * Renders a body template by replacing customer-level variables and the {{products}} block.
 */
function renderBody(
    bodyTemplate: string,
    customer:       CustomerPayload,
    productsText: string
): string {
    const whatsapp = customer.contacts.find(c => c.type === 'whatsapp')?.value
                  ?? customer.contacts.find(c => c.type === 'phone')?.value
                  ?? ''
    return bodyTemplate
        .replace(/\{\{customer\.name\}\}/g,     customer.name ?? 'عميل')
        .replace(/\{\{customer\.id\}\}/g,       customer.id)
        .replace(/\{\{customer\.whatsapp\}\}/g, whatsapp)
        .replace(/\{\{products\}\}/g,         productsText)
}

/**
 * Main entry point: combines template + customer + products into a RenderedMessage.
 *
 * NOTE: whatsappNumber is NOT included in the returned RenderedMessage.
 * It is extracted separately in publishMessage() and placed in AMQP headers.
 */
export function renderMessage(
    template: Pick<MessageTemplateData, 'bodyTemplate' | 'productBlock' | 'separator' | 'type'>,
    customer:   CustomerPayload,
    products: ProductPayload[],
): RenderedMessage {
    // 1. Render each product block (with personalized pricing)
    const productBlocks = products.map(p => renderProductBlock(template.productBlock, p, customer.priceLabelIds))
    const productsText  = productBlocks.join(template.separator)

    // 2. Render the body
    const messageBody = renderBody(template.bodyTemplate, customer, productsText)

    // 3. Collect image URLs for text_image type
    const imageUrls = template.type === 'text_image'
        ? products.map(p => p.imageUrl).filter((u): u is string => !!u)
        : []

    return {
        customerName:   customer.name,
        customerId:     customer.id,
        messageBody,
        imageUrls,
        templateType: template.type as 'text' | 'text_image',
    }
}

/**
 * Render one or more messages depending on sendMode:
 *   - "combined"    → one message with all products (same as renderMessage)
 *   - "per_product" → one message per product (N messages for N products)
 *
 * Returns an array so the caller can publish each element as a separate queue message.
 */
export function renderMessages(
    template: Pick<MessageTemplateData, 'bodyTemplate' | 'productBlock' | 'separator' | 'type' | 'sendMode'>,
    customer:   CustomerPayload,
    products: ProductPayload[],
): RenderedMessage[] {
    if (template.sendMode === 'per_product') {
        // Each product → one standalone message (no separator, single product block)
        return products.map(product => renderMessage(template, customer, [product]))
    }
    // Default: all products combined in one message
    return [renderMessage(template, customer, products)]
}

/**
 * Extracts the WhatsApp/phone number for AMQP message routing.
 * Called separately — NOT embedded in the message body.
 */
export function extractWhatsappNumber(customer: CustomerPayload): string | null {
    return customer.contacts.find(c => c.type === 'whatsapp')?.value
        ?? customer.contacts.find(c => c.type === 'phone')?.value
        ?? null
}



// ─── Preview Helper (for UI with sample data) ─────────────────────────────────

const SAMPLE_CUSTOMER: CustomerPayload = {
    id:            'sample-001',
    name:          'أحمد محمد',
    priceLabelIds: ['label-wholesale'],   // سعر الجملة — لاختبار المعاينة
    contacts:      [{ type: 'whatsapp', value: '967771234567' }],
}

const SAMPLE_PRODUCTS: ProductPayload[] = [
    {
        id:          'prod-001',
        name:        'كريم واقي شمس',
        itemNumber:  '001-BF-483',
        brand:       'GlowSkin',
        description: 'كريم وقاية فائق للبشرة من أشعة الشمس SPF 50',
        category:    'عناية بشرة',
        tags:        ['وقاية شمس', 'بشرة', 'SPF'],
        variants: [
            { id: 'v1', name: 'أبيض', hex: '#ffffff', variantNumber: '001-BF-483-01', price: '1200' },
            { id: 'v2', name: 'بيج',  hex: '#f5f5dc', variantNumber: '001-BF-483-02', price: '1200' },
        ],
        prices: [
            { priceLabelId: 'label-wholesale', label: 'سعر الجملة',  value: '1200', currency: 'ريال يمني', symbol: 'ر.ي', unit: 'قطعة', isDefaultCurrency: true },
            { priceLabelId: 'label-retail',    label: 'سعر التجزئة', value: '1500', currency: 'ريال يمني', symbol: 'ر.ي', unit: 'قطعة', isDefaultCurrency: true },
        ],
        units: [
            { name: 'قطعة', isBase: true, conversionFactor: 1, barcode: '12345' },
            { name: 'كرتون', isBase: false, conversionFactor: 24, barcode: null },
        ],
        imageUrl:  'https://example.com/images/sunscreen.jpg',
        allImages: ['https://example.com/images/sunscreen.jpg', 'https://example.com/images/sunscreen-2.jpg'],
    },
    {
        id:          'prod-002',
        name:        'مرطب بشرة طبيعي',
        itemNumber:  '001-BF-484',
        brand:       'NaturaCare',
        description: 'مرطب طبيعي للبشرة الجافة',
        category:    'عناية بشرة',
        tags:        ['ترطيب', 'بشرة'],
        variants: [
            { id: 'v3', name: 'طبيعي', hex: '#ffe4c4', variantNumber: '001-BF-484-01', price: '900' },
        ],
        prices: [
            { priceLabelId: 'label-wholesale', label: 'سعر الجملة', value: '900', currency: 'ريال يمني', symbol: 'ر.ي', unit: 'قطعة', isDefaultCurrency: true },
        ],
        units: [
            { name: 'قطعة', isBase: true, conversionFactor: 1, barcode: null },
        ],
        imageUrl:  'https://example.com/images/moisturizer.jpg',
        allImages: ['https://example.com/images/moisturizer.jpg'],
    },
]

/**
 * Returns rendered preview(s) using sample data.
 *   - "combined"    → returns single-element array (all products combined)
 *   - "per_product" → returns one element per sample product (N messages)
 *
 * Each element includes whatsappNumber for display in the UI (preview only).
 */
export function previewTemplateRender(
    template: Pick<MessageTemplateData, 'bodyTemplate' | 'productBlock' | 'separator' | 'type' | 'sendMode'>
): Array<RenderedMessage & { whatsappNumber: string; productIndex?: number; totalProducts?: number }> {
    const wn = extractWhatsappNumber(SAMPLE_CUSTOMER) ?? '967771234567'

    if (template.sendMode === 'per_product') {
        return SAMPLE_PRODUCTS.map((product, i) => ({
            ...renderMessage(template, SAMPLE_CUSTOMER, [product]),
            whatsappNumber: wn,
            productIndex:   i + 1,
            totalProducts:  SAMPLE_PRODUCTS.length,
        }))
    }

    return [{
        ...renderMessage(template, SAMPLE_CUSTOMER, SAMPLE_PRODUCTS),
        whatsappNumber: wn,
    }]
}
