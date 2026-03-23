// Shared auth configuration — used by auth.ts (Node runtime) and middleware.ts (Edge runtime)

export const AUTH_CONFIG = {
    tokenName: 'auth-token',
    jwtSecret: process.env.JWT_SECRET || 'nawaat-dashboard-secret-key-2026',
    tokenMaxAge: 60 * 60 * 24 * 7, // 7 days
    tokenExpiry: '7d',
} as const

export interface JwtPayload {
    userId: string
    username: string
    name: string
    role: string     // "admin" | "user"
    color: string    // avatar color hex
    [key: string]: unknown
}
