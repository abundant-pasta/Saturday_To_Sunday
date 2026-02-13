'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trophy, Medal, Crown, ChevronLeft, Calendar, User as UserIcon, Loader2, Share2, Dribbble, Star, ChevronRight } from 'lucide-react'
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
    const [footballResults, setFootballResults] = useState<RecapResult[]>([])
    const [basketballResults, setBasketballResults] = useState<RecapResult[]>([])
    const [gameDate, setGameDate] = useState('')

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchRecapData = async () => {
            setLoading(true)

            // Game Midnight is 06:00 UTC (6 hours offset)
            const now = new Date()
            const gameTime = new Date(now.getTime() - TIMEZONE_OFFSET_MS)
            const yesterday = new Date(gameTime)
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = yesterday.toISOString().split('T')[0]
            setGameDate(yesterdayStr)

            try {
                const { data: results, error } = await supabase
                    .from('daily_results')
                    .select(`
                        user_id,
                        score,
                        sport,
                        profiles (
                            username,
                            avatar_url
                        )
                    `)
                    .eq('game_date', yesterdayStr)
                    .gt('score', 0)
                    .order('score', { ascending: false })

                if (error) throw error

                const processedResults: RecapResult[] = (results || [])
                    .filter((r: any) => r.user_id !== null && r.profiles)
                    .map((r: any) => ({
                        user_id: r.user_id,
                        score: r.score,
                        sport: r.sport,
                        username: r.profiles?.username || 'Player',
                        avatar_url: r.profiles?.avatar_url
                    }))

                setFootballResults(processedResults.filter(r => r.sport === 'football').slice(0, 3))
                setBasketballResults(processedResults.filter(r => r.sport === 'basketball').slice(0, 3))
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
        const [year, month, day] = dateStr.split('-').map(Number)
        const date = new Date(year, month - 1, day)
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

    const RankItem = ({ result, rank }: { result: RecapResult; rank: number }) => {
        const isFirst = rank === 1
        const rankColor = rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-neutral-300' : 'text-orange-500'

        return (
            <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${isFirst ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-amber-500/30' : 'bg-neutral-900/50 border-neutral-800'}`}>
                <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center font-black italic text-lg ${rankColor}`}>
                    {rank}.
                </div>

                <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl border-2 overflow-hidden bg-neutral-900 ${rankColor} border-current`}>
                    {result.avatar_url ? (
                        <Image src={result.avatar_url} alt={result.username} fill className="object-cover" />
                    ) : (
                        <UserIcon className="w-6 h-6 m-auto absolute inset-0 text-neutral-700" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black uppercase truncate ${isFirst ? 'text-white' : 'text-neutral-300'}`}>
                        {result.username}
                        {isFirst && <Crown className="inline-block w-3 h-3 ml-2 text-amber-500 mb-1" />}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Top Performer</p>
                </div>

                <div className="text-right">
                    <p className={`text-lg font-black tabular-nums ${rankColor}`}>
                        {result.score.toLocaleString()}
                    </p>
                    <p className="text-[8px] text-neutral-600 font-bold uppercase tracking-widest">Points</p>
                </div>
            </div>
        )
    }

    const RenderSportList = ({ results, sport }: { results: RecapResult[]; sport: 'football' | 'basketball' }) => {
        if (results.length === 0) return (
            <div className="text-center py-8 bg-neutral-900/30 rounded-2xl border border-neutral-800">
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">No stats for yesterday</p>
            </div>
        )

        return (
            <div className="space-y-3">
                {results.map((result, index) => (
                    <RankItem key={result.user_id + sport} result={result} rank={index + 1} />
                ))}

                <Link href="/leaderboard" className="block pt-2">
                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 hover:text-white group">
                        View Full Leaderboard
                        <ChevronRight className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1" />
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans">
            <div className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/5 py-4 px-4">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white gap-2">
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                        </Button>
                    </Link>
                    <h1 className="text-sm font-black uppercase italic tracking-tighter">
                        Daily Recap
                    </h1>
                    <Button onClick={handleShare} variant="ghost" size="sm" className="text-[#00ff80]">
                        <Share2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <main className="flex-1 max-w-xl mx-auto w-full p-6 space-y-12">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(gameDate)}
                    </div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                        Yesterday's <span className="text-amber-500">Legends</span>
                    </h2>
                    <p className="text-xs text-neutral-500 font-medium max-w-xs mx-auto">
                        Honoring the elite players who dominated the grid and the court.
                    </p>
                </div>

                <section className="space-y-4">
                    <div className="flex items-center gap-3 pl-2">
                        <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                            <Star className="w-4 h-4 text-[#00ff80] fill-current" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">Gridiron Legends</h3>
                    </div>
                    <RenderSportList results={footballResults} sport="football" />
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-3 pl-2">
                        <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                            <Dribbble className="w-4 h-4 text-amber-500" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400">Court Kings</h3>
                    </div>
                    <RenderSportList results={basketballResults} sport="basketball" />
                </section>

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
