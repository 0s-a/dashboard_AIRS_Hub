/**
 * نوع مواصفة الصنف (SKU.sizeLabel) — يحدد تسمية UI والاقتراحات السريعة فقط.
 * القيمة الفعلية تبقى في SKU.sizeLabel.
 */

import {
    SIZE_PRESETS,
    PACKAGING_PRESETS,
    type VariantPreset,
} from '@/lib/config/variant-presets'

export const SKU_SPEC_KINDS = ['size', 'packaging', 'length', 'free'] as const
export type SkuSpecKind = (typeof SKU_SPEC_KINDS)[number]

export const DEFAULT_SKU_SPEC_KIND: SkuSpecKind = 'free'

export type SkuSpecKindConfig = {
    value: SkuSpecKind
    label: string
    pluralLabel: string
    addLabel: string
    siblingLabel: string
    placeholder: string
    emptyHint: string
    presets: VariantPreset[]
}

export const LENGTH_PRESETS: VariantPreset[] = [
    { label: '1 متر', suffix: '1M' },
    { label: '2 متر', suffix: '2M' },
    { label: '3 متر', suffix: '3M' },
    { label: '5 متر', suffix: '5M' },
    { label: '10 متر', suffix: '10M' },
]

export const SKU_SPEC_CONFIGS: SkuSpecKindConfig[] = [
    {
        value: 'size',
        label: 'المقاس',
        pluralLabel: 'المقاسات',
        addLabel: 'إضافة مقاس',
        siblingLabel: 'مقاسات أخرى لنفس اللون',
        placeholder: 'S, M, L, 42...',
        emptyHint: 'قياس موحّد',
        presets: SIZE_PRESETS,
    },
    {
        value: 'packaging',
        label: 'العبوة',
        pluralLabel: 'العبوات',
        addLabel: 'إضافة عبوة',
        siblingLabel: 'عبوات أخرى لنفس اللون',
        placeholder: '30ml, 50ml, 1L...',
        emptyHint: 'قياس موحّد',
        presets: PACKAGING_PRESETS,
    },
    {
        value: 'length',
        label: 'الطول',
        pluralLabel: 'الأطوال',
        addLabel: 'إضافة طول',
        siblingLabel: 'أطوال أخرى لنفس اللون',
        placeholder: '1M, 2M, 5M...',
        emptyHint: 'قياس موحّد',
        presets: LENGTH_PRESETS,
    },
    {
        value: 'free',
        label: 'المواصفة',
        pluralLabel: 'المواصفات',
        addLabel: 'إضافة مواصفة',
        siblingLabel: 'مواصفات أخرى لنفس اللون',
        placeholder: '30ml, L, 2M...',
        emptyHint: 'قياس موحّد',
        presets: [],
    },
]

const CONFIG_BY_KIND = new Map(SKU_SPEC_CONFIGS.map(c => [c.value, c]))

export function normalizeSkuSpecKind(value: string | null | undefined): SkuSpecKind {
    if (value && SKU_SPEC_KINDS.includes(value as SkuSpecKind)) {
        return value as SkuSpecKind
    }
    return DEFAULT_SKU_SPEC_KIND
}

export function getSkuSpecConfig(kind: string | null | undefined): SkuSpecKindConfig {
    return CONFIG_BY_KIND.get(normalizeSkuSpecKind(kind)) ?? CONFIG_BY_KIND.get('free')!
}

export function getSpecLabel(kind: string | null | undefined): string {
    return getSkuSpecConfig(kind).label
}

export function getSpecPluralLabel(kind: string | null | undefined): string {
    return getSkuSpecConfig(kind).pluralLabel
}

export function getAddSpecLabel(kind: string | null | undefined): string {
    return getSkuSpecConfig(kind).addLabel
}

export function getSiblingSpecsLabel(kind: string | null | undefined): string {
    return getSkuSpecConfig(kind).siblingLabel
}

export function getSpecPlaceholder(kind: string | null | undefined): string {
    return getSkuSpecConfig(kind).placeholder
}

export function getSpecEmptyHint(kind: string | null | undefined): string {
    return getSkuSpecConfig(kind).emptyHint
}

/** أزرار سريعة — دائماً يتضمن «قياس موحّد» */
export function getSpecQuickOptions(kind: string | null | undefined): { label: string; value: string }[] {
    const config = getSkuSpecConfig(kind)
    const uniform = { label: config.emptyHint, value: '' }
    if (config.presets.length === 0) {
        return [uniform]
    }
    return [
        uniform,
        ...config.presets.map(p => ({ label: p.label, value: p.suffix })),
    ]
}

export function formatSpecValue(
    sizeLabel: string | null | undefined,
    kind: string | null | undefined = 'free'
): string {
    const trimmed = sizeLabel?.trim()
    if (trimmed) return trimmed
    return getSpecEmptyHint(kind)
}

export function formatItemTitleWithSpec(
    colorName: string,
    sizeLabel: string | null | undefined,
    kind: string | null | undefined = 'free'
): string {
    return `${colorName} · ${formatSpecValue(sizeLabel, kind)}`
}
