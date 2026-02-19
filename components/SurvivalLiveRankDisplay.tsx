'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Trophy } from 'lucide-react'

interface SurvivalLiveRankDisplayProps {
  align?: 'left' | 'center' | 'right'
  className?: string
}

type ScoreEntry = {
  participant_id: string
  score: number
  submitted_at: string
}

export default function SurvivalLiveRankDisplay({ align = 'left', className = '' }: SurvivalLiveRankDisplayProps) {
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

    const fetchRank = async () => {
      if (!mounted) return
      setLoading(true)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id
        if (!userId) {
          if (mounted) {
            setRank(null)
            setTotal(null)
          }
          return
        }

        const { data: tournament } = await supabase
          .from('survival_tournaments')
          .select('id, start_date')
          .eq('is_active', true)
          .single()

        if (!tournament) {
          if (mounted) {
            setRank(null)
            setTotal(null)
          }
          return
        }

        const { data: myParticipant } = await supabase
          .from('survival_participants')
          .select('id')
          .eq('tournament_id', tournament.id)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single()

        if (!myParticipant) {
          if (mounted) {
            setRank(null)
            setTotal(null)
          }
          return
        }

        const startMs = new Date(tournament.start_date).getTime()
        const nowMs = Date.now()
        const dayNumber = Math.max(1, Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24)) + 1)

        const { data: participants } = await supabase
          .from('survival_participants')
          .select('id')
          .eq('tournament_id', tournament.id)
          .eq('status', 'active')

        const participantIds = (participants || []).map(p => p.id)
        if (participantIds.length === 0) {
          if (mounted) {
            setRank(null)
            setTotal(null)
          }
          return
        }

        const { data: rawScores } = await supabase
          .from('survival_scores')
          .select('participant_id, score, submitted_at')
          .eq('day_number', dayNumber)
          .in('participant_id', participantIds)

        const bestByParticipant = new Map<string, { score: number; submittedAtMs: number }>()
        for (const entry of (rawScores || []) as ScoreEntry[]) {
          const entryTime = new Date(entry.submitted_at).getTime()
          const prev = bestByParticipant.get(entry.participant_id)

          if (!prev) {
            bestByParticipant.set(entry.participant_id, { score: entry.score, submittedAtMs: entryTime })
            continue
          }

          // Keep higher score; tie keeps earlier submission.
          if (entry.score > prev.score || (entry.score === prev.score && entryTime < prev.submittedAtMs)) {
            bestByParticipant.set(entry.participant_id, { score: entry.score, submittedAtMs: entryTime })
          }
        }

        const rankingRows = participantIds.map((participantId) => {
          const scoreEntry = bestByParticipant.get(participantId)
          return {
            participantId,
            score: scoreEntry?.score ?? -1,
            // Missing score is "very late" to stay last in tie-breaks.
            submittedAtMs: scoreEntry?.submittedAtMs ?? Number.MAX_SAFE_INTEGER,
          }
        })

        rankingRows.sort((a, b) => {
          if (a.score !== b.score) return b.score - a.score
          return a.submittedAtMs - b.submittedAtMs
        })

        const myRank = rankingRows.findIndex(r => r.participantId === myParticipant.id)
        if (mounted) {
          setRank(myRank >= 0 ? myRank + 1 : null)
          setTotal(rankingRows.length)
        }
      } catch (error) {
        console.error('Error fetching survival rank:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchRank()
    const interval = setInterval(fetchRank, 30000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [supabase])

  if (loading || !rank || !total) return null

  const alignClass = align === 'center' ? 'items-center' : align === 'right' ? 'items-end' : 'items-start'

  return (
    <div className={`flex flex-col ${alignClass} leading-none ${className}`}>
      <div className="flex items-center gap-1 text-neutral-600 mb-1">
        <Trophy className="w-3 h-3" />
        <span className="text-[10px] font-black uppercase tracking-widest">Survival Rank</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black italic tracking-tighter text-white">#{rank}</span>
        <span className="text-sm font-bold text-neutral-500 uppercase tracking-tighter">/ {total}</span>
      </div>
    </div>
  )
}
