// Shared auth configuration — used by auth.ts (Node runtime) and middleware.ts (Edge runtime)

export const AUTH_CONFIG = {
    tokenName: 'auth-token',
    jwtSecret: process.env.JWT_SECRET || 'husam-ai-dashboard-secret-key-2026',
    tokenMaxAge: 60 * 60 * 24 * 7, // 7 days
    tokenExpiry: '7d',
} as const

export interface JwtPayload {
    userId: string
    username: string
    name: string
    [key: string]: unknown
}
