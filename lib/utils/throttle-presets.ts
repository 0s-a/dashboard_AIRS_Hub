/**
 * lib/utils/throttle-presets.ts
 *
 * Throttle presets + ETA calculation for the announcement send settings tab.
 */

// ─── Presets ─────────────────────────────────────────────────────────────────

export interface ThrottlePreset {
    key:               string
    label:             string
    description:       string
    emoji:             string
    messagesPerMinute: number   // 0 = unlimited
    delayBetweenSeconds: number // 0 = no delay
}

export const THROTTLE_PRESETS: ThrottlePreset[] = [
    {
        key:               "instant",
        label:             "فوري",
        description:       "بلا قيود — لأجهزة قوية",
        emoji:             "🚀",
        messagesPerMinute: 0,
        delayBetweenSeconds: 0,
    },
    {
        key:               "balanced",
        label:             "متوسط",
        description:       "30 رسالة/دقيقة · 2ث بين كل رسالة",
        emoji:             "⚖️",
        messagesPerMinute: 30,
        delayBetweenSeconds: 2,
    },
    {
        key:               "safe",
        label:             "محافظ",
        description:       "10 رسائل/دقيقة · 5ث بين كل رسالة",
        emoji:             "🐢",
        messagesPerMinute: 10,
        delayBetweenSeconds: 5,
    },
    {
        key:               "overnight",
        label:             "ليلي",
        description:       "5 رسائل/دقيقة · إرسال طوال الليل",
        emoji:             "🌙",
        messagesPerMinute: 5,
        delayBetweenSeconds: 10,
    },
]

// ─── ETA Calculation ─────────────────────────────────────────────────────────

export interface ThrottleConfig {
    messagesPerMinute:   number
    delayBetweenSeconds: number
    sendWindowStart?:    string | null  // "HH:MM"
    sendWindowEnd?:      string | null  // "HH:MM"
}

export interface EtaResult {
    totalMinutes:     number
    finishTime:       Date | null
    exceedsWindow:    boolean
    ratePerMinute:    number   // effective rate
    formattedDuration: string
    formattedFinish:  string | null
}

export function calculateEta(
    personCount: number,
    config: ThrottleConfig
): EtaResult {
    const { messagesPerMinute, delayBetweenSeconds, sendWindowStart, sendWindowEnd } = config

    // Calculate effective rate (msgs/min)
    let effectiveRate = 0
    if (messagesPerMinute > 0) {
        // delay further limits throughput
        const delayRate = delayBetweenSeconds > 0 ? 60 / delayBetweenSeconds : Infinity
        effectiveRate = Math.min(messagesPerMinute, delayRate)
    } else if (delayBetweenSeconds > 0) {
        effectiveRate = 60 / delayBetweenSeconds
    }

    // Total minutes
    const totalMinutes = effectiveRate > 0
        ? Math.ceil(personCount / effectiveRate)
        : 0  // instant

    // Finish time = now + totalMinutes
    const finishTime = totalMinutes > 0
        ? new Date(Date.now() + totalMinutes * 60_000)
        : null

    // Check if finish time exceeds send window
    let exceedsWindow = false
    if (finishTime && sendWindowEnd) {
        const [endH, endM] = sendWindowEnd.split(":").map(Number)
        const windowEnd = new Date()
        windowEnd.setHours(endH, endM, 0, 0)
        exceedsWindow = finishTime > windowEnd
    }

    // Format
    const formattedDuration = formatDuration(totalMinutes)
    const formattedFinish   = finishTime
        ? finishTime.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
        : null

    return { totalMinutes, finishTime, exceedsWindow, ratePerMinute: effectiveRate, formattedDuration, formattedFinish }
}

function formatDuration(minutes: number): string {
    if (minutes === 0) return "فوري"
    if (minutes < 60) return `${minutes} دقيقة`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}س ${m}د` : `${h} ساعة`
}
