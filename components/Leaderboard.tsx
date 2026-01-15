'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { Loader2, Trophy, User, CalendarDays, Flame, Filter, Users, ChevronLeft, ChevronRight, Target } from 'lucide-react'
import Image from 'next/image'

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
    current_streak: number | null
  }
}

export default function Leaderboard({ currentUserId }: { currentUserId?: string }) {
  const [scores, setScores] = useState<LeaderboardEntry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'daily' | 'weekly'>('daily')
  const [showGuests, setShowGuests] = useState(false) 
  const [currentGuestId, setCurrentGuestId] = useState<string | null>(null)
  const [dateOffset, setDateOffset] = useState(0) 

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
      
      if (view === 'daily') {
        const gameTimestamp = now.getTime() - (6 * 60 * 60 * 1000) - (dateOffset * msPerDay)
        const targetDateObj = new Date(gameTimestamp)
        const targetDateStr = targetDateObj.toISOString().split('T')[0]
        
        let query = supabase
          .from('daily_results')
          .select(`
            score, 
            user_id,
            guest_id,
            results:results_json, 
            profiles (username, full_name, avatar_url, show_avatar, current_streak)
          `)
          .eq('game_date', targetDateStr)
          .order('score', { ascending: false })
          .limit(50)

        if (!showGuests) {
            query = query.not('user_id', 'is', null)
        }

        const { data } = await query
        
        const parsedData = data?.map((row: any) => ({
            ...row,
            correctCount: Array.isArray(row.results) 
                ? row.results.filter((r: string) => r === 'correct').length 
                : null 
        }))

        if (parsedData) setScores(parsedData as any)

        let countQuery = supabase
          .from('daily_results')
          .select('*', { count: 'exact', head: true })
          .eq('game_date', targetDateStr)
        
        if (!showGuests) {
            countQuery = countQuery.not('user_id', 'is', null)
        }
        const { count } = await countQuery
        if (count !== null) setTotalCount(count)

      } else {
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
             profiles!inner (username, full_name, avatar_url, show_avatar, current_streak)
          `)
          .gte('game_date', mondayStr)
          .lte('game_date', sundayStr)
          .not('user_id', 'is', null) 
        
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
           setScores(sortedWeekly)
           setTotalCount(sortedWeekly.length)
        }
      }

      setLoading(false)
    }

    fetchLeaderboard()
  }, [currentUserId, view, showGuests, dateOffset])

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
    const targetTimestamp = now.getTime() - (6 * 60 * 60 * 1000) - (dateOffset * msPerDay)
    return new Date(targetTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="w-full max-w-md mx-auto mt-6 bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-2xl font-sans">
      
      {/* HEADER */}
      <div className="bg-neutral-900/50 px-4 py-3 border-b border-neutral-800 flex flex-col gap-3">
        
        <div className="flex items-center justify-between">
            <h3 className="font-bold text-neutral-200 uppercase tracking-widest text-xs flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Leaderboard
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
                            <Filter className="w-3 h-3 text-[#00ff80]" /> <span className="text-[#00ff80]">Registered Only</span>
                        </>
                    )}
                </button>
            </div>
        )}

        {/* ADDED: Total Count Display */}
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
            scores.map((entry, index) => {
            
            const isMe = (currentUserId && entry.user_id === currentUserId) || 
                         (currentGuestId && entry.guest_id === currentGuestId)

            const rank = index + 1
            const displayName = getDisplayName(entry)
            const showPhoto = entry.profiles?.show_avatar !== false 
            const avatarUrl = entry.profiles?.avatar_url
            const streak = entry.profiles?.current_streak || 0
            const showStreak = streak > 2
            
            const showAccuracy = view === 'daily' && entry.correctCount != null

            return (
                <div 
                    key={index} 
                    className={`flex items-center px-4 py-3 text-sm transition-colors ${isMe ? 'bg-[#00ff80]/10' : 'hover:bg-neutral-800/30'}`}
                >
                <div className={`w-8 font-mono font-black ${
                    rank === 1 ? 'text-yellow-400' : 
                    rank === 2 ? 'text-neutral-300' : 
                    rank === 3 ? 'text-amber-700' : 'text-neutral-600'
                }`}>
                    {rank}
                </div>

                <div className="flex-1 flex items-center gap-3">
                    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 shrink-0 flex items-center justify-center">
                        {showPhoto && avatarUrl ? (
                            <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
                        ) : (
                            <User className="w-3 h-3 text-neutral-500" />
                        )}
                    </div>
                    
                    <div className="flex flex-col justify-center">
                        <span className={`truncate max-w-[140px] leading-none ${isMe ? 'text-[#00ff80] font-bold' : 'text-neutral-300'} ${!entry.profiles ? 'opacity-70 font-mono text-xs' : ''}`}>
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
                                    <Target className="w-3.5 h-3.5 text-neutral-600" /> {entry.correctCount}/10
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={`font-mono font-bold ${view === 'weekly' ? 'text-purple-400' : 'text-[#00ff80]'}`}>
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