import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { AUTH_CONFIG } from '@/lib/auth-config'

const secret = new TextEncoder().encode(AUTH_CONFIG.jwtSecret)

const PUBLIC_PATH_PREFIXES = [
    '/login',
    '/api/health',
    '/api/v1/bot',
    '/invoice',
    '/api-docs',
]

function isPublicPath(pathname: string): boolean {
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/uploads') ||
        pathname === '/favicon.ico'
    ) {
        return true
    }
    return PUBLIC_PATH_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
}

function isDashboardApi(pathname: string): boolean {
    return pathname === '/api/v1/dashboard' || pathname.startsWith('/api/v1/dashboard/')
}

async function hasValidToken(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get(AUTH_CONFIG.tokenName)?.value
    if (!token) return false
    try {
        await jwtVerify(token, secret)
        return true
    } catch {
        return false
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (isPublicPath(pathname)) {
        return NextResponse.next()
    }

    const authenticated = await hasValidToken(request)

    if (isDashboardApi(pathname)) {
        if (!authenticated) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }
        return NextResponse.next()
    }

    // Dashboard pages and other protected routes
    if (!authenticated) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('from', pathname)
        // Server Actions expect x-action-redirect, not an HTML redirect
        if (request.headers.has('next-action')) {
            return new NextResponse(null, {
                status: 303,
                headers: { 'x-action-redirect': `${loginUrl.pathname}${loginUrl.search}` },
            })
        }
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
