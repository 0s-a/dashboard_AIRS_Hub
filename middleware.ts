import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { AUTH_CONFIG } from '@/lib/auth-config'

// Encode secret for jose (Edge-compatible)
const secret = new TextEncoder().encode(AUTH_CONFIG.jwtSecret)

// Routes that don't require authentication
const PUBLIC_PATHS = ['/login']
const PUBLIC_PREFIXES = ['/api/v1/', '/_next/', '/favicon.ico']

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Allow public paths
    if (PUBLIC_PATHS.includes(pathname)) {
        // If user is already logged in and visits /login, redirect to dashboard
        const token = request.cookies.get(AUTH_CONFIG.tokenName)?.value
        if (token) {
            try {
                await jwtVerify(token, secret)
                return NextResponse.redirect(new URL('/', request.url))
            } catch {
                // Invalid token, let them see login page
            }
        }
        return NextResponse.next()
    }

    // Allow public prefixes (API, static assets)
    if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
        return NextResponse.next()
    }

    // Check for auth token
    const token = request.cookies.get(AUTH_CONFIG.tokenName)?.value

    if (!token) {
        const loginUrl = new URL('/login', request.url)
        return NextResponse.redirect(loginUrl)
    }

    try {
        await jwtVerify(token, secret)
        return NextResponse.next()
    } catch {
        // Invalid or expired token — clear cookie and redirect
        const loginUrl = new URL('/login', request.url)
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete(AUTH_CONFIG.tokenName)
        return response
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
