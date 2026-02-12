'use client'

import { useState } from 'react'
import { useRewardedAd } from './RewardedAdProvider'
import { Snowflake, Loader2, TvMinimal, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EarnFreezeButtonProps {
    sport: 'football' | 'basketball'
    userId: string
    hasFreeze: boolean
    canEarnFreeze: boolean
    hoursUntilReset?: number
    onFreezeEarned?: () => void
}

const THEMES = {
    football: {
        bg: 'bg-gradient-to-br from-green-900/20 to-emerald-900/20',
        bgPrimary: 'bg-green-500',
        text: 'text-green-400',
        border: 'border-green-500/30',
        icon: '🏈'
    },
    basketball: {
        bg: 'bg-gradient-to-br from-amber-900/20 to-orange-900/20',
        bgPrimary: 'bg-amber-500',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
        icon: '🏀'
    }
}

export default function EarnFreezeButton({
    sport,
    userId,
    hasFreeze,
    canEarnFreeze,
    hoursUntilReset = 0,
    onFreezeEarned
}: EarnFreezeButtonProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const { showAd, isLoadingAd, adReady } = useRewardedAd()
    const theme = THEMES[sport]

    const handleEarnFreeze = async () => {
        if (!adReady || isProcessing) return

        setIsProcessing(true)

        try {
            // Show rewarded ad
            const adWatched = await showAd()

            if (adWatched) {
                // Call API to award the freeze
                const response = await fetch('/api/earn-streak-freeze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, sport })
                })

                const data = await response.json()

                if (response.ok) {
                    // Success!
                    onFreezeEarned?.()
                } else {
                    console.error('Failed to earn freeze:', data.error)
                    alert(data.error || 'Failed to earn freeze. Please try again.')
                }
            }
        } catch (error) {
            console.error('Error earning freeze:', error)
            alert('An error occurred. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    // Render different states
    if (hasFreeze) {
        return (
            <div className={`flex items-center gap-3 p-4 rounded-xl ${theme.bg} border ${theme.border}`}>
                <div className={`p-2 rounded-full ${theme.bgPrimary}`}>
                    <CheckCircle2 className="w-5 h-5 text-black" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-semibold text-white">
                        {theme.icon} Freeze Ready
                    </div>
                    <div className="text-xs text-neutral-400">
                        Your streak is protected
                    </div>
                </div>
                <Snowflake className={`w-6 h-6 ${theme.text}`} />
            </div>
        )
    }

    if (!canEarnFreeze) {
        return (
            <div className={`flex items-center gap-3 p-4 rounded-xl ${theme.bg} border ${theme.border} opacity-60`}>
                <div className="p-2 rounded-full bg-neutral-700">
                    <Clock className="w-5 h-5 text-neutral-400" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-semibold text-neutral-300">
                        Weekly Limit Reached
                    </div>
                    <div className="text-xs text-neutral-400">
                        Resets in {hoursUntilReset}h
                    </div>
                </div>
            </div>
        )
    }

    // Can earn freeze - show button
    return (
        <div className={`p-4 rounded-xl ${theme.bg} border ${theme.border}`}>
            <div className="flex items-center gap-3 mb-3">
                <Snowflake className={`w-5 h-5 ${theme.text}`} />
                <div>
                    <div className="text-sm font-semibold text-white">
                        Earn Streak Freeze
                    </div>
                    <div className="text-xs text-neutral-400">
                        Watch an ad to protect your streak
                    </div>
                </div>
            </div>

            <Button
                onClick={handleEarnFreeze}
                disabled={isProcessing || isLoadingAd || !adReady}
                className={`w-full ${theme.bgPrimary} text-black hover:opacity-90 font-semibold`}
            >
                {isProcessing || isLoadingAd ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading Ad...
                    </>
                ) : (
                    <>
                        <TvMinimal className="w-4 h-4 mr-2" />
                        Watch Ad to Earn
                    </>
                )}
            </Button>

            <div className="mt-2 text-xs text-neutral-500 text-center">
                {theme.icon} Limit: 1 per week • Resets Monday
            </div>

            {/* DEV BYPASS BUTTON */}
            <button
                onClick={async () => {
                    setIsProcessing(true)
                    // Simulate 2s delay
                    await new Promise(r => setTimeout(r, 2000))

                    // Call API directly
                    const response = await fetch('/api/earn-streak-freeze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, sport })
                    })

                    if (response.ok) {
                        onFreezeEarned?.()
                    } else {
                        alert('Failed to simulate earn')
                    }
                    setIsProcessing(false)
                }}
                className="w-full mt-2 py-1 text-[10px] text-neutral-600 hover:text-white border border-dashed border-neutral-800 rounded hover:bg-neutral-800 transition-colors"
            >
                [TEST: Simulate Ad Watch]
            </button>
        </div>
    )
}
