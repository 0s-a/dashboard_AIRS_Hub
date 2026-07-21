export type CustomerErrorCode =
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'INVALID_JSON'
    | 'MISSING_PHONE'
    | 'INVALID_PHONE'
    | 'DUPLICATE_CONTACT'
    | 'DUPLICATE_FIELD'
    | 'SUPERVISOR_CONTACT'
    | 'HAS_ORDERS'
    | 'INTERNAL_ERROR'

export class CustomerServiceError extends Error {
    readonly status: number
    readonly code: CustomerErrorCode
    readonly details?: unknown

    constructor(
        message: string,
        status: number,
        code: CustomerErrorCode,
        details?: unknown
    ) {
        super(message)
        this.name = 'CustomerServiceError'
        this.status = status
        this.code = code
        this.details = details
    }
}
