'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { Loader2, Trophy, User } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // --- THE FIX: 6-Hour Shift Logic ---
      const now = new Date()
      // Subtract 6 hours (in milliseconds)
      // This means 5:59 AM UTC is still "Yesterday"
      // And 6:01 AM UTC becomes "Today"
      const gameDayDate = new Date(now.getTime() - 6 * 60 * 60 * 1000)
      const today = gameDayDate.toISOString().split('T')[0]
      // ------------------------------------

      const { data, error } = await supabase
        .from('daily_results')
        .select(`
          score, 
          user_id, 
          profiles (username, full_name, avatar_url, email, show_avatar)
        `)
        .eq('game_date', today)
        .order('score', { ascending: false })
        .limit(50)

      if (data) {
        setScores(data as any)
      }
      setLoading(false)
    }

    fetchLeaderboard()
  }, [])

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-500" /></div>

  return (
    <div className="w-full max-w-md mx-auto mt-6 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
      <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-slate-200 uppercase tracking-widest text-xs flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" /> Daily Leaderboard
        </h3>
        {/* We also update the display date to match the logic */}
        <span className="text-[10px] text-slate-500 font-mono">
            {new Date(Date.now() - 6 * 60 * 60 * 1000).toLocaleDateString()}
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/50 scrollbar-thin scrollbar-thumb-slate-700">
        {scores.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
                No scores yet today. Be the first!
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
                    className={`flex items-center px-4 py-3 text-sm ${isMe ? 'bg-indigo-900/20' : ''}`}
                >
                <div className={`w-8 font-mono font-black ${
                    rank === 1 ? 'text-yellow-400' : 
                    rank === 2 ? 'text-slate-300' : 
                    rank === 3 ? 'text-amber-700' : 'text-slate-600'
                }`}>
                    {rank}
                </div>

                <div className="flex-1 flex items-center gap-3">
                    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center">
                        {showPhoto && avatarUrl ? (
                            <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
                        ) : (
                            <User className="w-3 h-3 text-slate-500" />
                        )}
                    </div>
                    <span className={`truncate max-w-[140px] ${isMe ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}>
                        {displayName} {isMe && '(You)'}
                    </span>
                </div>

                <div className="font-mono font-bold text-green-400">
                    {entry.score}
                </div>
                </div>
            )
            })
        )}
      </div>
    </div>
  )
}