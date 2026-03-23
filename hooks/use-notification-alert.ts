"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { getUnreadCount } from "@/lib/actions/notifications"

const POLL_INTERVAL = 30_000 // 30 seconds

/**
 * Generates a soft two-tone notification chime using AudioContext.
 * No external audio file needed.
 */
function playNotificationSound() {
    try {
        const ctx = new AudioContext()
        const now = ctx.currentTime

        // First tone (higher pitch)
        const osc1 = ctx.createOscillator()
        const gain1 = ctx.createGain()
        osc1.type = "sine"
        osc1.frequency.setValueAtTime(880, now) // A5
        gain1.gain.setValueAtTime(0.15, now)
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
        osc1.connect(gain1).connect(ctx.destination)
        osc1.start(now)
        osc1.stop(now + 0.3)

        // Second tone (lower, slightly delayed)
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.type = "sine"
        osc2.frequency.setValueAtTime(1174.66, now + 0.15) // D6
        gain2.gain.setValueAtTime(0, now)
        gain2.gain.setValueAtTime(0.12, now + 0.15)
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
        osc2.connect(gain2).connect(ctx.destination)
        osc2.start(now + 0.15)
        osc2.stop(now + 0.5)

        // Cleanup
        setTimeout(() => ctx.close(), 1000)
    } catch {
        // AudioContext unavailable — silently ignore
    }
}

/**
 * Global hook for notification alerts.
 * - Polls unread count every 30s.
 * - Pauses when tab is hidden (Visibility API).
 * - Plays a sound when new notifications arrive.
 * - Returns `unreadCount` for badge display.
 */
export function useNotificationAlert() {
    const [unreadCount, setUnreadCount] = useState(0)
    const prevCountRef = useRef<number | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const fetchCount = useCallback(async () => {
        try {
            const res = await getUnreadCount()
            if (res.success && typeof res.data === "number") {
                const newCount = res.data

                // Play sound only if count increased (not on first load)
                if (prevCountRef.current !== null && newCount > prevCountRef.current) {
                    playNotificationSound()
                }

                prevCountRef.current = newCount
                setUnreadCount(newCount)
            }
        } catch {
            // Network errors — silently skip this poll cycle
        }
    }, [])

    useEffect(() => {
        // Initial fetch
        fetchCount()

        // Start polling
        const startPolling = () => {
            if (intervalRef.current) return
            intervalRef.current = setInterval(fetchCount, POLL_INTERVAL)
        }

        const stopPolling = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }

        // Visibility API: pause polling when tab is hidden
        const handleVisibility = () => {
            if (document.hidden) {
                stopPolling()
            } else {
                fetchCount() // immediately fetch when tab becomes visible
                startPolling()
            }
        }

        startPolling()
        document.addEventListener("visibilitychange", handleVisibility)

        return () => {
            stopPolling()
            document.removeEventListener("visibilitychange", handleVisibility)
        }
    }, [fetchCount])

    return { unreadCount, refetch: fetchCount }
}
