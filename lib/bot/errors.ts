export type BotErrorCode =
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'INTERNAL_ERROR'

export class BotServiceError extends Error {
    readonly status: number
    readonly code: BotErrorCode
    readonly details?: unknown

    constructor(
        message: string,
        status: number,
        code: BotErrorCode,
        details?: unknown
    ) {
        super(message)
        this.name = 'BotServiceError'
        this.status = status
        this.code = code
        this.details = details
    }
}
