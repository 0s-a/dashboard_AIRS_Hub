export interface ItemAttributeFormData {
    code: string
    name: string
    examples?: string[] | null
}

export type SerializedItemAttributeCatalog = {
    id: string
    code: string
    name: string
    examples: string[]
    createdAt: string
    updatedAt: string
    valuesCount?: number
}
