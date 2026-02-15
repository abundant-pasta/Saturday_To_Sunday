'use client'

import { useState, useEffect, Suspense } from 'react'
import { useUI } from '@/context/UIContext'
import { getSurvivalGame } from '@/app/actions/survival'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Home, Share2, Loader2, Trophy, Flame, Skull, Shield, Sword } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'
import { RewardedAdProvider } from '@/components/RewardedAdProvider'
import { hashAnswer } from '@/utils/crypto'

const THEME = {
    primary: 'text-red-500',
    bgPrimary: 'bg-red-600',
    borderPrimary: 'border-red-600',
    cardBg: 'bg-neutral-900', // More austere for survival
    ring: 'ring-red-500',
    icon: Flame,
    label: 'The Gauntlet'
}

const CONFIG = {
    rounds: 10,
    maxScore: 1500, // Normalized to standard 10-round scoring
    pointScale: 1.0 // Standard points
}

const getGameDate = () => {
    return new Date(Date.now() - TIMEZONE_OFFSET_MS).toISOString().split('T')[0]
}

const getMultiplier = (tier: number) => {
    // Harder tiers for survival maybe?
    // Let's stick to standard basketball multipliers: 1.0, 1.5, 1.75
    const multipliers: Record<number, number> = {
        1: 1.0,
        2: 1.5,
        3: 1.75,
    }
    return multipliers[tier] || 1.0
}

const cleanText = (text: string) => text ? text.replace(/&amp;/g, '&') : ''

const getGuestId = () => {
    if (typeof window === 'undefined') return null
    let id = localStorage.getItem('s2s_guest_id')
    if (!id) {
        id = 'guest_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
        localStorage.setItem('s2s_guest_id', id)
    }
    return id
}

const getRankTitle = (score: number) => {
    if (score >= 1200) return { title: "Gauntlet Legend", icon: Trophy }
    if (score >= 900) return { title: "Survivor", icon: Sword }
    if (score >= 500) return { title: "Contender", icon: Shield }
    return { title: "Eliminated", icon: Skull }
}

export default function SurvivalGridWrapper() {
    return (
        <RewardedAdProvider>
            <Suspense fallback={<div className="bg-neutral-950 min-h-screen flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>}>
                <SurvivalGrid />
            </Suspense>
        </RewardedAdProvider>
    )
}

function SurvivalGrid() {
    const { setHeaderHidden } = useUI()

    const [questions, setQuestions] = useState<any[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [gameState, setGameState] = useState<'loading' | 'intro' | 'playing' | 'finished'>('loading')

    // Update header visibility based on game state
    useEffect(() => {
        setHeaderHidden(gameState === 'playing')
        // Reset on unmount
        return () => setHeaderHidden(false)
    }, [gameState, setHeaderHidden])

    type ResultEntry = { player_id: number; result: 'correct' | 'wrong'; player_name: string }
    const [results, setResults] = useState<ResultEntry[]>([])
    const [potentialPoints, setPotentialPoints] = useState(100)
    const [selectedOption, setSelectedOption] = useState<string | null>(null)
    const [showResult, setShowResult] = useState(false)
    const [isImageReady, setIsImageReady] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [isSaved, setIsSaved] = useState(false)
    const [lastEarnedPoints, setLastEarnedPoints] = useState<number>(0)
    const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null)

    // Bonus states
    const [receivedBonus, setReceivedBonus] = useState<number | null>(null)
    const [bonusReason, setBonusReason] = useState<string | null>(null)

    // ... (supabase client and effects remain, jumping to handleGuess)

    const handleGuess = async (option: string) => {
        if (showResult) return
        setSelectedOption(option)
        const currentQ = questions[currentIndex]

        // Verify answer using hash (backward compatible if correct_answer still exists for debug)
        let isCorrect = false
        let correctOpt = currentQ.correct_answer || null

        if (currentQ.correct_answer) {
            isCorrect = option === currentQ.correct_answer
        } else if (currentQ.answer_hash && currentQ.salt) {
            const guessHash = await hashAnswer(option, currentQ.salt)
            isCorrect = guessHash === currentQ.answer_hash

            // Find the correct option for display if we don't have it yet
            if (!correctOpt) {
                // We have to check all options to find the correct one
                for (const opt of currentQ.options) {
                    const h = await hashAnswer(opt, currentQ.salt)
                    if (h === currentQ.answer_hash) {
                        correctOpt = opt
                        break
                    }
                }
            }
        }

        setRevealedAnswer(correctOpt)

        // Calculate streak logic for 10 rounds
        // Let's do simple bonuses: 5 in a row = 50, 10 in a row = 150
        let currentStreakCount = 0
        for (let i = currentIndex - 1; i >= 0; i--) {
            const res = results[i]
            if (res.result === 'correct') currentStreakCount++
            else break
        }
        if (isCorrect) currentStreakCount++
        else currentStreakCount = 0

        let newScore = score
        let pointsEarned = 0
        let bonus = 0

        if (isCorrect) {
            const basePoints = Math.round(potentialPoints * getMultiplier(currentQ.tier || 1) * CONFIG.pointScale)

            if (currentStreakCount === 6) { bonus = 50; setBonusReason("6 IN A ROW!") }
            if (currentStreakCount === 10) { bonus = 150; setBonusReason("PERFECT 10!") }

            pointsEarned = basePoints + bonus
            newScore += pointsEarned

            setScore(newScore)
            setReceivedBonus(bonus > 0 ? bonus : null)
            setLastEarnedPoints(pointsEarned)
        } else {
            setReceivedBonus(null)
            setBonusReason(null)
            setLastEarnedPoints(0)
        }

        const newResults = [...results]
        newResults[currentIndex] = {
            player_id: currentQ.id,
            result: isCorrect ? 'correct' : 'wrong',
            player_name: currentQ.name
        }
        setResults(newResults)
        setShowResult(true)

        setTimeout(() => {
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1)
                setSelectedOption(null)
                setRevealedAnswer(null)
                setShowResult(false)
                setPotentialPoints(100)
                setIsImageReady(false)
                setReceivedBonus(null)
                setBonusReason(null)
                setLastEarnedPoints(0)
            } else {
                localStorage.setItem('s2s_survival_today_score', newScore.toString())
                localStorage.setItem('s2s_survival_last_played_date', getGameDate())
                localStorage.setItem('s2s_survival_daily_results', JSON.stringify(newResults))
                setGameState('finished')
            }
        }, 1500)
    }

    const handleShare = async () => {
        const squares = results.map(r => r.result === 'correct' ? '🟩' : '🟥').join('')
        const rankInfo = getRankTitle(score)
        const text = `Saturday to Sunday: The Gauntlet 🏀\nScore: ${score.toLocaleString()} (${rankInfo.title})\n\n${squares}\n\nCan you survive The Gauntlet?\nhttps://www.playsaturdaytosunday.com/survival`
        try {
            if (navigator.share) await navigator.share({ text })
            else { await navigator.clipboard.writeText(text); alert('Copied!') }
        } catch (err) { await navigator.clipboard.writeText(text) }
    }

    // --- RENDER HELPERS ---

    if (gameState === 'loading') return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading The Gauntlet...</div>

    if (gameState === 'intro') return (
        <div className="h-[100dvh] bg-neutral-950 flex flex-col items-center justify-center p-6 space-y-6 text-center animate-in fade-in relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="space-y-2 relative z-10">
                <Flame className="w-20 h-20 text-red-500 mx-auto animate-pulse" />
                <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                    The <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Gauntlet</span>
                </h1>
                <p className="text-neutral-400 max-w-sm mx-auto">
                    10 Players. 10 Rounds. Zero Forgiveness.
                </p>
            </div>

            <Card className="w-full max-w-sm bg-neutral-900 border-red-900/50 shadow-2xl relative z-10">
                <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm font-bold text-neutral-300">
                        <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                            <div className="text-red-500 mb-1">ROUNDS</div>
                            <div className="text-2xl text-white">10</div>
                        </div>
                        <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                            <div className="text-red-500 mb-1">PLAYERS</div>
                            <div className="text-2xl text-white">CBB Stars</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Button onClick={() => setGameState('playing')} className="w-full max-w-sm h-14 text-xl font-black bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)] border-0 relative z-10 transition-all hover:scale-105 active:scale-95">
                ENTER THE GAUNTLET
            </Button>

            <Link href="/" className="text-neutral-500 hover:text-white text-sm font-bold tracking-widest uppercase mt-4 relative z-10">
                Return to Safety
            </Link>
        </div>
    )

    if (gameState === 'finished') {
        const rankInfo = getRankTitle(score)
        return (
            <div className="min-h-[100dvh] bg-neutral-950 text-white flex flex-col items-center justify-start p-4 space-y-4 animate-in fade-in duration-500 relative overflow-y-auto">
                <Link href="/" className="absolute top-4 left-4 z-20">
                    <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-white rounded-full"><Home className="w-6 h-6" /></Button>
                </Link>

                <div className="text-center space-y-2 mb-2 mt-8">
                    <Trophy className={`w-16 h-16 text-red-500 mx-auto animate-bounce mb-2`} />
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">Gauntlet Complete</h1>
                </div>

                <Card className={`w-full max-w-md bg-neutral-900 border-red-900/30 shadow-2xl relative overflow-hidden shrink-0`}>
                    <CardContent className="pt-8 pb-6 px-6 text-center space-y-6 relative">

                        {/* CENTERED SCORE AND TITLE */}
                        <div className="flex flex-col items-center justify-center gap-2">
                            <div className="flex flex-col items-center">
                                <span className="text-neutral-500 text-[10px] uppercase tracking-[0.15em] font-black mb-1">Final Score</span>
                                <div className={`text-6xl font-black text-red-500 font-mono tracking-tighter leading-none`}>
                                    {score}<span className="text-2xl text-neutral-600">/{CONFIG.maxScore}</span>
                                </div>
                            </div>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-black/40 text-red-500 border-red-900/50 shadow-lg mt-2`}>
                                <rankInfo.icon className="w-4 h-4 fill-current" />
                                <span className="text-xs font-black uppercase tracking-widest">{rankInfo.title}</span>
                            </div>
                        </div>

                        <div className="flex justify-center gap-1 mt-4 flex-wrap">
                            {results.map((r, i) => {
                                const isCorrect = r.result === 'correct'
                                return (
                                    <div key={i} className={`w-6 h-6 rounded-sm ${isCorrect ? 'bg-[#00ff80]' : 'bg-red-600'}`} />
                                )
                            })}
                        </div>

                        <div className="flex flex-col gap-3 mt-6 w-full">
                            <Button onClick={handleShare} className={`w-full h-12 text-lg font-bold bg-white text-black hover:bg-neutral-200 shadow-lg`}>
                                <Share2 className="mr-2 w-5 h-5" /> Share Result
                            </Button>
                            <Button asChild className="w-full h-12 text-lg font-bold bg-neutral-800 text-white hover:bg-neutral-700">
                                <Link href="/">Return Home</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const q = questions[currentIndex]
    if (!q) return null

    return (
        <div className="h-[100dvh] bg-neutral-950 text-white flex flex-col font-sans overflow-hidden">
            <div className="w-full max-w-md mx-auto pt-2 px-2 shrink-0 z-50">
                <div className={`flex items-center justify-between bg-neutral-900 backdrop-blur-md rounded-full px-4 py-2 border border-white/5 shadow-2xl`}>
                    {currentIndex === 0 ? (
                        <Link href="/"><button className="text-neutral-400 hover:text-white"><Home className="w-4 h-4" /></button></Link>
                    ) : (
                        <div className="w-4" />
                    )}
                    <div className="flex items-center gap-2">
                        <div className={`text-lg font-black text-red-500 tabular-nums leading-none`}>{score}</div>
                    </div>
                    <div className="text-[10px] font-bold text-neutral-500 tracking-widest"><span className="text-white">{currentIndex + 1}</span>/{CONFIG.rounds}</div>
                </div>
                <div className="mt-2 px-1">
                    <Progress value={((currentIndex) / CONFIG.rounds) * 100} className={`h-1 bg-neutral-800 rounded-full [&>div]:bg-red-600`} />
                </div>
            </div>

            <main className="flex-1 w-full max-w-md mx-auto p-2 pb-4 flex flex-col gap-2 overflow-hidden h-full">
                <div className={`flex-1 relative bg-neutral-900 rounded-xl overflow-hidden border border-red-900/30 shadow-2xl min-h-0`}>
                    <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                        <div className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg bg-black/80 text-red-500 border border-red-500/30 flex items-center gap-1">
                            <Flame className="w-3 h-3" /> SURVIVAL
                        </div>
                        <div className={`px-3 py-1 rounded-full font-black text-sm shadow-xl transition-all flex items-center gap-2 ${showResult ? (selectedOption === revealedAnswer ? `bg-[#00ff80] text-black` : 'bg-red-500 text-white') : 'bg-white text-black'}`}>
                            {showResult ? (selectedOption === revealedAnswer ? (
                                <>
                                    <span>+{lastEarnedPoints}</span>
                                    {receivedBonus && <span className="text-[10px] bg-black text-[#00ff80] px-1.5 rounded animate-pulse whitespace-nowrap">{bonusReason}</span>}
                                </>
                            ) : '+0') : `+${Math.round(potentialPoints * getMultiplier(q.tier || 1) * CONFIG.pointScale)}`}
                        </div>
                    </div>

                    {q.image_url && <Image src={q.image_url} alt="Player" fill className={`object-cover transition-opacity duration-500 ${isImageReady ? 'opacity-100' : 'opacity-0'}`} onLoadingComplete={() => setIsImageReady(true)} priority={true} />}

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-16 z-10">
                        <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{q.name}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 shrink-0 h-32 md:h-40">
                    {q.options.map((opt: string) => {
                        let btnClass = `bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800`
                        if (showResult) {
                            if (opt === revealedAnswer) btnClass = `bg-[#00ff80] text-black ring-2 ring-[#00ff80]`
                            else if (opt === selectedOption) btnClass = "bg-red-500 text-white"
                            else btnClass = "bg-neutral-950 text-neutral-600 opacity-30"
                        }
                        return (<Button key={opt} onClick={() => handleGuess(opt)} disabled={showResult || !isImageReady} className={`h-full text-xs md:text-sm font-bold uppercase transition-all ${btnClass}`}> {cleanText(opt)} </Button>)
                    })}
                </div>
            </main>
        </div>
    )
}
