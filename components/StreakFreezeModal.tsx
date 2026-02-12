'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Flame, X, Loader2, TvMinimal } from 'lucide-react'
import { useRewardedAd } from './RewardedAdProvider'

interface StreakFreezeModalProps {
    isOpen: boolean
    sport: 'football' | 'basketball'
    currentStreak: number
    onWatchAd: () => Promise<void>
    onSkip: () => void
}

const SPORT_THEMES = {
    football: {
        primary: 'text-[#00ff80]',
        bgPrimary: 'bg-[#00ff80]',
        borderPrimary: 'border-[#00ff80]',
        accentColor: '#00ff80',
        emoji: '🏈'
    },
    basketball: {
        primary: 'text-amber-400',
        bgPrimary: 'bg-amber-500',
        borderPrimary: 'border-amber-500',
        accentColor: '#f59e0b',
        emoji: '🏀'
    }
}

export default function StreakFreezeModal({
    isOpen,
    sport,
    currentStreak,
    onWatchAd,
    onSkip
}: StreakFreezeModalProps) {
    const theme = SPORT_THEMES[sport]
    const { isLoadingAd } = useRewardedAd()
    const [isProcessing, setIsProcessing] = useState(false)

    if (!isOpen) return null

    const handleWatchAd = async () => {
        setIsProcessing(true)
        try {
            await onWatchAd()
        } catch (error) {
            console.error('Error watching ad:', error)
        } finally {
            setIsProcessing(false)
        }
    }

    const sportName = sport.charAt(0).toUpperCase() + sport.slice(1)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 shadow-2xl animate-in zoom-in-95 duration-200">
                <CardContent className="pt-8 pb-6 px-6 relative">
                    {/* Close button */}
                    <button
                        onClick={onSkip}
                        disabled={isProcessing || isLoadingAd}
                        className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Streak indicator */}
                    <div className="flex flex-col items-center text-center space-y-4 mb-6">
                        <div className={`relative`}>
                            <Flame className={`w-20 h-20 ${theme.primary} animate-pulse`} fill={theme.accentColor} />
                            <div className="absolute -top-2 -right-2 bg-black border-2 ${theme.borderPrimary} rounded-full w-10 h-10 flex items-center justify-center">
                                <span className={`text-sm font-black ${theme.primary}`}>{currentStreak}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                Impressive Streak!
                            </h2>
                            <p className="text-neutral-400 text-sm leading-relaxed">
                                Your <span className={`font-bold ${theme.primary}`}>{sportName}</span> streak of{' '}
                                <span className={`font-bold ${theme.primary}`}>{currentStreak} days</span> is about to reset.
                            </p>
                            <p className="text-neutral-300 text-base font-semibold">
                                Watch a quick ad for a <span className={theme.primary}>Bye Game</span>? {theme.emoji}
                            </p>
                        </div>
                    </div>

                    {/* Info box */}
                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 mb-6">
                        <div className="flex items-start gap-2 text-xs text-neutral-400">
                            <div className="text-neutral-500 mt-0.5">ℹ️</div>
                            <div>
                                <p className="leading-relaxed">
                                    A <span className="font-semibold text-neutral-300">Bye Game</span> preserves your streak even if you miss a day.
                                </p>
                                <p className="mt-1 text-neutral-500">
                                    Limit: <span className="font-semibold">1 per week</span> per sport
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3">
                        <Button
                            onClick={handleWatchAd}
                            disabled={isProcessing || isLoadingAd}
                            className={`w-full h-12 text-lg font-bold ${theme.bgPrimary} text-black hover:opacity-90 shadow-lg transition-all`}
                        >
                            {isProcessing || isLoadingAd ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Loading Ad...
                                </>
                            ) : (
                                <>
                                    <TvMinimal className="w-5 h-5 mr-2" />
                                    Watch Ad & Save Streak
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={onSkip}
                            disabled={isProcessing || isLoadingAd}
                            variant="ghost"
                            className="w-full h-10 text-sm font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800"
                        >
                            Skip (Streak will reset to 0)
                        </Button>
                    </div>

                    {/* Privacy note */}
                    <p className="text-center text-[10px] text-neutral-600 mt-4 leading-relaxed">
                        By watching this ad, you help support Saturday to Sunday. Ad served by Google.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
