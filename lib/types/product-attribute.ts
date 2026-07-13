export interface ProductAttributeFormData {
    code: string
    name: string
    examples?: string[] | null
}

export type SerializedProductAttributeCatalog = {
    id: string
    code: string
    name: string
    examples: string[]
    createdAt: string
    updatedAt: string
    valuesCount?: number
}
