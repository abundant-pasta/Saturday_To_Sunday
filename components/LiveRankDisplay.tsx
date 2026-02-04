'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trophy, Loader2 } from 'lucide-react'

interface LiveRankProps {
  score: number
  sport: string 
}

export default function LiveRankDisplay({ score, sport }: LiveRankProps) {
  const [rank, setRank] = useState<number | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchRank() {
      setLoading(true)
      try {
        // Use the same date logic as your game to target TODAY
        const offset = 6 * 60 * 60 * 1000 
        const today = new Date(Date.now() - offset).toISOString().split('T')[0]

        // 1. Get TOTAL players for TODAY
        const { count: totalCount } = await supabase
          .from('daily_results') 
          .select('*', { count: 'exact', head: true })
          .eq('sport', sport)
          .eq('game_date', today)

        // 2. Get number of players with a HIGHER score TODAY
        const { count: betterCount } = await supabase
          .from('daily_results')
          .select('*', { count: 'exact', head: true })
          .eq('sport', sport)
          .eq('game_date', today)
          .gt('score', score) 

        setRank((betterCount || 0) + 1)
        setTotal(totalCount || 0)
        
      } catch (err) {
        console.error("Error fetching rank:", err)
      } finally {
        setLoading(false)
      }
    }

    if (sport && score > 0) {
      fetchRank()
    }
  }, [score, sport, supabase])

  if (loading) return (
    <div className="flex items-center justify-center gap-2 text-neutral-500 py-4">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest">Calculating Live Rank...</span>
    </div>
  )

  if (!rank || !total) return null

  const topPercent = Math.max(1, Math.round((rank / total) * 100))

  return (
    <div className="w-full py-4 border-t border-white/5 mt-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-center gap-2 text-neutral-500 mb-2">
        <Trophy className="w-3 h-3 text-yellow-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Live Daily Standings</span>
      </div>

      <div className="flex items-baseline justify-center gap-2">
        <span className="text-4xl font-black text-white italic">#{rank}</span>
        <span className="text-sm text-neutral-500 font-bold">/ {total}</span>
      </div>

      <div className="mt-2 flex justify-center">
        <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10">
          <p className="text-[10px] font-black uppercase tracking-tighter">
            Top <span className={topPercent <= 10 ? 'text-[#00ff80]' : 'text-blue-400'}>{topPercent}%</span> of players
          </p>
        </div>
      </div>
    </div>
  )
}