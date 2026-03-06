"use client"

import * as React from "react"
import { Moon, Sun, Laptop } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
    const { setTheme } = useTheme()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl bg-muted/30 border-border/50 hover:bg-muted/50 transition-all duration-300">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-primary" />
                    <span className="sr-only">تبديل الوضع</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center gap-2 cursor-pointer font-medium">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>وضع فاتح</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center gap-2 cursor-pointer font-medium">
                    <Moon className="h-4 w-4 text-primary" />
                    <span>وضع داكن</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center gap-2 cursor-pointer font-medium">
                    <Laptop className="h-4 w-4 text-muted-foreground" />
                    <span>تلقائي (النظام)</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
