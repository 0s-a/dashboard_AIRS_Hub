'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { updateProductDescription } from './inventory'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')

export async function generateProductDescription(product: { name: string; category: string; id: string }) {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        return { success: false, error: 'Gemini API Key missing' }
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

        const prompt = `Write a persuasive, professional marketing description in Arabic for a product named "${product.name}" in the category "${product.category}". The description should be engaging and emphasize quality.`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        if (text) {
            await updateProductDescription(product.id, text)
            return { success: true, data: text }
        }

        return { success: false, error: 'No text generated' }
    } catch (error) {
        console.error('Gemini API Error:', error)
        return { success: false, error: 'Failed to generate description' }
    }
}
