import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateApiKey } from '@/lib/api-utils'
import { Prisma } from '@prisma/client'

// GET /api/v1/bot/products/search — Advanced full-text search
export async function GET(req: NextRequest) {
    const authError = validateApiKey(req)
    if (authError) return authError

    try {
        const { searchParams } = new URL(req.url)
        const query = searchParams.get('q') || searchParams.get('search') || ''
        const personId = searchParams.get('personId')
        const available = searchParams.get('available')
        const categoryId = searchParams.get('category')
        const brand = searchParams.get('brand')
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
        const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20')))
        const offset = (page - 1) * limit

        if (!query.trim()) {
            return NextResponse.json(
                { error: 'Missing required parameter: q' },
                { status: 400 }
            )
        }

        // ── Build WHERE clauses ──────────────────────
        const conditions: string[] = []
        const params: any[] = []
        let paramIndex = 1

        // Full-text search condition
        conditions.push(`p.search_vector @@ websearch_to_tsquery('arabic', $${paramIndex})`)
        params.push(query)
        const queryParamIndex = paramIndex
        paramIndex++

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
            conditions.push(`p.brand ILIKE $${paramIndex}`)
            params.push(`%${brand}%`)
            paramIndex++
        }

        const whereClause = conditions.join(' AND ')

        // ── Person price label filter ────────────────
        let priceSubquery: string
        if (personId) {
            params.push(personId)
            const personParamIdx = paramIndex
            paramIndex++

            priceSubquery = `
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
                      AND pp."priceLabelId" IN (
                          SELECT ppl."priceLabelId" FROM "PersonPriceLabel" ppl WHERE ppl."personId" = $${personParamIdx}
                      )
                ) AS prices
            `
        } else {
            priceSubquery = `
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
                ) AS prices
            `
        }

        // ── Main query ───────────────────────────────
        const mainSQL = `
            SELECT
                p.id,
                p.name,
                p.brand,
                p."itemNumber",
                p.description,
                p."isAvailable",
                p.tags,
                p."alternativeNames",
                ts_rank(p.search_vector, websearch_to_tsquery('arabic', $${queryParamIndex})) AS rank,

                -- Category
                (
                    SELECT jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon)
                    FROM "Category" cat WHERE cat.id = p."categoryId"
                ) AS category,

                -- Prices
                ${priceSubquery},

                -- Variants
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
                ) AS variants,

                -- Images
                (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'url', mi.url,
                            'alt', mi.alt,
                            'isPrimary', pi."isPrimary"
                        ) ORDER BY pi."order" ASC
                    ), '[]'::jsonb)
                    FROM "ProductImage" pi
                    JOIN "MediaImage" mi ON mi.id = pi."mediaImageId"
                    WHERE pi."productId" = p.id
                ) AS images

            FROM "Product" p
            WHERE ${whereClause}
            ORDER BY rank DESC
            LIMIT ${limit} OFFSET ${offset}
        `

        // Count query
        const countSQL = `
            SELECT count(*)::int AS total
            FROM "Product" p
            WHERE ${whereClause}
        `

        // Execute both
        const [results, countResult] = await Promise.all([
            prisma.$queryRawUnsafe(mainSQL, ...params) as Promise<any[]>,
            prisma.$queryRawUnsafe(countSQL, ...params) as Promise<any[]>,
        ])

        // ── ILIKE Fallback ───────────────────────────
        // If FTS returned 0 results, fallback to ILIKE for partial/numeric matches
        if (results.length === 0) {
            const fallbackConditions: string[] = []
            const fallbackParams: any[] = []
            let fbIdx = 1

            const likePattern = `%${query}%`
            fallbackConditions.push(`(
                p.name ILIKE $${fbIdx} OR
                p."itemNumber" ILIKE $${fbIdx} OR
                p.brand ILIKE $${fbIdx} OR
                p.description ILIKE $${fbIdx} OR
                p."alternativeNames"::text ILIKE $${fbIdx}
            )`)
            fallbackParams.push(likePattern)
            fbIdx++

            if (available === 'true' || available === 'false') {
                fallbackConditions.push(`p."isAvailable" = $${fbIdx}`)
                fallbackParams.push(available === 'true')
                fbIdx++
            }
            if (categoryId) {
                fallbackConditions.push(`p."categoryId" = $${fbIdx}`)
                fallbackParams.push(categoryId)
                fbIdx++
            }

            const fbWhere = fallbackConditions.join(' AND ')

            // For fallback, we use the same subqueries but without ts_rank
            let fbPriceSubquery: string
            if (personId) {
                fallbackParams.push(personId)
                const fbPersonIdx = fbIdx
                fbIdx++
                fbPriceSubquery = `
                    (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', pp.id, 'value', pp.value, 'unitName', u.name,
                                'priceLabelId', pl.id, 'priceLabelName', pl.name,
                                'currencyCode', c.code, 'currencySymbol', c.symbol, 'currencyName', c.name
                            ) ORDER BY pp."createdAt" ASC
                        ), '[]'::jsonb)
                        FROM "ProductPrice" pp
                        JOIN "PriceLabel" pl ON pl.id = pp."priceLabelId"
                        JOIN "Currency" c ON c.id = pp."currencyId"
                        LEFT JOIN "Unit" u ON u.id = pp."unitId"
                        WHERE pp."productId" = p.id
                          AND pp."priceLabelId" IN (
                              SELECT ppl."priceLabelId" FROM "PersonPriceLabel" ppl WHERE ppl."personId" = $${fbPersonIdx}
                          )
                    ) AS prices
                `
            } else {
                fbPriceSubquery = `
                    (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', pp.id, 'value', pp.value, 'unitName', u.name,
                                'priceLabelId', pl.id, 'priceLabelName', pl.name,
                                'currencyCode', c.code, 'currencySymbol', c.symbol, 'currencyName', c.name
                            ) ORDER BY pp."createdAt" ASC
                        ), '[]'::jsonb)
                        FROM "ProductPrice" pp
                        JOIN "PriceLabel" pl ON pl.id = pp."priceLabelId"
                        JOIN "Currency" c ON c.id = pp."currencyId"
                        LEFT JOIN "Unit" u ON u.id = pp."unitId"
                        WHERE pp."productId" = p.id
                    ) AS prices
                `
            }

            const fallbackSQL = `
                SELECT
                    p.id, p.name, p.brand, p."itemNumber", p.description,
                    p."isAvailable", p.tags, p."alternativeNames",
                    0::float AS rank,
                    (SELECT jsonb_build_object('id', cat.id, 'name', cat.name, 'icon', cat.icon)
                     FROM "Category" cat WHERE cat.id = p."categoryId") AS category,
                    ${fbPriceSubquery},
                    (SELECT COALESCE(jsonb_agg(
                        jsonb_build_object('id', v.id, 'variantNumber', v."variantNumber", 'suffix', v.suffix,
                            'name', v.name, 'type', v.type, 'hex', v.hex, 'price', v.price, 'isDefault', v."isDefault")
                        ORDER BY v."order" ASC), '[]'::jsonb)
                     FROM "Variant" v WHERE v."productId" = p.id) AS variants,
                    (SELECT COALESCE(jsonb_agg(
                        jsonb_build_object('url', mi.url, 'alt', mi.alt, 'isPrimary', pi."isPrimary")
                        ORDER BY pi."order" ASC), '[]'::jsonb)
                     FROM "ProductImage" pi JOIN "MediaImage" mi ON mi.id = pi."mediaImageId"
                     WHERE pi."productId" = p.id) AS images
                FROM "Product" p
                WHERE ${fbWhere}
                ORDER BY p.name ASC
                LIMIT ${limit} OFFSET ${offset}
            `
            const fbCountSQL = `SELECT count(*)::int AS total FROM "Product" p WHERE ${fbWhere}`

            const [fbResults, fbCount] = await Promise.all([
                prisma.$queryRawUnsafe(fallbackSQL, ...fallbackParams) as Promise<any[]>,
                prisma.$queryRawUnsafe(fbCountSQL, ...fallbackParams) as Promise<any[]>,
            ])

            const total = fbCount[0]?.total ?? 0
            return NextResponse.json({
                success: true,
                data: fbResults,
                count: fbResults.length,
                searchMode: 'ilike_fallback',
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            })
        }

        const total = countResult[0]?.total ?? 0
        return NextResponse.json({
            success: true,
            data: results,
            count: results.length,
            searchMode: 'fulltext',
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        })

    } catch (error) {
        console.error('API Error [GET /products/search]:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
