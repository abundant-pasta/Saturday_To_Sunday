'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Home, Trophy, Star, Medal, Shield, Lock, Flame, Zap, Crown, LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getConference } from '@/lib/conferences'

// --- TYPES ---
interface Milestone {
    id: string
    name: string
    description: string
    target: number
    icon: LucideIcon
    color: string
}

interface TeamBadge {
    id: string
    name: string
    description: string
    target: number
    current: number
    unlocked: boolean
    icon: LucideIcon
}

interface Player {
    id: string
    name: string
    college: string
    conference?: string
    image_url?: string
}

interface DailyResult {
    game_date: string
    score: number
    results_json: Array<string | { result: string; player_id?: string }> | null
}

// --- MILESTONES ---
const CAREER_MILESTONES: Milestone[] = [
    { id: 'novice', name: 'The Recruit', description: 'Collect 10 total players', target: 10, icon: Star, color: 'text-blue-400' },
    { id: 'expert', name: 'All-American', description: 'Collect 50 total players', target: 50, icon: Medal, color: 'text-amber-400' },
    { id: 'master', name: 'Heisman Legend', description: 'Collect 100 total players', target: 100, icon: Trophy, color: 'text-[#00ff80]' },
    { id: 'hall_of_fame', name: 'Hall of Fame', description: 'Collect 250 total players', target: 250, icon: Crown, color: 'text-purple-500' },
    { id: 'goat', name: 'The GOAT', description: 'Collect 500 total players', target: 500, icon: Flame, color: 'text-red-500' }
]

const STREAK_MILESTONES: Milestone[] = [
    { id: 'hot_hand', name: 'Hot Hand', description: '5 Day Streak', target: 5, icon: Flame, color: 'text-orange-500' },
    { id: 'on_fire', name: 'On Fire', description: '10 Day Streak', target: 10, icon: Zap, color: 'text-yellow-400' },
    { id: 'unstoppable', name: 'Unstoppable', description: '20 Day Streak', target: 20, icon: Star, color: 'text-blue-500' },
    { id: 'iron_man', name: 'Iron Man', description: '50 Day Streak', target: 50, icon: Shield, color: 'text-red-500' },
    { id: 'the_machine', name: 'The Machine', description: '75 Day Streak', target: 75, icon: Trophy, color: 'text-indigo-400' },
    { id: 'century_club', name: 'Century Club', description: '100 Day Streak', target: 100, icon: Crown, color: 'text-amber-300' },
    { id: 'dynasty', name: 'Dynasty', description: '200 Day Streak', target: 200, icon: Medal, color: 'text-[#00ff80]' },
    { id: 'legend', name: 'Living Legend', description: '365 Day Streak', target: 365, icon: Trophy, color: 'text-purple-400' }
]

export default function CollectionPage() {
    const [loading, setLoading] = useState(true)
    const [players, setPlayers] = useState<Player[]>([])
    const [legacyCount, setLegacyCount] = useState(0)
    const [maxStreak, setMaxStreak] = useState(0)
    const [view, setView] = useState<'earned' | 'progress'>('earned')

    // Derived state for badges
    const [teamBadges, setTeamBadges] = useState<TeamBadge[]>([])
    const [dailyWins, setDailyWins] = useState({
        football: 0,
        basketball: 0,
        fb_podium: 0,
        bk_podium: 0,
        fb_top10: 0,
        bk_top10: 0
    })

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                setLoading(false)
                return
            }

            try {
                // 1. Get ALL daily results
                const { data: results, error } = await supabase
                    .from('daily_results')
                    .select('game_date, score, results_json')
                    .eq('user_id', session.user.id)
                    .order('game_date', { ascending: true })

                if (error || !results) throw error

                const dailyResults = results as DailyResult[]

                // 2. Process Results
                const collectedIds = new Set<string>()
                let legCount = 0
                let currentRun = 0
                let maxRun = 0
                let lastDate: Date | null = null

                dailyResults.forEach((day) => {
                    // --- STREAK CALCULATION ---
                    const hasResult = day.results_json && Array.isArray(day.results_json) && day.results_json.some(r => r === "correct" || (typeof r === 'object' && r?.result === "correct"))
                    const hasWin = day.score > 0 || hasResult

                    if (hasWin) {
                        const currentDate = new Date(day.game_date)
                        if (lastDate) {
                            const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime())
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                            if (diffDays === 1) {
                                currentRun++ // Consecutive day
                            } else if (diffDays > 1) {
                                currentRun = 1 // Streak broken
                            }
                        } else {
                            currentRun = 1 // First win
                        }
                        lastDate = currentDate
                        maxRun = Math.max(maxRun, currentRun)
                    }

                    // --- COLLECTION LOGIC ---
                    if (day.results_json) {
                        day.results_json.forEach((item) => {
                            if (typeof item === 'object' && item !== null && item.result === 'correct' && item.player_id) {
                                collectedIds.add(item.player_id)
                            }
                            else if (typeof item === 'string' && item.toLowerCase() === 'correct') {
                                legCount++
                            }
                        })
                    }
                })

                setLegacyCount(legCount)
                setMaxStreak(maxRun)

                // 3. Metadata
                let enrichedPlayers: Player[] = []
                if (collectedIds.size > 0) {
                    const { data: playersData, error: playersError } = await supabase
                        .from('players')
                        .select('*')
                        .in('id', Array.from(collectedIds))

                    if (playersError) throw playersError

                    enrichedPlayers = ((playersData as Player[]) || []).map((p) => ({
                        ...p,
                        conference: getConference(p.college) || "Unknown"
                    }))
                }

                setPlayers(enrichedPlayers)

                // 4. Team Badges
                const teamCounts: Record<string, number> = {}
                enrichedPlayers.forEach(p => {
                    if (p.college) {
                        teamCounts[p.college] = (teamCounts[p.college] || 0) + 1
                    }
                })

                const badges: TeamBadge[] = Object.entries(teamCounts)
                    .map(([team, count]) => ({
                        id: `team_${team.replace(/\s+/g, '_').toLowerCase()}`,
                        name: `${team} Faithful`,
                        description: `Collect 10 players from ${team}`,
                        target: 10,
                        current: count,
                        unlocked: count >= 10,
                        icon: Shield
                    }))
                    .sort((a, b) => {
                        if (a.unlocked && !b.unlocked) return -1
                        if (!a.unlocked && b.unlocked) return 1
                        return (b.current / b.target) - (a.current / a.target)
                    })

                setTeamBadges(badges)

                // 5. Daily Wins from Profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('football_daily_wins, basketball_daily_wins, football_podium_finishes, basketball_podium_finishes, football_top_10_finishes, basketball_top_10_finishes')
                    .eq('id', session.user.id)
                    .single()

                if (profile) {
                    setDailyWins({
                        football: profile.football_daily_wins || 0,
                        basketball: profile.basketball_daily_wins || 0,
                        fb_podium: profile.football_podium_finishes || 0,
                        bk_podium: profile.basketball_podium_finishes || 0,
                        fb_top10: profile.football_top_10_finishes || 0,
                        bk_top10: profile.basketball_top_10_finishes || 0
                    })
                }
            } catch (err) {
                console.error("Error fetching collection:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [supabase]) // Added supabase dependency

    // Global Stats
    const totalCollected = players.length + legacyCount
    const totalDailyWins = (dailyWins.football > 0 ? 1 : 0) + (dailyWins.basketball > 0 ? 1 : 0) +
        (dailyWins.fb_podium > 0 ? 1 : 0) + (dailyWins.bk_podium > 0 ? 1 : 0) +
        (dailyWins.fb_top10 > 0 ? 1 : 0) + (dailyWins.bk_top10 > 0 ? 1 : 0)
    const totalBadges = CAREER_MILESTONES.filter(m => totalCollected >= m.target).length +
        STREAK_MILESTONES.filter(m => maxStreak >= m.target).length +
        teamBadges.filter(b => b.unlocked).length + totalDailyWins

    // Filter Helpers
    const filterMilestones = (list: typeof CAREER_MILESTONES, currentValue: number) => {
        return list.filter(m => {
            const unlocked = currentValue >= m.target
            return view === 'earned' ? unlocked : !unlocked
        })
    }

    const displayedCareerBadges = filterMilestones(CAREER_MILESTONES, totalCollected)
    const displayedStreakBadges = filterMilestones(STREAK_MILESTONES, maxStreak)
    const displayedTeamBadges = teamBadges.filter(b => view === 'earned' ? b.unlocked : !b.unlocked)

    return (
        <div className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans">
            {/* HEADER */}
            <div className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/5 py-4 px-4">
                <div className="max-w-2xl mx-auto flex items-center justify-center">
                    <h1 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Trophy Room
                    </h1>
                </div>
            </div>

            <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-8">

                {/* HERO STATS */}
                <div className="bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 rounded-2xl p-6 text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <span className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Total Players Collected</span>
                        <div className="text-5xl font-black text-white mt-1 tabular-nums tracking-tighter">
                            {totalCollected}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-center gap-8">
                            <div className="text-center">
                                <span className="block text-[10px] text-neutral-500 font-bold uppercase">Best Streak</span>
                                <span className="block text-xl font-black text-white">{maxStreak} Days</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-[10px] text-neutral-500 font-bold uppercase">Badges Earned</span>
                                <span className="block text-xl font-black text-white">{totalBadges}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* GLOBAL FILTER */}
                <div className="flex justify-center">
                    <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                        <button
                            onClick={() => setView('earned')}
                            className={`px-6 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${view === 'earned' ? 'bg-neutral-800 text-white shadow ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            Earned
                        </button>
                        <button
                            onClick={() => setView('progress')}
                            className={`px-6 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-all ${view === 'progress' ? 'bg-neutral-800 text-white shadow ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            In Progress
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-32 rounded-xl bg-neutral-900 animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* --- CAREER MILESTONES --- */}
                        {displayedCareerBadges.length > 0 && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500 pl-1">Career Milestones</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {displayedCareerBadges.map((m) => {
                                        const unlocked = totalCollected >= m.target
                                        const progress = Math.min(100, Math.round((totalCollected / m.target) * 100))

                                        return (
                                            <div key={m.id} className={`relative p-4 rounded-xl border flex flex-col items-center text-center gap-2 ${unlocked ? 'bg-neutral-900 border-neutral-700 shadow-lg' : 'bg-neutral-950 border-neutral-800 opacity-60'}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${unlocked ? `bg-neutral-800 ${m.color} border-current` : 'bg-neutral-900 text-neutral-700 border-neutral-800'}`}>
                                                    {unlocked ? <m.icon className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 flex flex-col justify-center">
                                                    <h3 className={`text-xs font-black uppercase tracking-tight ${unlocked ? 'text-white' : 'text-neutral-500'}`}>{m.name}</h3>
                                                    <p className="text-[9px] text-neutral-400 font-medium leading-tight mt-1">{m.description}</p>
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="w-full mt-2 space-y-1">
                                                    <div className="flex justify-between text-[8px] font-black uppercase text-neutral-500 tracking-wider">
                                                        <span>{totalCollected} / {m.target}</span>
                                                    </div>
                                                    <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-1000 ${unlocked ? 'bg-[#00ff80]' : 'bg-neutral-700'}`} style={{ width: `${progress}%` }} />
                                                    </div>
                                                </div>
                                                {unlocked && <div className="absolute inset-0 border-2 border-[#00ff80]/10 rounded-xl pointer-events-none" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )}

                        {/* --- STREAK MILESTONES --- */}
                        {displayedStreakBadges.length > 0 && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500 pl-1">Streak Milestones</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {displayedStreakBadges.map((m) => {
                                        const unlocked = maxStreak >= m.target
                                        const progress = Math.min(100, Math.round((maxStreak / m.target) * 100))

                                        return (
                                            <div key={m.id} className={`relative p-4 rounded-xl border flex flex-col items-center text-center gap-2 ${unlocked ? 'bg-neutral-900 border-neutral-700 shadow-lg' : 'bg-neutral-950 border-neutral-800 opacity-60'}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${unlocked ? `bg-neutral-800 ${m.color} border-current` : 'bg-neutral-900 text-neutral-700 border-neutral-800'}`}>
                                                    {unlocked ? <m.icon className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 flex flex-col justify-center">
                                                    <h3 className={`text-xs font-black uppercase tracking-tight ${unlocked ? 'text-white' : 'text-neutral-500'}`}>{m.name}</h3>
                                                    <p className="text-[9px] text-neutral-400 font-medium leading-tight mt-1">{m.description}</p>
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="w-full mt-2 space-y-1">
                                                    <div className="flex justify-between text-[8px] font-black uppercase text-neutral-500 tracking-wider">
                                                        <span>{maxStreak} / {m.target}</span>
                                                    </div>
                                                    <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-1000 ${unlocked ? 'bg-white' : 'bg-neutral-700'}`} style={{ width: `${progress}%` }} />
                                                    </div>
                                                </div>
                                                {unlocked && <div className="absolute inset-0 border-2 border-white/10 rounded-xl pointer-events-none" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )}

                        {/* --- TEAM BADGES --- */}
                        {displayedTeamBadges.length > 0 && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                                <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500 pl-1">Team Loyalty</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {displayedTeamBadges.map((badge) => {
                                        const percent = Math.min(100, Math.round((badge.current / badge.target) * 100))

                                        return (
                                            <div key={badge.id} className={`relative p-4 rounded-xl border flex flex-col items-center text-center gap-2 ${badge.unlocked ? 'bg-neutral-900 border-neutral-700 shadow-lg' : 'bg-neutral-950 border-neutral-800 opacity-80'}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${badge.unlocked ? `bg-neutral-800 text-white border-white` : 'bg-neutral-900 text-neutral-600 border-neutral-800'}`}>
                                                    {badge.unlocked ? <badge.icon className="w-5 h-5 fill-current" /> : <Lock className="w-4 h-4" />}
                                                </div>

                                                <div className="flex-1 flex flex-col justify-center">
                                                    <h3 className={`text-xs font-black uppercase tracking-tight ${badge.unlocked ? 'text-white' : 'text-neutral-500'}`}>{badge.name}</h3>
                                                    <p className="text-[9px] text-neutral-400 font-medium leading-tight mt-1">{badge.description}</p>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="w-full mt-2 space-y-1">
                                                    <div className="flex justify-between text-[8px] font-black uppercase text-neutral-500 tracking-wider">
                                                        <span>{badge.current} / {badge.target}</span>
                                                    </div>
                                                    <div className="h-1 w-full bg-neutral-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-1000 ${badge.unlocked ? 'bg-white' : 'bg-neutral-700'}`} style={{ width: `${percent}%` }} />
                                                    </div>
                                                </div>

                                                {badge.unlocked && <div className="absolute inset-0 border-2 border-white/10 rounded-xl pointer-events-none" />}
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )}

                        {/* --- DAILY WINNER BADGES --- */}
                        {(view === 'earned' ? totalDailyWins > 0 : totalDailyWins < 6) && (
                            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                                <h2 className="text-sm font-black uppercase tracking-widest text-neutral-500 pl-1">Daily Dominance</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {/* Football Rank 1 */}
                                    {(view === 'earned' ? dailyWins.football > 0 : dailyWins.football === 0) && (
                                        <div className={`relative p-4 rounded-xl border flex flex-col items-center text-center gap-3 ${dailyWins.football > 0 ? 'bg-gradient-to-br from-emerald-950/30 to-neutral-900 border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'bg-neutral-950 border-neutral-800 opacity-60'}`}>
                                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 ${dailyWins.football > 0 ? 'bg-neutral-800 text-[#00ff80] border-[#00ff80] shadow-[0_0_15px_rgba(0,255,128,0.2)]' : 'bg-neutral-900 text-neutral-700 border-neutral-800'}`}>
                                                {dailyWins.football > 0 ? <Crown className="w-6 h-6" /> : <Lock className="w-4 h-4" />}
                                                {dailyWins.football > 1 && (
                                                    <div className="absolute -top-1 -right-1 bg-[#00ff80] text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-neutral-900 shadow-lg">
                                                        {dailyWins.football}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={`text-[10px] font-black uppercase tracking-tight ${dailyWins.football > 0 ? 'text-white' : 'text-neutral-500'}`}>Gridiron GOAT</h3>
                                                <p className="text-[8px] text-neutral-400 font-medium leading-tight mt-1">#1 Finish (Football)</p>
                                            </div>
                                            {dailyWins.football > 0 && <div className="absolute inset-0 border-2 border-[#00ff80]/5 rounded-xl pointer-events-none" />}
                                        </div>
                                    )}

                                    {/* Football Podium */}
                                    {(view === 'earned' ? dailyWins.fb_podium > 0 : dailyWins.fb_podium === 0) && (
                                        <div className={`relative p-4 rounded-xl border flex flex-col items-center text-center gap-3 ${dailyWins.fb_podium > 0 ? 'bg-gradient-to-br from-neutral-900/50 to-neutral-900 border-neutral-400/30 shadow-lg' : 'bg-neutral-950 border-neutral-800 opacity-60'}`}>
                                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 ${dailyWins.fb_podium > 0 ? 'bg-neutral-800 text-neutral-300 border-neutral-300' : 'bg-neutral-900 text-neutral-700 border-neutral-800'}`}>
                                                {dailyWins.fb_podium > 0 ? <Medal className="w-6 h-6" /> : <Lock className="w-4 h-4" />}
                                                {dailyWins.fb_podium > 1 && (
                                                    <div className="absolute -top-1 -right-1 bg-neutral-300 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-neutral-900 shadow-lg">
                                                        {dailyWins.fb_podium}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={`text-[10px] font-black uppercase tracking-tight ${dailyWins.fb_podium > 0 ? 'text-white' : 'text-neutral-500'}`}>Podium Pro</h3>
                                                <p className="text-[8px] text-neutral-400 font-medium leading-tight mt-1">Top 3 Finish (Football)</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Football Top 10 */}
                                    {(view === 'earned' ? dailyWins.fb_top10 > 0 : dailyWins.fb_top10 === 0) && (
                                        <div className={`relative p-4 rounded-xl border flex flex-col items-center text-center gap-3 ${dailyWins.fb_top10 > 0 ? 'bg-neutral-900 border-neutral-700 shadow-lg' : 'bg-neutral-950 border-neutral-800 opacity-60'}`}>
                                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 ${dailyWins.fb_top10 > 0 ? 'bg-neutral-800 text-blue-400 border-blue-400' : 'bg-neutral-900 text-neutral-700 border-neutral-800'}`}>
                                                {dailyWins.fb_top10 > 0 ? <Shield className="w-6 h-6" /> : <Lock className="w-4 h-4" />}
                                                {dailyWins.fb_top10 > 1 && (
                                                    <div className="absolute -top-1 -right-1 bg-blue-400 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-neutral-900 shadow-lg">
                                                        {dailyWins.fb_top10}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={`text-[10px] font-black uppercase tracking-tight ${dailyWins.fb_top10 > 0 ? 'text-white' : 'text-neutral-500'}`}>Elite Recruit</h3>
                                                <p className="text-[8px] text-neutral-400 font-medium leading-tight mt-1">Top 10 Finish (Football)</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Basketball Rank 1 */}
                                    {(view === 'earned' ? dailyWins.basketball > 0 : dailyWins.basketball === 0) && (
                                        <div className={`relative p-4 rounded-xl border flex flex-col items-center text-center gap-3 ${dailyWins.basketball > 0 ? 'bg-gradient-to-br from-amber-950/30 to-neutral-900 border-amber-500/30 shadow-lg shadow-amber-500/5' : 'bg-neutral-950 border-neutral-800 opacity-60'}`}>
                                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 ${dailyWins.basketball > 0 ? 'bg-neutral-800 text-amber-500 border-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'bg-neutral-900 text-neutral-700 border-neutral-800'}`}>
                                                {dailyWins.basketball > 0 ? <Crown className="w-6 h-6" /> : <Lock className="w-4 h-4" />}
                                                {dailyWins.basketball > 1 && (
                                                    <div className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-neutral-900 shadow-lg">
                                                        {dailyWins.basketball}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={`text-[10px] font-black uppercase tracking-tight ${dailyWins.basketball > 0 ? 'text-white' : 'text-neutral-500'}`}>King of the Court</h3>
                                                <p className="text-[8px] text-neutral-400 font-medium leading-tight mt-1">#1 Finish (Basketball)</p>
                                            </div>
                                            {dailyWins.basketball > 0 && <div className="absolute inset-0 border-2 border-amber-500/5 rounded-xl pointer-events-none" />}
                                        </div>
                                    )}

                                    {/* Basketball Podium */}
                                    {(view === 'earned' ? dailyWins.bk_podium > 0 : dailyWins.bk_podium === 0) && (
                                        <div className={`relative p-4 rounded-xl border flex flex-col items-center text-center gap-3 ${dailyWins.bk_podium > 0 ? 'bg-gradient-to-br from-neutral-900/50 to-neutral-900 border-neutral-400/30 shadow-lg' : 'bg-neutral-950 border-neutral-800 opacity-60'}`}>
                                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 ${dailyWins.bk_podium > 0 ? 'bg-neutral-800 text-orange-300 border-orange-300' : 'bg-neutral-900 text-neutral-700 border-neutral-800'}`}>
                                                {dailyWins.bk_podium > 0 ? <Medal className="w-6 h-6" /> : <Lock className="w-4 h-4" />}
                                                {dailyWins.bk_podium > 1 && (
                                                    <div className="absolute -top-1 -right-1 bg-orange-300 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-neutral-900 shadow-lg">
                                                        {dailyWins.bk_podium}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={`text-[10px] font-black uppercase tracking-tight ${dailyWins.bk_podium > 0 ? 'text-white' : 'text-neutral-500'}`}>Hoops Star</h3>
                                                <p className="text-[8px] text-neutral-400 font-medium leading-tight mt-1">Top 3 Finish (Basketball)</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Basketball Top 10 */}
                                    {(view === 'earned' ? dailyWins.bk_top10 > 0 : dailyWins.bk_top10 === 0) && (
                                        <div className={`relative p-4 rounded-xl border flex flex-col items-center text-center gap-3 ${dailyWins.bk_top10 > 0 ? 'bg-neutral-900 border-neutral-700 shadow-lg' : 'bg-neutral-950 border-neutral-800 opacity-60'}`}>
                                            <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 ${dailyWins.bk_top10 > 0 ? 'bg-neutral-800 text-indigo-400 border-indigo-400' : 'bg-neutral-900 text-neutral-700 border-neutral-800'}`}>
                                                {dailyWins.bk_top10 > 0 ? <Shield className="w-6 h-6" /> : <Lock className="w-4 h-4" />}
                                                {dailyWins.bk_top10 > 1 && (
                                                    <div className="absolute -top-1 -right-1 bg-indigo-400 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-neutral-900 shadow-lg">
                                                        {dailyWins.bk_top10}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={`text-[10px] font-black uppercase tracking-tight ${dailyWins.bk_top10 > 0 ? 'text-white' : 'text-neutral-500'}`}>Court Elite</h3>
                                                <p className="text-[8px] text-neutral-400 font-medium leading-tight mt-1">Top 10 Finish (Basketball)</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* EMPTY STATE */}
                        {displayedCareerBadges.length === 0 && displayedStreakBadges.length === 0 && displayedTeamBadges.length === 0 && (
                            <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 mb-4">
                                    <Trophy className="w-8 h-8 text-neutral-600" />
                                </div>
                                <h3 className="text-sm font-black uppercase text-neutral-400 tracking-wider">No Trophies {view === 'earned' ? 'Here Yet' : 'In Progress'}</h3>
                                <p className="text-xs text-neutral-500 mt-2 max-w-xs mx-auto">
                                    {view === 'earned'
                                        ? "Keep playing daily to unlock your first badge!"
                                        : "You've completed all current milestones! Check your Earned tab."}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    )
}
