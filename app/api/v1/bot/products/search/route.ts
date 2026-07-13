import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'

interface ProductSearchRow {
    id: string
    itemNumber: string | null
    name: string
    brand: string | null
    isAvailable: boolean
    description: string | null
    tags: unknown[]
    alternativeNames: unknown[]
    rank: number
    category: { id: string; name: string } | null
    attributes: Array<{ code: string; name: string; value: string }>
    primaryImage: string | null
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
    images: Array<{
        url: string
        alt: string | null
        isPrimary: boolean
    }>
}

const CATEGORY_SUBQUERY = `
    (
        SELECT jsonb_build_object('id', cat.id, 'name', cat.name)
        FROM "Category" cat WHERE cat.id = p."categoryId"
    ) AS category
`

const ATTRIBUTES_SUBQUERY = `
    (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'code', pa.code,
                'name', pa.name,
                'value', pav.value
            ) ORDER BY pa.name ASC
        ), '[]'::jsonb)
        FROM "ProductAttributeValue" pav
        JOIN "ProductAttribute" pa ON pa.id = pav."attributeId"
        WHERE pav."productId" = p.id
    ) AS attributes
`

const PRIMARY_IMAGE_SUBQUERY = `
    (
        SELECT pi.url FROM "ProductImage" pi
        WHERE pi."productId" = p.id
        ORDER BY pi."isPrimary" DESC, pi."order" ASC
        LIMIT 1
    ) AS "primaryImage"
`

const IMAGES_SUBQUERY = `
    (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'url', pi.url,
                'alt', pi.alt,
                'isPrimary', pi."isPrimary"
            ) ORDER BY pi."isPrimary" DESC, pi."order" ASC
        ), '[]'::jsonb)
        FROM "ProductImage" pi
        WHERE pi."productId" = p.id
    ) AS images
`

const getPriceSubquery = (customerId: string | null, paramIdx: number) => {
    // Catalog prices are stored in default currency only; convert via Currency.exchangeRate
    const convertedValue = `
        CASE
            WHEN c."isDefault" = true OR c."exchangeRate" IS NULL THEN pp.value
            ELSE ROUND(pp.value / c."exchangeRate", 2)
        END
    `

    if (customerId) {
        return `
            (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'id', pp.id,
                        'value', ${convertedValue},
                        'unitName', u.name,
                        'priceLabelId', pl.id,
                        'priceLabelName', pl.name,
                        'currencyCode', c.code,
                        'currencySymbol', c.symbol,
                        'currencyName', c.name
                    ) ORDER BY pp."createdAt" ASC, c."isDefault" DESC, c.name ASC
                ), '[]'::jsonb)
                FROM "ProductPrice" pp
                JOIN "PriceLabel" pl ON pl.id = pp."priceLabelId"
                LEFT JOIN "Unit" u ON u.id = pp."unitId"
                CROSS JOIN "Currency" c
                WHERE pp."productId" = p.id
                  AND (
                      pp."priceLabelId" = (SELECT "priceLabelId" FROM "Customer" WHERE id = $${paramIdx})
                      OR (
                          (SELECT "priceLabelId" FROM "Customer" WHERE id = $${paramIdx}) IS NULL
                          AND pl."isDefault" = true
                      )
                  )
                  AND (
                      c.id IN (SELECT "currencyId" FROM "CustomerCurrency" WHERE "customerId" = $${paramIdx})
                      OR (
                          NOT EXISTS (SELECT 1 FROM "CustomerCurrency" WHERE "customerId" = $${paramIdx})
                          AND c."isDefault" = true
                      )
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
            LEFT JOIN "Unit" u ON u.id = pp."unitId"
            CROSS JOIN "Currency" c
            WHERE pp."productId" = p.id
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
        const customerId = searchParams.get('customerId') || searchParams.get('customer_id')
        const available = searchParams.get('available')
        const categoryId = searchParams.get('category')
        const brand = searchParams.get('brand')
        const itemNumber = searchParams.get('itemNumber') || searchParams.get('productNumber') || searchParams.get('productCode')
        const tags = searchParams.getAll('tag').filter(Boolean)
        const attrValue = searchParams.get('attr') || searchParams.get('color') || searchParams.get('colorCode') || searchParams.get('variant') || searchParams.get('suffix')
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20')))
        const offset = (page - 1) * limit

        const conditions: string[] = []
        const params: unknown[] = []
        let paramIndex = 1

        let selectRank = '0::float AS rank'
        let orderBy = 'ORDER BY p."createdAt" DESC, p.name ASC'

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
                p."itemNumber" ILIKE $${likeParamIndex} OR
                p.description ILIKE $${likeParamIndex} OR
                p."alternativeNames"::text ILIKE $${likeParamIndex} OR
                b.name ILIKE $${likeParamIndex} OR
                (SELECT name FROM "Category" WHERE id = p."categoryId") ILIKE $${likeParamIndex} OR
                EXISTS (
                    SELECT 1 FROM "ProductAttributeValue" pav
                    JOIN "ProductAttribute" pa ON pa.id = pav."attributeId"
                    WHERE pav."productId" = p.id
                      AND (pav.value ILIKE $${likeParamIndex} OR pa.name ILIKE $${likeParamIndex} OR pa.code ILIKE $${likeParamIndex})
                )
            )`)

            selectRank = `ts_rank(p.search_vector, websearch_to_tsquery('arabic', $${ftsParamIndex})) AS rank`
            orderBy = 'ORDER BY rank DESC, p.name ASC'
        }

        if (available === 'true' || available === 'false') {
            conditions.push(`p."isAvailable" = $${paramIndex}`)
            params.push(available === 'true')
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
        if (itemNumber) {
            conditions.push(`p."itemNumber" ILIKE $${paramIndex}`)
            params.push(`%${itemNumber}%`)
            paramIndex++
        }
        if (tags.length > 0) {
            conditions.push(`p.tags @> $${paramIndex}::jsonb`)
            params.push(JSON.stringify(tags))
            paramIndex++
        }

        if (attrValue) {
            conditions.push(`EXISTS (
                SELECT 1 FROM "ProductAttributeValue" pav
                WHERE pav."productId" = p.id AND pav.value ILIKE $${paramIndex}
            )`)
            params.push(`%${attrValue}%`)
            paramIndex++
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

        const whereParams = [...params]
        const mainParams = [...params]

        let priceSubquery = ''
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
                p."itemNumber",
                p.name,
                b.name AS brand,
                p.description,
                p."isAvailable",
                p.tags,
                p."alternativeNames",
                ${selectRank},
                ${CATEGORY_SUBQUERY},
                ${ATTRIBUTES_SUBQUERY},
                ${PRIMARY_IMAGE_SUBQUERY},
                ${priceSubquery},
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
                ...(tags.length > 0 && { tags }),
                ...(categoryId && { categoryId }),
                ...(brand && { brand }),
                ...(itemNumber && { itemNumber }),
                ...(available !== null && { available }),
                ...(attrValue && { attr: attrValue }),
            },
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        })
    } catch (error) {
        console.error('API Error [GET /products/search]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
