'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function softDeleteCustomer(phoneNumber: string) {
    try {
        const customer = await prisma.customer.update({
            where: { phoneNumber },
            data: { isActive: false },
        })
        revalidatePath('/dashboard/crm')
        return { success: true, data: customer }
    } catch (error) {
        console.error('Failed to soft delete customer:', error)
        return { success: false, error: 'Failed to delete customer' }
    }
}

export async function getCustomers() {
    try {
        const whereClause = {
            isActive: true,
        }

        const customers = await prisma.customer.findMany({
            where: whereClause,
            orderBy: { lastInteraction: 'desc' },
        })
        return { success: true, data: customers }
    } catch (error) {
        console.error('Failed to fetch customers:', error)
        return { success: false, error: 'Failed to fetch customers', data: [] }
    }
}

export async function createCustomer(data: { name: string; phoneNumber: string }) {
    try {
        const customer = await prisma.customer.create({
            data: {
                ...data,
                totalOrders: 0
            }
        })
        revalidatePath('/dashboard/crm')
        return { success: true, data: customer }
    } catch (error) {
        console.error('Failed to create customer:', error)
        return { success: false, error: 'Failed to create customer' }
    }
}

export async function updateCustomer(phoneNumber: string, data: { name: string }) {
    try {
        const customer = await prisma.customer.update({
            where: { phoneNumber },
            data
        })
        revalidatePath('/dashboard/crm')
        return { success: true, data: customer }
    } catch (error) {
        console.error('Failed to update customer:', error)
        return { success: false, error: 'Failed to update customer' }
    }
}
