export type OrderErrorCode =
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'ORDER_NOT_MUTABLE'
    | 'INTERNAL_ERROR'

export class OrderServiceError extends Error {
    readonly status: number
    readonly code: OrderErrorCode
    readonly details?: unknown

    constructor(
        message: string,
        status: number,
        code: OrderErrorCode,
        details?: unknown
    ) {
        super(message)
        this.name = 'OrderServiceError'
        this.status = status
        this.code = code
        this.details = details
    }
}
