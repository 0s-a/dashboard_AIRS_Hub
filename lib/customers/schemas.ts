import { z } from 'zod'
import {
    createCustomerSchema,
    updateCustomerSchema,
} from '@/lib/validations/customer'

export {
    createCustomerSchema,
    updateCustomerSchema,
} from '@/lib/validations/customer'
export type { ContactInput } from '@/lib/validations/customer'

export const CustomerStatusSchema = z.object({
    isActive: z.boolean(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
export type CustomerStatusInput = z.infer<typeof CustomerStatusSchema>
