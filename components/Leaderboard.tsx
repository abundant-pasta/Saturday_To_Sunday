'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { Loader2, Trophy, User, CalendarDays, Flame, Filter, Users, ChevronLeft, ChevronRight, Target, Star, Dribbble } from 'lucide-react'
import Image from 'next/image'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'

type LeaderboardEntry = {
    score: number
    results_json?: any
    correctCount?: number | null
    user_id: string | null
    guest_id: string | null
    profiles: {
        username: string | null
        full_name: string | null
        avatar_url: string | null
        show_avatar: boolean | null
        // UPDATED: Now specific streaks
        streak_football: number | null
        streak_basketball: number | null
    }
}

// THEME CONFIG
const THEMES = {
    football: {
        label: 'Football',
        icon: Star,
        color: 'text-[#00ff80]',
        bgColor: 'bg-[#00ff80]',
        ring: 'ring-[#00ff80]',
        maxQuestions: 10
    },
    basketball: {
        label: 'Basketball',
        icon: Dribbble,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500',
        ring: 'ring-amber-500',
        maxQuestions: 5
    }
}

interface LeaderboardProps {
    currentUserId?: string
    defaultSport?: 'football' | 'basketball'
    squadId?: string
}

export default function Leaderboard({ currentUserId, defaultSport = 'football', squadId }: LeaderboardProps) {
    const [scores, setScores] = useState<LeaderboardEntry[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)

    // FILTERS
    const [view, setView] = useState<'daily' | 'weekly'>('daily')
    const [sport, setSport] = useState<'football' | 'basketball'>(defaultSport)

    const [showGuests, setShowGuests] = useState(false)
    const [currentGuestId, setCurrentGuestId] = useState<string | null>(null)
    const [dateOffset, setDateOffset] = useState(0)

    const theme = THEMES[sport]

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const localId = localStorage.getItem('s2s_guest_id')
            setCurrentGuestId(localId)
        }

        const fetchLeaderboard = async () => {
            setLoading(true)

            const now = new Date()
            const msPerDay = 24 * 60 * 60 * 1000

            // SQUAD PRE-FILTER
            let squadMemberIds: string[] | null = null
            if (squadId) {
                const { data: members } = await supabase
                    .from('squad_members')
                    .select('user_id')
                    .eq('squad_id', squadId)

                if (!members || members.length === 0) {
                    setScores([])
                    setTotalCount(0)
                    setLoading(false)
                    return
                }
                squadMemberIds = members.map(m => m.user_id)
            }

            let top20Part: any[] = []
            let userWindowPart: any[] = []
            let myRank: number | null = null

            if (view === 'daily') {
                const gameTimestamp = now.getTime() - TIMEZONE_OFFSET_MS - (dateOffset * msPerDay)
                const targetDateObj = new Date(gameTimestamp)
                const targetDateStr = targetDateObj.toISOString().split('T')[0]

                // 1. Fetch Total Count first to know ranks
                let countQuery = supabase
                    .from('daily_results')
                    .select('*', { count: 'exact', head: true })
                    .eq('game_date', targetDateStr)
                    .eq('sport', sport)

                if (squadMemberIds) countQuery = countQuery.in('user_id', squadMemberIds)
                if (!showGuests) countQuery = countQuery.not('user_id', 'is', null)

                const { count } = await countQuery
                if (count !== null) setTotalCount(count)

                // 2. Fetch Top 20
                let topQuery = supabase
                    .from('daily_results')
                    .select(`
                        score, 
                        user_id,
                        guest_id,
                        results:results_json, 
                        profiles (username, full_name, avatar_url, show_avatar, streak_football, streak_basketball)
                    `)
                    .eq('game_date', targetDateStr)
                    .eq('sport', sport)
                    .order('score', { ascending: false })
                    .limit(20)

                if (squadMemberIds) topQuery = topQuery.in('user_id', squadMemberIds)
                if (!showGuests) topQuery = topQuery.not('user_id', 'is', null)

                const { data: topData } = await topQuery
                top20Part = topData || []

                // 3. If User Logged In, and we have > 20 players, find user rank
                if (currentUserId && (count || 0) > 20) {
                    // Find my score/rank
                    // For massive tables, a dedicated rpc('get_rank', { user_id }) is better.
                    // For now, with < 10k users, we can fetch my score and count how many are above it.

                    const { data: myData } = await supabase
                        .from('daily_results')
                        .select('score')
                        .eq('game_date', targetDateStr)
                        .eq('sport', sport)
                        .eq('user_id', currentUserId)
                        .single()

                    if (myData) {
                        // Count users with score > myScore
                        const { count: rankCount } = await supabase
                            .from('daily_results')
                            .select('*', { count: 'exact', head: true })
                            .eq('game_date', targetDateStr)
                            .eq('sport', sport)
                            .gt('score', myData.score)

                        // Handle tie-breakers? For simplicity, rank = count + 1
                        myRank = (rankCount || 0) + 1

                        // If rank > 20 (meaning not in top list), fetch window
                        if (myRank > 20) {
                            // Fetch window: myRank - 3 to myRank + 3
                            // The offset would be myRank - 4 (since 0-indexed and we want 3 above)
                            // But range is slightly tricky with ties. 
                            // Easier: Fetch range based on offset
                            const startRange = Math.max(0, myRank - 4)
                            const endRange = myRank + 2

                            let windowQuery = supabase
                                .from('daily_results')
                                .select(`
                                    score, 
                                    user_id,
                                    guest_id,
                                    results:results_json, 
                                    profiles (username, full_name, avatar_url, show_avatar, streak_football, streak_basketball)
                                `)
                                .eq('game_date', targetDateStr)
                                .eq('sport', sport)
                                .order('score', { ascending: false })
                                .range(startRange, endRange)

                            if (squadMemberIds) windowQuery = windowQuery.in('user_id', squadMemberIds)
                            if (!showGuests) windowQuery = windowQuery.not('user_id', 'is', null)

                            const { data: windowData } = await windowQuery
                            userWindowPart = windowData || []
                        }
                    }
                }

                // MERGE LISTS
                // If userWindowPart is empty or overlaps with Top 20, just use Top 20.
                // If userWindowPart exists separately, add divider.

                // Add explicit Rank property to objects since we map them later
                const finalScores = top20Part.map((item, idx) => ({ ...item, rank: idx + 1 }))

                if (userWindowPart.length > 0) {
                    // Check for overlap or gap
                    const lastTopRank = 20
                    const firstWindowRank = myRank ? Math.max(1, myRank - 3) : 99999

                    if (firstWindowRank > lastTopRank + 1) {
                        // Add Spacer
                        finalScores.push({ isDivider: true, rank: 0 } as any)
                    }

                    // Append window, avoiding duplicates if any overlap occurred (unlikely due to if check but safe)
                    userWindowPart.forEach((item, idx) => {
                        const actualRank = (myRank ? myRank - 3 : 0) + idx
                        if (actualRank > 20) { // Only add if not in top 20
                            finalScores.push({ ...item, rank: actualRank })
                        }
                    })
                }

                const parsedData = finalScores.map((row: any) => {
                    if (row.isDivider) return row
                    return {
                        ...row,
                        correctCount: Array.isArray(row.results)
                            ? row.results.filter((r: any) => {
                                const status = typeof r === 'string' ? r : r?.result
                                return status === 'correct'
                            }).length
                            : null
                    }
                })

                setScores(parsedData)

            } else {
                // WEEKLY VIEW (Simplified: Show Top 50 still for now, or apply same logic if needed)
                // For MVP, applying this only to Daily as requested "where you were located".
                // Logic for Weekly requires aggregation which is harder to range-query efficiently without a materialized view.
                // Keeping Weekly as Top 50.

                const currentDay = now.getDay()
                const diffToMon = currentDay === 0 ? -6 : 1 - currentDay

                const monday = new Date(now)
                monday.setDate(now.getDate() + diffToMon)
                const mondayStr = monday.toISOString().split('T')[0]

                const sunday = new Date(monday)
                sunday.setDate(monday.getDate() + 6)
                const sundayStr = sunday.toISOString().split('T')[0]

                let query = supabase
                    .from('daily_results')
                    .select(`
                        score, 
                        user_id, 
                        profiles!inner (username, full_name, avatar_url, show_avatar, streak_football, streak_basketball)
                    `)
                    .gte('game_date', mondayStr)
                    .lte('game_date', sundayStr)
                    .eq('sport', sport)
                    .not('user_id', 'is', null)

                if (squadMemberIds) {
                    query = query.in('user_id', squadMemberIds)
                }

                const { data } = await query

                if (data) {
                    const userTotals: Record<string, LeaderboardEntry> = {}

                    data.forEach((row: any) => {
                        if (!row.user_id) return

                        if (!userTotals[row.user_id]) {
                            userTotals[row.user_id] = {
                                score: 0,
                                user_id: row.user_id,
                                guest_id: null,
                                profiles: row.profiles,
                                correctCount: null
                            }
                        }
                        userTotals[row.user_id].score += row.score
                    })

                    const sortedWeekly = Object.values(userTotals).sort((a, b) => b.score - a.score)
                    // Add Map Ranks
                    const rankedWeekly = sortedWeekly.slice(0, 50).map((item, idx) => ({ ...item, rank: idx + 1 }))

                    setScores(rankedWeekly)
                    setTotalCount(sortedWeekly.length)
                }
            }

            setLoading(false)
        }

        fetchLeaderboard()
    }, [currentUserId, view, showGuests, dateOffset, sport, squadId])

    const getDisplayName = (entry: LeaderboardEntry) => {
        if (entry.profiles?.username) return entry.profiles.username
        if (entry.profiles?.full_name) return entry.profiles.full_name
        if (entry.guest_id) {
            const shortId = entry.guest_id.slice(-4).toUpperCase()
            return `Guest-${shortId}`
        }
        return 'Anonymous'
    }

    const getDisplayDate = () => {
        if (view === 'weekly') return 'This Week'

        if (dateOffset === 0) return 'Today'
        if (dateOffset === 1) return 'Yesterday'

        const now = new Date()
        const msPerDay = 24 * 60 * 60 * 1000
        const targetTimestamp = now.getTime() - TIMEZONE_OFFSET_MS - (dateOffset * msPerDay)
        return new Date(targetTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    return (
        <div className="w-full max-w-md mx-auto mt-6 bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-2xl font-sans">

            {/* HEADER */}
            <div className="bg-neutral-900/50 px-4 py-3 border-b border-neutral-800 flex flex-col gap-3">

                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-neutral-200 uppercase tracking-widest text-xs flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-500" /> {squadId ? 'Squad Leaderboard' : 'Leaderboard'}
                    </h3>

                    <div className="flex items-center gap-2">
                        {view === 'daily' && (
                            <button
                                onClick={() => setDateOffset(prev => prev + 1)}
                                className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-3 h-3" />
                            </button>
                        )}

                        <span className="text-[10px] text-neutral-500 font-mono font-bold min-w-[60px] text-center">
                            {getDisplayDate()}
                        </span>

                        {view === 'daily' && (
                            <button
                                onClick={() => setDateOffset(prev => prev - 1)}
                                disabled={dateOffset === 0}
                                className={`p-1 rounded transition-colors ${dateOffset === 0 ? 'opacity-30 cursor-not-allowed text-neutral-600' : 'hover:bg-neutral-800 text-neutral-500 hover:text-white'}`}
                            >
                                <ChevronRight className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>

                {/* SPORT TOGGLE */}
                <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 relative">
                    <button
                        onClick={() => setSport('football')}
                        className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${sport === 'football' ? 'bg-neutral-800 text-[#00ff80] shadow-sm ring-1 ring-[#00ff80]/30' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        <Star className="w-3 h-3" /> Football
                    </button>
                    <button
                        onClick={() => setSport('basketball')}
                        className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${sport === 'basketball' ? 'bg-neutral-800 text-amber-500 shadow-sm ring-1 ring-amber-500/30' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        <Dribbble className="w-3 h-3" /> Basketball
                    </button>
                </div>

                {/* VIEW TOGGLE */}
                <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 relative">
                    <button
                        onClick={() => { setView('daily'); setDateOffset(0); }}
                        className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${view === 'daily' ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        <Flame className={`w-3 h-3 ${view === 'daily' ? 'text-orange-500' : 'text-neutral-600'}`} /> Daily
                    </button>
                    <button
                        onClick={() => setView('weekly')}
                        className={`flex-1 text-[10px] font-bold uppercase py-1.5 rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${view === 'weekly' ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        <CalendarDays className={`w-3 h-3 ${view === 'weekly' ? 'text-purple-500' : 'text-neutral-600'}`} /> Weekly
                    </button>
                </div>

                {view === 'daily' && (
                    <div className="flex justify-center border-t border-neutral-800/50 pt-2">
                        <button
                            onClick={() => setShowGuests(!showGuests)}
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-all border border-transparent hover:border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:text-white"
                        >
                            {showGuests ? (
                                <>
                                    <Users className="w-3 h-3" /> Showing All Players
                                </>
                            ) : (
                                <>
                                    <Filter className={`w-3 h-3 ${theme.color}`} /> <span className={theme.color}>Registered Only</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* TOTAL COUNT */}
                <div className="text-[10px] text-neutral-500 font-bold text-center pt-1 uppercase tracking-wide">
                    {totalCount} {showGuests ? 'total players' : 'registered players'} {view === 'daily' && dateOffset === 0 ? 'today' : view === 'daily' ? 'on this day' : 'this week'}
                </div>
            </div>

            {/* LIST */}
            <div className="max-h-64 overflow-y-auto divide-y divide-neutral-800/50 scrollbar-thin scrollbar-thumb-neutral-700">
                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-neutral-600" /></div>
                ) : scores.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 text-xs uppercase tracking-widest font-bold">
                        No scores found.
                    </div>
                ) : (
                    scores.map((entry: any, index) => {
                        if (entry.isDivider) {
                            return (
                                <div key={`divider-${index}`} className="flex items-center justify-center py-2">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="h-4 w-0.5 bg-neutral-800 rounded-full"></div>
                                        <div className="h-1 w-1 bg-neutral-700 rounded-full"></div>
                                        <div className="h-1 w-1 bg-neutral-700 rounded-full"></div>
                                        <div className="h-1 w-1 bg-neutral-700 rounded-full"></div>
                                        <div className="h-4 w-0.5 bg-neutral-800 rounded-full"></div>
                                    </div>
                                </div>
                            )
                        }

                        const isMe = (currentUserId && entry.user_id === currentUserId) ||
                            (currentGuestId && entry.guest_id === currentGuestId)

                        const rank = entry.rank // Use pre-calculated rank
                        const displayName = getDisplayName(entry)
                        const showPhoto = entry.profiles?.show_avatar !== false
                        const avatarUrl = entry.profiles?.avatar_url

                        // --- UPDATED: SELECT CORRECT STREAK BASED ON SPORT ---
                        const streak = sport === 'basketball'
                            ? entry.profiles?.streak_basketball || 0
                            : entry.profiles?.streak_football || 0

                        const showStreak = streak > 2

                        const showAccuracy = view === 'daily' && entry.correctCount != null

                        return (
                            <div
                                key={index}
                                className={`flex items-center px-4 py-3 text-sm transition-colors ${isMe ? 'bg-white/5' : 'hover:bg-neutral-800/30'}`}
                            >
                                {/* Rank */}
                                <div className={`w-8 font-mono font-black ${rank === 1 ? 'text-yellow-400' :
                                    rank === 2 ? 'text-neutral-300' :
                                        rank === 3 ? 'text-amber-700' : 'text-neutral-600'
                                    }`}>
                                    {rank}
                                </div>

                                {/* User Info */}
                                <div className="flex-1 flex items-center gap-3">
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 shrink-0 flex items-center justify-center">
                                        {showPhoto && avatarUrl ? (
                                            <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
                                        ) : (
                                            <User className="w-3 h-3 text-neutral-500" />
                                        )}
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        <span className={`truncate max-w-[140px] leading-none ${isMe ? `${theme.color} font-bold` : 'text-neutral-300'} ${!entry.profiles ? 'opacity-70 font-mono text-xs' : ''}`}>
                                            {displayName} {isMe && '(You)'}
                                        </span>

                                        <div className="flex items-center gap-3 mt-1.5">
                                            {showStreak && (
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-500 uppercase tracking-wider">
                                                    <Flame className="w-3.5 h-3.5 fill-orange-500" /> {streak}
                                                </div>
                                            )}
                                            {showAccuracy && (
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                                                    <Target className="w-3.5 h-3.5 text-neutral-600" /> {entry.correctCount}/{theme.maxQuestions}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Score */}
                                <div className={`font-mono font-bold ${view === 'weekly' ? 'text-purple-400' : theme.color}`}>
                                    {entry.score.toLocaleString()}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}