export type FilterType = 'text' | 'select' | 'boolean' | 'date-range' | 'number-range'

export type CellAlign = 'start' | 'center' | 'end'

export type CellVariant = 'text' | 'number' | 'code' | 'actions'

export interface FilterOption {
    label: string
    value: string
}

export interface BooleanFilterLabels {
    true: string
    false: string
    all?: string
}

export interface ColumnFilterMeta {
    filterType?: FilterType
    filterOptions?: FilterOption[]
    filterPlaceholder?: string
    align?: CellAlign
    cellVariant?: CellVariant
    booleanLabels?: BooleanFilterLabels
    sticky?: 'actions'
}
