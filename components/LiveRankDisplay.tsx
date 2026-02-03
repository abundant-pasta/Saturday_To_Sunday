'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trophy, Loader2, Users } from 'lucide-react'

interface LiveRankProps {
  score: number
  sport: string // 'basketball' or 'football'
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
        // 1. Get TOTAL number of games played for this sport
        const { count: totalCount, error: totalError } = await supabase
          .from('games') // <--- Ensure your table name is 'games'
          .select('*', { count: 'exact', head: true })
          .eq('sport', sport)

        if (totalError) throw totalError

        // 2. Get number of players with a HIGHER score
        const { count: betterCount, error: rankError } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('sport', sport)
          .gt('score', score) // greater than my score

        if (rankError) throw rankError

        // Rank = (People better than me) + 1
        setRank((betterCount || 0) + 1)
        setTotal(totalCount || 0)
        
      } catch (err) {
        console.error("Error fetching rank:", err)
      } finally {
        setLoading(false)
      }
    }

    if (sport) {
      fetchRank()
    }
  }, [score, sport, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-slate-500 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs font-mono uppercase">Calculating Rank...</span>
      </div>
    )
  }

  if (!rank || !total) return null

  // Calculate top % for flair
  const topPercent = Math.max(1, Math.round((rank / total) * 100))

  return (
    <div className="w-full max-w-xs mx-auto mt-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col items-center animate-in zoom-in-95 duration-500">
      
      {/* Label */}
      <div className="flex items-center gap-2 text-slate-400 mb-1">
        <Trophy className="w-3 h-3 text-yellow-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Global Ranking</span>
      </div>

      {/* The Big Numbers */}
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-white drop-shadow-lg">
            #{rank}
        </span>
        <span className="text-sm text-slate-500 font-bold flex items-center gap-1">
            <span className="text-slate-600">/</span> {total}
        </span>
      </div>

      {/* Percentile Badge */}
      <div className="mt-2 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
        <p className="text-[10px] font-medium text-slate-300">
            Top <span className={topPercent <= 10 ? 'text-green-400' : 'text-blue-400'}>{topPercent}%</span> of players
        </p>
      </div>
    </div>
  )
}