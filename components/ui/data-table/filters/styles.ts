import { cn } from "@/lib/utils"

export const filterInputBase = cn(
    "w-full h-10 text-sm rounded-lg",
    "bg-background/60 backdrop-blur-sm",
    "border border-border/30",
    "placeholder:text-muted-foreground/40",
    "focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40",
    "transition-all duration-200",
)
