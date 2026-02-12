'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trophy, Loader2 } from 'lucide-react'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'

interface LiveRankProps {
  score: number
  sport: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

export default function LiveRankDisplay({ score, sport, align = 'left', className = '' }: LiveRankProps) {
  const [rank, setRank] = useState<number | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    let mounted = true
    async function fetchRank() {
      setLoading(true)
      try {
        const today = new Date(Date.now() - TIMEZONE_OFFSET_MS).toISOString().split('T')[0]

        // Get total count for the day
        const { count: totalCount } = await supabase
          .from('daily_results')
          .select('*', { count: 'exact', head: true })
          .eq('sport', sport)
          .eq('game_date', today)

        // Count how many people have a better score
        const { count: betterCount } = await supabase
          .from('daily_results')
          .select('*', { count: 'exact', head: true })
          .eq('sport', sport)
          .eq('game_date', today)
          .gt('score', score)

        if (mounted) {
          setRank((betterCount || 0) + 1)
          setTotal(totalCount || 0)
        }
      } catch (err) {
        console.error("Error fetching rank:", err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (sport && score > 0) fetchRank()
    return () => { mounted = false }
  }, [score, sport, supabase])

  if (loading || !rank || !total) return null

  const alignClass = align === 'center' ? 'items-center' : align === 'right' ? 'items-end' : 'items-start'

  return (
    <div className={`flex flex-col ${alignClass} leading-none ${className}`}>
      <div className="flex items-center gap-1 text-neutral-600 mb-1">
        <Trophy className="w-3 h-3" />
        <span className="text-[10px] font-black uppercase tracking-widest">Rank</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black italic tracking-tighter text-white">#{rank}</span>
        <span className="text-sm font-bold text-neutral-500 uppercase tracking-tighter">/ {total}</span>
      </div>
    </div>
  )
}