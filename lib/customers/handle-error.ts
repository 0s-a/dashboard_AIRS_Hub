import { botApiError } from '@/lib/api-utils'
import { CustomerServiceError } from './errors'

export function handleCustomerServiceError(error: unknown) {
    if (error instanceof CustomerServiceError) {
        return botApiError(error.message, error.status, {
            code: error.code,
            ...(error.details !== undefined && { details: error.details }),
        })
    }

    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return botApiError('تنسيق بيانات JSON غير صالح', 400, {
            code: 'INVALID_JSON',
            details: error.message,
        })
    }

    const prismaCode = (error as { code?: string })?.code
    const target = (error as { meta?: { target?: string[] } })?.meta?.target
    if (prismaCode === 'P2002') {
        if (target?.includes('value')) {
            return botApiError('رقم الهاتف أو البريد مسجل بالفعل لشخص آخر في النظام', 409, {
                code: 'DUPLICATE_CONTACT',
                details: `Duplicate contact: ${target}`,
            })
        }
        return botApiError('بيانات مكررة', 409, {
            code: 'DUPLICATE_FIELD',
            details: `Duplicate field: ${target}`,
        })
    }

    console.error('[Bot Customers]', error)
    return botApiError('خطأ داخلي في الخادم', 500, { code: 'INTERNAL_ERROR' })
}
