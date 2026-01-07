'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { Loader2, Trophy, User, CalendarDays, Flame } from 'lucide-react'
import Image from 'next/image'

type LeaderboardEntry = {
  score: number
  user_id: string
  profiles: {
    username: string | null
    full_name: string | null
    avatar_url: string | null
    email: string | null
    show_avatar: boolean | null
  }
}

export default function Leaderboard({ currentUserId }: { currentUserId?: string }) {
  const [scores, setScores] = useState<LeaderboardEntry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'daily' | 'weekly'>('daily')
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      
      // --- 6-Hour Shift Logic ---
      const now = new Date()
      const gameDayDate = new Date(now.getTime() - 6 * 60 * 60 * 1000)
      const today = gameDayDate.toISOString().split('T')[0]

      if (view === 'daily') {
        // --- 1. DAILY FETCH ---
        const { data } = await supabase
          .from('daily_results')
          .select(`
            score, 
            user_id, 
            profiles (username, full_name, avatar_url, email, show_avatar)
          `)
          .eq('game_date', today)
          .not('user_id', 'is', null) // FILTER LIST
          .order('score', { ascending: false })
          .limit(50)

        if (data) setScores(data as any)

        // --- 2. DAILY COUNT (FIXED) ---
        // Now checking for NOT NULL user_id here too
        const { count } = await supabase
          .from('daily_results')
          .select('*', { count: 'exact', head: true })
          .eq('game_date', today)
          .not('user_id', 'is', null) // <--- ADDED THIS
        
        if (count !== null) setTotalCount(count)

      } else {
        // --- 3. WEEKLY FETCH ---
        const { data, error } = await supabase.rpc('get_weekly_leaderboard')

        if (data) {
          // Filter out guests from weekly view just in case
          const realUsers = data.filter((row: any) => row.user_id !== null)

          const formatted: LeaderboardEntry[] = realUsers.map((row: any) => ({
            score: row.score,
            user_id: row.user_id,
            profiles: {
              username: row.username,
              full_name: row.full_name,
              avatar_url: row.avatar_url,
              email: row.email,
              show_avatar: row.show_avatar
            }
          }))
          setScores(formatted)
          setTotalCount(realUsers.length)
        }
      }

      setLoading(false)
    }

    fetchLeaderboard()
  }, [currentUserId, view])

  return (
    <div className="w-full max-w-md mx-auto mt-6 bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-2xl font-sans">
      
      {/* HEADER WITH TOGGLE */}
      <div className="bg-neutral-900/50 px-4 py-3 border-b border-neutral-800 flex flex-col gap-3">
        
        <div className="flex items-center justify-between">
            <h3 className="font-bold text-neutral-200 uppercase tracking-widest text-xs flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Leaderboard
            </h3>
            <span className="text-[10px] text-neutral-500 font-mono font-bold">
                {view === 'daily' 
                  ? new Date(Date.now() - 6 * 60 * 60 * 1000).toLocaleDateString()
                  : 'Mon - Sun'
                }
            </span>
        </div>

        {/* TOGGLE SWITCH */}
        <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 relative">
             <button 
                onClick={() => setView('daily')}
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

        {/* Player Count */}
        <div className="text-[10px] text-neutral-500 font-bold text-center border-t border-neutral-800/50 pt-2 uppercase tracking-wide">
            {totalCount} players {view === 'daily' ? 'today' : 'this week'}
        </div>

      </div>

      <div className="max-h-64 overflow-y-auto divide-y divide-neutral-800/50 scrollbar-thin scrollbar-thumb-neutral-700">
        {loading ? (
             <div className="flex justify-center py-8"><Loader2 className="animate-spin text-neutral-600" /></div>
        ) : scores.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs uppercase tracking-widest font-bold">
                No scores yet. Be the first!
            </div>
        ) : (
            scores.map((entry, index) => {
            const isMe = entry.user_id === currentUserId
            const rank = index + 1
            
            let displayName = entry.profiles?.username || entry.profiles?.full_name || entry.profiles?.email?.split('@')[0] || 'Anonymous'

            const showPhoto = entry.profiles?.show_avatar !== false 
            const avatarUrl = entry.profiles?.avatar_url

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
                    <span className={`truncate max-w-[140px] ${isMe ? 'text-[#00ff80] font-bold' : 'text-neutral-300'}`}>
                        {displayName} {isMe && '(You)'}
                    </span>
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