'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trophy, Medal, Crown, ChevronLeft, Calendar, User as UserIcon, Loader2, Share2, Dribbble, Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'

interface RecapResult {
    user_id: string
    score: number
    sport: 'football' | 'basketball'
    username: string
    avatar_url?: string
}

export default function RecapPage() {
    const [loading, setLoading] = useState(true)
    const [footballPodium, setFootballPodium] = useState<RecapResult[]>([])
    const [basketballPodium, setBasketballPodium] = useState<RecapResult[]>([])
    const [gameDate, setGameDate] = useState('')

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchRecapData = async () => {
            setLoading(true)

            // 1. Calculate Yesterday's Game Date
            // Game Midnight is 06:00 UTC. 
            // If currentTime - 6 hours results in Today, then Yesterday's game is Today-1.
            const now = new Date()
            const gameTime = new Date(now.getTime() - TIMEZONE_OFFSET_MS)
            const yesterday = new Date(gameTime)
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = yesterday.toISOString().split('T')[0]
            setGameDate(yesterdayStr)

            try {
                // 2. Fetch Top 3 for both sports
                const { data: results, error } = await supabase
                    .from('daily_results')
                    .select(`
            user_id,
            score,
            sport,
            profiles:user_id (
              username,
              user_metadata
            )
          `)
                    .eq('game_date', yesterdayStr)
                    .gt('score', 0)
                    .order('score', { ascending: false })

                if (error) throw error

                const processedResults: RecapResult[] = (results || []).map((r: any) => ({
                    user_id: r.user_id,
                    score: r.score,
                    sport: r.sport,
                    username: r.profiles?.username || 'Anonymous',
                    avatar_url: r.profiles?.user_metadata?.avatar_url
                }))

                setFootballPodium(processedResults.filter(r => r.sport === 'football').slice(0, 3))
                setBasketballPodium(processedResults.filter(r => r.sport === 'basketball').slice(0, 3))
            } catch (err) {
                console.error("Error fetching recap:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchRecapData()
    }, [supabase])

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const handleShare = async () => {
        const text = `🏆 Check out yesterday's legends on Saturday to Sunday!\n\n${formatDate(gameDate)}\n\nJoin the hunt: 👇\nhttps://www.playsaturdaytosunday.com`
        try {
            if (navigator.share) {
                await navigator.share({ text })
            } else {
                await navigator.clipboard.writeText(text)
                alert('Link copied to clipboard!')
            }
        } catch (err) {
            console.error("Error sharing:", err)
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
            <Loader2 className="animate-spin text-neutral-600" />
        </div>
    )

    const PodiumCard = ({ result, rank, color }: { result: RecapResult; rank: number; color: string }) => {
        const isFirst = rank === 1
        const isSecond = rank === 2
        const Icon = isFirst ? Crown : Medal

        return (
            <div className={`relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-500 ${isFirst ? 'bg-gradient-to-b from-neutral-900 to-black scale-110 z-10 border-amber-500/30' : 'bg-neutral-950 border-neutral-800'}`}>
                <div className={`relative mb-3 ${isFirst ? 'w-16 h-16' : 'w-12 h-12'}`}>
                    <div className={`w-full h-full rounded-full border-2 overflow-hidden bg-neutral-900 flex items-center justify-center ${color}`}>
                        {result.avatar_url ? (
                            <Image src={result.avatar_url} alt={result.username} fill className="object-cover" />
                        ) : (
                            <UserIcon className={isFirst ? "w-8 h-8" : "w-6 h-6"} />
                        )}
                    </div>
                    <div className={`absolute -bottom-2 -right-1 w-6 h-6 rounded-full border-2 border-neutral-900 flex items-center justify-center text-[10px] font-black ${color} bg-neutral-800`}>
                        {rank}
                    </div>
                    {isFirst && <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-amber-500 animate-bounce" />}
                </div>
                <div className="text-center overflow-hidden w-full">
                    <p className={`text-xs font-black uppercase truncate ${isFirst ? 'text-white' : 'text-neutral-400'}`}>{result.username}</p>
                    <p className={`text-[10px] font-bold ${color} tabular-nums`}>{result.score.toLocaleString()}</p>
                </div>
                {isFirst && <div className="absolute inset-0 border border-amber-500/10 rounded-2xl pointer-events-none" />}
            </div>
        )
    }

    const RenderSportPodium = ({ results, sport }: { results: RecapResult[]; sport: 'football' | 'basketball' }) => {
        if (results.length === 0) return (
            <div className="text-center py-8 bg-neutral-900/30 rounded-2xl border border-neutral-800">
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">No stats for yesterday</p>
            </div>
        )

        // Reorder for visual podium: [2, 1, 3]
        const visualOrder = [
            results[1], // 2nd
            results[0], // 1st
            results[2]  // 3rd
        ].filter(Boolean)

        return (
            <div className="flex items-end justify-center gap-2 pt-6 pb-2">
                {results[1] && <PodiumCard result={results[1]} rank={2} color="text-neutral-300" />}
                {results[0] && <PodiumCard result={results[0]} rank={1} color="text-amber-500" />}
                {results[2] && <PodiumCard result={results[2]} rank={3} color="text-orange-500" />}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans">
            {/* HEADER */}
            <div className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/5 py-4 px-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white gap-2">
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                        </Button>
                    </Link>
                    <h1 className="text-sm font-black uppercase italic tracking-tighter flex items-center gap-2">
                        Daily Recap
                    </h1>
                    <Button onClick={handleShare} variant="ghost" size="sm" className="text-[#00ff80]">
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-12">
                {/* DATE HERO */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(gameDate)}
                    </div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                        Yesterday's Legends
                    </h2>
                    <p className="text-xs text-neutral-500 font-medium max-w-xs mx-auto">
                        Honoring the elite players who dominated the grid and the court.
                    </p>
                </div>

                {/* FOOTBALL SECTION */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3 pl-2">
                        <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                            <Star className="w-4 h-4 text-[#00ff80] fill-current" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">Gridiron Legends</h3>
                    </div>
                    <RenderSportPodium results={footballPodium} sport="football" />
                </section>

                {/* BASKETBALL SECTION */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3 pl-2">
                        <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                            <Dribbble className="w-4 h-4 text-amber-500" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">Court Kings</h3>
                    </div>
                    <RenderSportPodium results={basketballPodium} sport="basketball" />
                </section>

                {/* FOOTER MESSAGE */}
                <div className="pt-8 text-center bg-gradient-to-b from-transparent to-neutral-900/20 rounded-b-3xl pb-12">
                    <Trophy className="w-8 h-8 text-neutral-800 mx-auto mb-3" />
                    <p className="text-[10px] text-neutral-600 font-black uppercase tracking-[0.2em]">Become a Legend Today</p>
                    <Link href="/" className="inline-block mt-4">
                        <Button className="bg-[#00ff80] hover:bg-[#05ff84] text-black font-black uppercase italic tracking-tighter px-8 rounded-xl shadow-lg shadow-[#00ff80]/10">
                            Play Now
                        </Button>
                    </Link>
                </div>
            </main>
        </div>
    )
}
