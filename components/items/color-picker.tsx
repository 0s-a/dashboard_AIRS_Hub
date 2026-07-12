"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, ChevronsUpDown } from "lucide-react"
import type { Color } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
    colors: Color[]
    value: Color | null
    onChange: (color: Color | null) => void
    /** ألوان مستخدمة لنفس المنتج — تُعطَّل في القائمة */
    usedColorIds?: Set<string>
    disabled?: boolean
}

export function ColorPicker({ colors, value, onChange, usedColorIds, disabled }: ColorPickerProps) {
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-label="اختيار اللون"
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                >
                    {value ? (
                        <span className="flex items-center gap-2 truncate">
                            <span
                                className="h-4 w-4 rounded-full border shrink-0"
                                style={{ backgroundColor: value.hexCode }}
                            />
                            <span className="truncate">{value.name}</span>
                            <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                                ({value.code})
                            </span>
                        </span>
                    ) : (
                        "اختر لوناً..."
                    )}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="بحث..." />
                    <CommandList>
                        <CommandEmpty>
                            <span className="text-sm text-muted-foreground">
                                لا توجد ألوان.{" "}
                                <Link href="/colors" className="text-primary hover:underline">
                                    أضف لوناً
                                </Link>
                            </span>
                        </CommandEmpty>
                        <CommandGroup>
                            {colors.map(c => {
                                const isUsed = usedColorIds?.has(c.id) ?? false
                                return (
                                    <CommandItem
                                        key={c.id}
                                        value={`${c.name} ${c.code}`}
                                        disabled={isUsed}
                                        onSelect={() => {
                                            if (isUsed) return
                                            onChange(c)
                                            setOpen(false)
                                        }}
                                        className={cn(isUsed && "opacity-50")}
                                    >
                                        <span
                                            className="h-4 w-4 rounded-full border shrink-0"
                                            style={{ backgroundColor: c.hexCode }}
                                        />
                                        <span>{c.name}</span>
                                        <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                                            {c.code}
                                        </span>
                                        {isUsed && (
                                            <Badge variant="secondary" className="text-[10px] mr-auto">
                                                مستخدم
                                            </Badge>
                                        )}
                                        {!isUsed && (
                                            <Check className={cn("mr-auto h-4 w-4", value?.id === c.id ? "opacity-100" : "opacity-0")} />
                                        )}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
