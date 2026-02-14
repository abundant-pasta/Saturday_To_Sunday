'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { Trophy, Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PodiumCelebrationProps {
    rank: number
    score: number
    sport: 'football' | 'basketball'
    onClose: () => void
}

export default function PodiumCelebration({ rank, score, sport, onClose }: PodiumCelebrationProps) {
    const isChampion = rank === 1
    const isRunnerUp = rank === 2
    const isThird = rank === 3

    useEffect(() => {
        if (isChampion) {
            // Big confetti explosion for champion
            const duration = 3000
            const end = Date.now() + duration

            const frame = () => {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#FFD700', '#F59E0B', '#FFFFFF'] // Gold theme
                })
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#FFD700', '#F59E0B', '#FFFFFF']
                })

                if (Date.now() < end) {
                    requestAnimationFrame(frame)
                }
            }
            frame()
        } else {
            // Smaller confetti for podium
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: isRunnerUp ? ['#C0C0C0', '#E5E7EB'] : ['#CD7F32', '#B45309'] // Silver or Bronze theme
            })
        }
    }, [isChampion, isRunnerUp])

    // Theme configuration based on rank
    const getTheme = () => {
        if (isChampion) return {
            bg: 'bg-gradient-to-b from-yellow-900/90 to-black',
            border: 'border-yellow-500',
            text: 'text-yellow-400',
            iconColor: 'text-yellow-400',
            title: 'CHAMPION',
            glow: 'shadow-[0_0_50px_rgba(234,179,8,0.3)]'
        }
        if (isRunnerUp) return {
            bg: 'bg-gradient-to-b from-neutral-800/90 to-black',
            border: 'border-neutral-400',
            text: 'text-neutral-300',
            iconColor: 'text-neutral-400',
            title: 'RUNNER UP',
            glow: 'shadow-[0_0_50px_rgba(163,163,163,0.3)]'
        }
        return {
            bg: 'bg-gradient-to-b from-amber-900/90 to-black',
            border: 'border-amber-700',
            text: 'text-amber-600',
            iconColor: 'text-amber-700',
            title: 'PODIUM FINISH',
            glow: 'shadow-[0_0_50px_rgba(180,83,9,0.3)]'
        }
    }

    const theme = getTheme()

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`relative w-full max-w-sm ${theme.bg} rounded-2xl border ${theme.border} p-8 text-center ${theme.glow} flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500`}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Trophy Icon */}
                <div className={`relative p-6 rounded-full border-4 ${theme.border} bg-black/30`}>
                    <Trophy className={`w-16 h-16 ${theme.iconColor} drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]`} />
                    {isChampion && (
                        <div className="absolute -top-2 -right-2">
                            <Star className="w-8 h-8 text-yellow-200 fill-yellow-200 animate-pulse" />
                        </div>
                    )}
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                    <h2 className={`text-3xl font-black italic uppercase tracking-tighter ${theme.text} drop-shadow-lg`}>
                        {theme.title}
                    </h2>
                    <p className="text-neutral-400 font-medium text-sm">
                        You placed <span className={`font-bold text-white text-lg`}>#{rank}</span> yesterday in {sport}!
                    </p>
                    <div className="text-2xl font-mono font-bold text-white mt-2">
                        Score: {score.toLocaleString()}
                    </div>
                </div>

                {/* Action Button */}
                <Button
                    onClick={onClose}
                    className={`w-full h-12 text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-lg active:scale-95 ${isChampion ? 'bg-yellow-400 hover:bg-yellow-300' : isRunnerUp ? 'bg-neutral-300 hover:bg-neutral-200' : 'bg-amber-600 hover:bg-amber-500'}`}
                >
                    Claim Glory
                </Button>
            </div>
        </div>
    )
}
