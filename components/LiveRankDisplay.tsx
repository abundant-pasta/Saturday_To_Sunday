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
        const offset = 6 * 60 * 60 * 1000 
        const today = new Date(Date.now() - offset).toISOString().split('T')[0]

        const { count: totalCount } = await supabase
          .from('daily_results') 
          .select('*', { count: 'exact', head: true })
          .eq('sport', sport)
          .eq('game_date', today)

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

    if (sport && score > 0) fetchRank()
  }, [score, sport, supabase])

  if (loading || !rank || !total) return null

  return (
    <div className="flex flex-col items-start leading-none">
      <div className="flex items-center gap-1 text-neutral-600 mb-1">
        <Trophy className="w-2.5 h-2.5" />
        <span className="text-[9px] font-black uppercase tracking-widest">Rank</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-2xl font-black italic tracking-tighter text-white">#{rank}</span>
        {/* BUMPED SIZE: Increased from 9px to text-xs (12px) for readability */}
        <span className="text-xs font-bold text-neutral-500 uppercase">/{total}</span>
      </div>
    </div>
  )
}