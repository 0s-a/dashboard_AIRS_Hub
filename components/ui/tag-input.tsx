"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TagInputProps {
    value: string[]
    onChange: (tags: string[]) => void
    suggestions?: string[]
    placeholder?: string
    className?: string
}

export function TagInput({ value, onChange, suggestions = [], placeholder = "أضف وسماً...", className }: TagInputProps) {
    const [inputValue, setInputValue] = useState("")
    const [showSuggestions, setShowSuggestions] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const filteredSuggestions = suggestions.filter(
        s => s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s)
    )

    const addTag = (tag: string) => {
        const trimmed = tag.trim()
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed])
        }
        setInputValue("")
        setShowSuggestions(false)
        inputRef.current?.focus()
    }

    const removeTag = (index: number) => {
        onChange(value.filter((_, i) => i !== index))
    }

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === "Enter" || e.key === "،" || e.key === ",") && inputValue.trim()) {
            e.preventDefault()
            addTag(inputValue)
        } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
            removeTag(value.length - 1)
        }
    }

    return (
        <div className={cn("relative", className)}>
            <div
                className="flex flex-wrap gap-1.5 min-h-[36px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                {value.map((tag, i) => (
                    <Badge
                        key={i}
                        className="bg-primary/10 text-primary border-0 gap-1 pl-2 pr-1 py-0.5 text-xs font-medium"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTag(i) }}
                            className="rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                        >
                            <X className="h-2.5 w-2.5" />
                        </button>
                    </Badge>
                ))}
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => { setInputValue(e.target.value); setShowSuggestions(true) }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder={value.length === 0 ? placeholder : ""}
                    className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground text-sm"
                />
            </div>
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-popover shadow-md py-1 max-h-40 overflow-auto">
                    {filteredSuggestions.map(s => (
                        <button
                            key={s}
                            type="button"
                            onMouseDown={() => addTag(s)}
                            className="w-full text-right px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
            {value.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                    اضغط Enter أو ، لإضافة وسم — Backspace لحذف الأخير
                </p>
            )}
        </div>
    )
}
