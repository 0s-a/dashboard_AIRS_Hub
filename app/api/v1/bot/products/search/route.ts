import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'

// ── Types ─────────────────────────────────────────────

interface ProductSearchRow {
    id: string
    name: string
    productNumber: string | null
    brand: string | null
    itemNumber: string | null
    description: string | null
    isAvailable: boolean
    tags: unknown[]
    alternativeNames: unknown[]
    rank: number
    category: { id: string; name: string; icon: string | null } | null
    prices: Array<{
        id: string
        value: number
        unitName: string | null
        priceLabelId: string
        priceLabelName: string
        currencyCode: string
        currencySymbol: string
        currencyName: string
    }>
    skcs: Array<{
        id: string
        colorCode: string
        colorName: string
        hexCode: string
        isDefault: boolean
        isAvailable: boolean
        skus: Array<{
            id: string
            skuCode: string
            sizeLabel: string | null
            isDefault: boolean
            isAvailable: boolean
        }>
    }>
    images: Array<{
        url: string
        alt: string | null
        isPrimary: boolean
    }>
}

// ── Subqueries extracted as constants for DRY ────────

const CATEGORY_SUBQUERY = `
    (
        SELECT jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon)
        FROM "Category" cat WHERE cat.id = p."categoryId"
    ) AS category
`

const SKCS_SUBQUERY = `
    (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', skc.id,
                'itemNumber', skc."itemNumber",
                'colorCode', c.code,
                'colorName', c.name,
                'hexCode', c."hexCode",
                'isDefault', skc."isDefault",
                'isAvailable', skc."isAvailable",
                'skus', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', sku.id,
                            'skuCode', sku."skuCode",
                            'sizeLabel', sku."sizeLabel",
                            'isDefault', sku."isDefault",
                            'isAvailable', sku."isAvailable"
                        ) ORDER BY sku."order" ASC
                    ), '[]'::jsonb)
                    FROM "SKU" sku WHERE sku."skcId" = skc.id
                )
            ) ORDER BY skc."order" ASC
        ), '[]'::jsonb)
        FROM "SKC" skc
        JOIN "Color" c ON c.id = skc."colorId"
        WHERE skc."productId" = p.id
    ) AS skcs
`

const IMAGES_SUBQUERY = `
    (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'url', pi.url,
                'alt', pi.alt,
                'isPrimary', pi."isPrimary"
            ) ORDER BY pi."order" ASC
        ), '[]'::jsonb)
        FROM "ProductImage" pi
        WHERE pi."skcId" IN (SELECT id FROM "SKC" WHERE "productId" = p.id)
    ) AS images
`

const SKU_IDS_FOR_PRODUCT = `
    SELECT sku.id FROM "SKU" sku
    JOIN "SKC" skc ON skc.id = sku."skcId"
    WHERE skc."productId" = p.id
`

const getPriceSubquery = (customerId: string | null, paramIdx: number) => {
    if (customerId) {
        return `
            (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', pp.id,
                        'value', pp.value,
                        'unitName', u.name,
                        'priceLabelId', pl.id,
                        'priceLabelName', pl.name,
                        'currencyCode', c.code,
                        'currencySymbol', c.symbol,
                        'currencyName', c.name
                    ) ORDER BY pp."createdAt" ASC
                ), '[]'::jsonb)
                FROM "ProductPrice" pp
                JOIN "PriceLabel" pl ON pl.id = pp."priceLabelId"
                JOIN "Currency" c ON c.id = pp."currencyId"
                LEFT JOIN "Unit" u ON u.id = pp."unitId"
                WHERE pp."skuId" IN (${SKU_IDS_FOR_PRODUCT})
                  AND (
                      pp."priceLabelId" IN (SELECT "priceLabelId" FROM "CustomerPriceLabel" WHERE "customerId" = $${paramIdx})
                      OR (NOT EXISTS (SELECT 1 FROM "CustomerPriceLabel" WHERE "customerId" = $${paramIdx}) AND pl."isDefault" = true)
                  )
                  AND (
                      pp."currencyId" IN (SELECT "currencyId" FROM "CustomerCurrency" WHERE "customerId" = $${paramIdx})
                      OR (NOT EXISTS (SELECT 1 FROM "CustomerCurrency" WHERE "customerId" = $${paramIdx}) AND c."isDefault" = true)
                  )
            ) AS prices
        `
    }
    return `
        (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', pp.id,
                    'value', pp.value,
                    'unitName', u.name,
                    'priceLabelId', pl.id,
                    'priceLabelName', pl.name,
                    'currencyCode', c.code,
                    'currencySymbol', c.symbol,
                    'currencyName', c.name
                ) ORDER BY pp."createdAt" ASC
            ), '[]'::jsonb)
            FROM "ProductPrice" pp
            JOIN "PriceLabel" pl ON pl.id = pp."priceLabelId"
            JOIN "Currency" c ON c.id = pp."currencyId"
            LEFT JOIN "Unit" u ON u.id = pp."unitId"
            WHERE pp."skuId" IN (${SKU_IDS_FOR_PRODUCT})
              AND pl."isDefault" = true
              AND c."isDefault" = true
        ) AS prices
    `
}

// GET /api/v1/bot/products/search — Advanced hybrid search & browse
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const query = (searchParams.get('q') || searchParams.get('search') || '').trim()
        const customerId = searchParams.get('customerId') || searchParams.get('customer_id') // backward compat
        const available = searchParams.get('available')
        const categoryId = searchParams.get('category')
        const brand = searchParams.get('brand')
        const productNumber = searchParams.get('productNumber') || searchParams.get('productCode')
        const tags = searchParams.getAll('tag').filter(Boolean)   // ?tag=new&tag=sale → ['new','sale']
        const colorFilter   = searchParams.get('color')    // ?color=أحمر  → filter by SKC colorName
        const hexFilter     = searchParams.get('hex')      // ?hex=ef4444   → filter by hex (with or without #)
        const variantSuffix = searchParams.get('variant') || searchParams.get('suffix')  // ?variant=BLK or ?suffix=BLK
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20')))
        const offset = (page - 1) * limit

        // ── Build WHERE clauses ──────────────────────
        const conditions: string[] = []
        const params: unknown[] = []
        let paramIndex = 1

        let selectRank = "0::float AS rank"
        let orderBy = "ORDER BY p.\"createdAt\" DESC, p.name ASC"

        if (query) {
            const ftsParamIndex = paramIndex
            params.push(query)
            paramIndex++

            const likeParamIndex = paramIndex
            params.push(`%${query}%`)
            paramIndex++

            conditions.push(`(
                p.search_vector @@ websearch_to_tsquery('arabic', $${ftsParamIndex}) OR
                p.name ILIKE $${likeParamIndex} OR
                p."productNumber" ILIKE $${likeParamIndex} OR
                p.description ILIKE $${likeParamIndex} OR
                p."alternativeNames"::text ILIKE $${likeParamIndex} OR
                b.name ILIKE $${likeParamIndex} OR
                (SELECT name FROM "Category" WHERE id = p."categoryId") ILIKE $${likeParamIndex} OR
                EXISTS (
                    SELECT 1 FROM "SKC" skc_q
                    WHERE skc_q."productId" = p.id AND skc_q."itemNumber" ILIKE $${likeParamIndex}
                )
            )`)

            selectRank = `ts_rank(p.search_vector, websearch_to_tsquery('arabic', $${ftsParamIndex})) AS rank`
            orderBy = "ORDER BY rank DESC, p.name ASC"
        }

        if (available === 'true' || available === 'false') {
            const avail = available === 'true'
            conditions.push(`EXISTS (
                SELECT 1 FROM "SKC" skc_av
                WHERE skc_av."productId" = p.id AND skc_av."isAvailable" = $${paramIndex}
            )`)
            params.push(avail)
            paramIndex++
        }
        if (categoryId) {
            conditions.push(`p."categoryId" = $${paramIndex}`)
            params.push(categoryId)
            paramIndex++
        }
        if (brand) {
            conditions.push(`b.name ILIKE $${paramIndex}`)
            params.push(`%${brand}%`)
            paramIndex++
        }
        if (productNumber) {
            conditions.push(`p."productNumber" ILIKE $${paramIndex}`)
            params.push(`%${productNumber}%`)
            paramIndex++
        }
        if (tags.length > 0) {
            conditions.push(`p.tags @> $${paramIndex}::jsonb`)
            params.push(JSON.stringify(tags))
            paramIndex++
        }

        if (colorFilter) {
            conditions.push(`EXISTS (
                SELECT 1 FROM "SKC" vc
                JOIN "Color" c ON c.id = vc."colorId"
                WHERE vc."productId" = p.id AND (c.code ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})
            )`)
            params.push(`%${colorFilter}%`)
            paramIndex++
        }

        if (hexFilter) {
            const normalizedHex = hexFilter.startsWith('#') ? hexFilter : `#${hexFilter}`
            conditions.push(`EXISTS (
                SELECT 1 FROM "SKC" vh
                JOIN "Color" c ON c.id = vh."colorId"
                WHERE vh."productId" = p.id AND c."hexCode" ILIKE $${paramIndex}
            )`)
            params.push(`%${normalizedHex}%`)
            paramIndex++
        }

        if (variantSuffix) {
            conditions.push(`EXISTS (
                SELECT 1 FROM "SKC" vs
                JOIN "Color" c ON c.id = vs."colorId"
                WHERE vs."productId" = p.id AND c.code ILIKE $${paramIndex}
            )`)
            params.push(variantSuffix)
            paramIndex++
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

        const whereParams = [...params]
        const mainParams = [...params]

        let priceSubquery = ""
        if (customerId) {
            mainParams.push(customerId)
            priceSubquery = getPriceSubquery(customerId, mainParams.length)
        } else {
            priceSubquery = getPriceSubquery(null, 0)
        }

        const needsBrandJoin = !!(query || brand)

        const mainSQL = `
            SELECT
                p.id,
                p.name,
                p."productNumber",
                b.name AS brand,
                (
                    SELECT skc."itemNumber" FROM "SKC" skc
                    WHERE skc."productId" = p.id AND skc."itemNumber" IS NOT NULL
                    ORDER BY skc."isDefault" DESC, skc."order" ASC
                    LIMIT 1
                ) AS "itemNumber",
                p.description,
                EXISTS (
                    SELECT 1 FROM "SKC" skc_av
                    WHERE skc_av."productId" = p.id AND skc_av."isAvailable" = true
                ) AS "isAvailable",
                p.tags,
                p."alternativeNames",
                ${selectRank},
                ${CATEGORY_SUBQUERY},
                ${priceSubquery},
                ${SKCS_SUBQUERY},
                ${IMAGES_SUBQUERY}
            FROM "Product" p
            LEFT JOIN "Brand" b ON b.id = p."brandId"
            ${whereClause}
            ${orderBy}
            LIMIT ${limit} OFFSET ${offset}
        `

        const countSQL = `
            SELECT count(*)::int AS total
            FROM "Product" p
            ${needsBrandJoin ? 'LEFT JOIN "Brand" b ON b.id = p."brandId"' : ''}
            ${whereClause}
        `

        const [results, countResult] = await Promise.all([
            prisma.$queryRawUnsafe(mainSQL, ...mainParams) as Promise<ProductSearchRow[]>,
            prisma.$queryRawUnsafe(countSQL, ...whereParams) as Promise<{ total: number }[]>,
        ])

        const total = countResult[0]?.total ?? 0
        return apiSuccess(results, 200, {
            count: results.length,
            searchMode: query ? 'hybrid' : 'browse',
            filters: {
                ...(tags.length > 0         && { tags }),
                ...(categoryId              && { categoryId }),
                ...(brand                   && { brand }),
                ...(productNumber            && { productNumber }),
                ...(available !== null      && { available }),
                ...(colorFilter             && { color: colorFilter }),
                ...(hexFilter               && { hex: hexFilter }),
                ...(variantSuffix           && { colorCode: variantSuffix }),
            },
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        })

    } catch (error) {
        console.error('API Error [GET /products/search]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
