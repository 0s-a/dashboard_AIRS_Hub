export interface ColorFormData {
    code: string
    name: string
    hexCode: string
    order?: number
    isActive?: boolean
}

export type SerializedColorRef = {
    id: string
    code: string
    name: string
    hexCode: string
}
