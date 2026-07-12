// ============================================================
// Variant Presets — Centralized configuration for variant types
// Used in size/material quick-fill options
// ============================================================

export type VariantType = "size" | "material" | "custom"

export interface VariantPreset {
    label: string   // Arabic display name
    suffix: string  // Auto-suggested suffix (English/digits only)
}

export interface VariantTypeConfig {
    value: VariantType
    label: string
    description: string
    presets: VariantPreset[]
}

// ─── Sizes ──────────────────────────────────────────────────

export const SIZE_PRESETS: VariantPreset[] = [
    { label: "صغير جداً", suffix: "XS" },
    { label: "صغير",      suffix: "S"  },
    { label: "وسط",       suffix: "M"  },
    { label: "كبير",      suffix: "L"  },
    { label: "كبير جداً", suffix: "XL" },
    { label: "كبير جداً٢",suffix: "2XL"},
    { label: "كبير جداً٣",suffix: "3XL"},
    { label: "٣٦",        suffix: "36" },
    { label: "٣٨",        suffix: "38" },
    { label: "٤٠",        suffix: "40" },
    { label: "٤٢",        suffix: "42" },
    { label: "٤٤",        suffix: "44" },
]

// ─── Packaging / volume (عبوات) ─────────────────────────────

export const PACKAGING_PRESETS: VariantPreset[] = [
    { label: "30 مل",   suffix: "30ml"  },
    { label: "50 مل",   suffix: "50ml"  },
    { label: "100 مل",  suffix: "100ml" },
    { label: "250 مل",  suffix: "250ml" },
    { label: "500 مل",  suffix: "500ml" },
    { label: "1 لتر",   suffix: "1L"    },
]

/** قيم جاهزة للمقاس/العبوة — تُعرض كأزرار سريعة في نموذج الصنف */
export const SIZE_LABEL_QUICK_OPTIONS: { label: string; value: string }[] = [
    { label: "قياس موحّد", value: "" },
    ...PACKAGING_PRESETS.map(p => ({ label: p.label, value: p.suffix })),
    ...SIZE_PRESETS.map(p => ({ label: p.label, value: p.suffix })),
]


export const MATERIAL_PRESETS: VariantPreset[] = [
    { label: "قطن",     suffix: "CTN" },
    { label: "جلد",     suffix: "LTH" },
    { label: "حرير",    suffix: "SLK" },
    { label: "بوليستر", suffix: "PLS" },
    { label: "صوف",     suffix: "WOL" },
    { label: "كتان",    suffix: "LNN" },
    { label: "نايلون",  suffix: "NYL" },
    { label: "مطاط",    suffix: "RBR" },
]

// ─── Type Configs ────────────────────────────────────────────

export const VARIANT_TYPE_CONFIGS: VariantTypeConfig[] = [
    {
        value: "size",
        label: "حجم",
        description: "متغير بمقاس أو حجم",
        presets: SIZE_PRESETS,
    },
    {
        value: "material",
        label: "مادة",
        description: "متغير بخامة أو مادة التصنيع",
        presets: MATERIAL_PRESETS,
    },
    {
        value: "custom",
        label: "خاص",
        description: "نوع مخصص يدوي",
        presets: [],
    },
]

// ─── Helpers ─────────────────────────────────────────────────

export function getTypeConfig(type: VariantType): VariantTypeConfig {
    return VARIANT_TYPE_CONFIGS.find(c => c.value === type) ?? VARIANT_TYPE_CONFIGS[0]
}

export function getTypeLabel(type: string): string {
    return VARIANT_TYPE_CONFIGS.find(c => c.value === type)?.label ?? type
}
