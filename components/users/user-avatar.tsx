import { cn } from "@/lib/utils"

interface UserAvatarProps {
    name: string
    color: string
    size?: "sm" | "md" | "lg" | "xl"
    className?: string
}

const sizeMap = {
    sm: "size-7 text-xs",
    md: "size-9 text-sm",
    lg: "size-14 text-xl",
    xl: "size-20 text-3xl",
}

/**
 * Renders a colored circle avatar with the first letter of the user's name.
 * The background color is derived from the user's chosen `color` field.
 */
export function UserAvatar({ name, color, size = "md", className }: UserAvatarProps) {
    const initial = name?.trim()?.[0]?.toUpperCase() ?? "?"

    // Derive a lighter background from the hex color at 15% opacity
    const bg = hexToRgba(color, 0.15)

    return (
        <div
            className={cn(
                "rounded-full flex items-center justify-center font-black shrink-0 select-none border",
                sizeMap[size],
                className
            )}
            style={{
                backgroundColor: bg,
                borderColor: hexToRgba(color, 0.3),
                color: color,
            }}
        >
            {initial}
        </div>
    )
}

function hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace("#", "")
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(99,102,241,${alpha})`
    return `rgba(${r},${g},${b},${alpha})`
}
