'use client'

import { useEffect, useState } from 'react'
import { recoverLegacySurvivalScore } from '@/app/actions/survival'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'

export default function GlobalScoreRecovery() {
    const [hasAttempted, setHasAttempted] = useState(false)

    useEffect(() => {
        if (hasAttempted) return

        const checkAndRecover = async () => {
            const today = new Date(Date.now() - TIMEZONE_OFFSET_MS).toISOString().split('T')[0]
            const lastPlayed = localStorage.getItem('s2s_survival_last_played_date')
            const savedScore = localStorage.getItem('s2s_survival_today_score')

            // If plays matches today AND we have a score
            if (lastPlayed === today && savedScore) {
                // Check if we already tried recovering this specific day in this session?
                // Or rely on backend idempotency (preferred).

                try {
                    const score = parseInt(savedScore, 10)
                    if (!isNaN(score)) {
                        console.log("Attempting to recover legacy survival score:", score)
                        const result = await recoverLegacySurvivalScore(score)
                        if (result?.success) {
                            console.log("Survival score recovered successfully (or already existed).")
                        } else {
                            console.error("Failed to recover survival score:", result?.error)
                        }
                    }
                } catch (e) {
                    console.error("Error parsing legacy score:", e)
                }
            }
            setHasAttempted(true)
        }

        // Small delay to not block hydration/initial paint
        const timer = setTimeout(checkAndRecover, 2000)
        return () => clearTimeout(timer)
    }, [hasAttempted])

    return null
}
