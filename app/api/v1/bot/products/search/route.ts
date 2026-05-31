import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey, apiError, apiSuccess } from '@/lib/api-utils'

// ── Subqueries extracted as constants for DRY ────────

const CATEGORY_SUBQUERY = `
    (
        SELECT jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon)
        FROM "Category" cat WHERE cat.id = p."categoryId"
    ) AS category
`

const VARIANTS_SUBQUERY = `
    (
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', v.id,
                'variantNumber', v."variantNumber",
                'suffix', v.suffix,
                'name', v.name,
                'type', v.type,
                'hex', v.hex,
                'price', v.price,
                'isDefault', v."isDefault"
            ) ORDER BY v."order" ASC
        ), '[]'::jsonb)
        FROM "Variant" v WHERE v."productId" = p.id
    ) AS variants
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
        WHERE pi."productId" = p.id
    ) AS images
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
                WHERE pp."productId" = p.id
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
        const customerId = searchParams.get('customerId') || searchParams.get('customerId') // backward compat
        const available = searchParams.get('available')
        const categoryId = searchParams.get('category')
        const brand = searchParams.get('brand')
        const productCode = searchParams.get('productCode')
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20')))
        const offset = (page - 1) * limit

        // ── Build WHERE clauses ──────────────────────
        const conditions: string[] = []
        const params: any[] = []
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
                p."itemNumber" ILIKE $${likeParamIndex} OR
                p."productCode" ILIKE $${likeParamIndex} OR
                p.description ILIKE $${likeParamIndex} OR
                p."alternativeNames"::text ILIKE $${likeParamIndex} OR
                b.name ILIKE $${likeParamIndex} OR
                (SELECT name FROM "Category" WHERE id = p."categoryId") ILIKE $${likeParamIndex}
            )`)

            // Rank higher for FTS matches
            selectRank = `ts_rank(p.search_vector, websearch_to_tsquery('arabic', $${ftsParamIndex})) AS rank`
            orderBy = "ORDER BY rank DESC, p.name ASC"
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
        if (productCode) {
            conditions.push(`p."productCode" ILIKE $${paramIndex}`)
            params.push(`%${productCode}%`)
            paramIndex++
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

        // ── Customer price label filter ────────────────
        let priceSubquery = ""
        if (customerId) {
            params.push(customerId)
            priceSubquery = getPriceSubquery(customerId, paramIndex)
            paramIndex++
        } else {
            priceSubquery = getPriceSubquery(null, paramIndex)
        }

        const needsBrandJoin = !!(query || brand)

        // ── Main query ───────────────────────────────
        const mainSQL = `
            SELECT
                p.id,
                p.name,
                p."productCode",
                b.name AS brand,
                p."itemNumber",
                p.description,
                p."isAvailable",
                p.tags,
                p."alternativeNames",
                ${selectRank},
                ${CATEGORY_SUBQUERY},
                ${priceSubquery},
                ${VARIANTS_SUBQUERY},
                ${IMAGES_SUBQUERY}
            FROM "Product" p
            ${needsBrandJoin ? 'LEFT JOIN "Brand" b ON b.id = p."brandId"' : 'LEFT JOIN "Brand" b ON b.id = p."brandId"'}
            ${whereClause}
            ${orderBy}
            LIMIT ${limit} OFFSET ${offset}
        `

        // Count query
        const countSQL = `
            SELECT count(*)::int AS total
            FROM "Product" p
            ${needsBrandJoin ? 'LEFT JOIN "Brand" b ON b.id = p."brandId"' : ''}
            ${whereClause}
        `

        // Execute both
        const [results, countResult] = await Promise.all([
            prisma.$queryRawUnsafe(mainSQL, ...params) as Promise<any[]>,
            prisma.$queryRawUnsafe(countSQL, ...params) as Promise<any[]>,
        ])

        const total = countResult[0]?.total ?? 0
        return apiSuccess(results, 200, {
            count: results.length,
            searchMode: query ? 'hybrid' : 'browse',
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        })

    } catch (error) {
        console.error('API Error [GET /products/search]:', error)
        return apiError('Internal Server Error', 500, { code: 'INTERNAL_ERROR' })
    }
}
