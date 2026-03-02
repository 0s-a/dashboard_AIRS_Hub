"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export type OptionType = {
  label: string
  value: string
}

interface MultiSelectProps {
  options: OptionType[]
  selected: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "اختر...",
  emptyMessage = "لا توجد خيارات.",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleUnselect = (itemValue: string) => {
    onChange(selected.filter((i) => i !== itemValue))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-auto min-h-10 hover:bg-background",
            selected.length > 0 ? "py-1.5 px-3" : "py-2 px-3",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center max-w-[90%]">
            {selected.length === 0 && (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            )}
            {selected.map((itemValue) => {
              const option = options.find((o) => o.value === itemValue)
              if (!option) return null
              return (
                <Badge
                  key={itemValue}
                  variant="secondary"
                  className="rounded-sm px-1.5 py-0 border bg-muted hover:bg-muted/80 text-foreground font-medium"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  <span className="text-[11px] truncate">{option.label}</span>
                  <div
                    className="mr-1 ring-offset-background rounded-full outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer opacity-70 hover:opacity-100"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(itemValue)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleUnselect(itemValue)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </div>
                </Badge>
              )
            })}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="ابحث..." className="h-9" />
          <CommandList className="max-h-60">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      if (isSelected) {
                        handleUnselect(option.value)
                      } else {
                        onChange([...selected, option.value])
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className={cn("h-3 w-3")} />
                    </div>
                    <span>{option.label}</span>
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
