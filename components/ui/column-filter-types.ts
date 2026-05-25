export type FilterType = 'text' | 'select' | 'boolean' | 'date-range' | 'number-range'

export interface FilterOption {
    label: string
    value: string
}

export interface ColumnFilterMeta {
    filterType?: FilterType
    filterOptions?: FilterOption[]
    filterPlaceholder?: string
}
