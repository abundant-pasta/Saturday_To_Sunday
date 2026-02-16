'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trophy } from 'lucide-react'
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

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  useEffect(() => {
    let mounted = true

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    async function fetchRank() {
      setLoading(true)

      try {
        const MAX_ATTEMPTS = 6
        const RETRY_DELAY_MS = 180
        const today = new Date(Date.now() - TIMEZONE_OFFSET_MS).toISOString().split('T')[0]

        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id || null
        const guestId = typeof window !== 'undefined' ? localStorage.getItem('s2s_guest_id') : null

        for (let attempt = 1; attempt <= MAX_ATTEMPTS && mounted; attempt++) {
          const { data, count, error } = await supabase
            .from('daily_results')
            .select('score, user_id, guest_id', { count: 'exact' })
            .eq('sport', sport)
            .eq('game_date', today)

          if (error) throw error

          const allRows = data || []
          const allScores = allRows.map(d => d.score)
          const betterCount = allScores.filter(s => s > score).length
          const computedRank = betterCount + 1
          const computedTotal = count ?? allRows.length

          const hasOwnEntry = userId
            ? allRows.some(r => r.user_id === userId)
            : !!guestId && allRows.some(r => r.guest_id === guestId)

          if (hasOwnEntry || attempt === MAX_ATTEMPTS) {
            // Guard against transient reads where rank reflects local score but total has not caught up yet.
            setRank(computedRank)
            setTotal(Math.max(computedTotal, computedRank))
            break
          }

          await wait(RETRY_DELAY_MS)
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
