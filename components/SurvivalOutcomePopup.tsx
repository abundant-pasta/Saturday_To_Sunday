'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { Trophy, Skull, Crown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'

type Outcome =
  | { type: 'survived'; title: string; subtitle: string; rankLine?: string }
  | { type: 'eliminated'; title: string; subtitle: string; rankLine?: string }
  | { type: 'winner'; title: string; subtitle: string; rankLine?: string }

export default function SurvivalOutcomePopup() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

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

    async function checkOutcome() {
      if (!mounted) return
      if (pathname?.startsWith('/auth/callback')) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: tournament } = await supabase
        .from('survival_tournaments')
        .select('id, start_date, is_active')
        .eq('is_active', true)
        .single()

      if (!tournament) return

      const now = Date.now()
      const startMs = new Date(tournament.start_date).getTime()
      const dayNumber = Math.max(1, Math.floor((now - startMs) / (1000 * 60 * 60 * 24)) + 1)
      if (dayNumber < 2) return

      const gameDate = new Date(Date.now() - TIMEZONE_OFFSET_MS).toISOString().split('T')[0]
      const seenKey = `s2s_survival_outcome_seen_${tournament.id}_${gameDate}`
      if (localStorage.getItem(seenKey)) return

      const { data: participant } = await supabase
        .from('survival_participants')
        .select('id, status')
        .eq('tournament_id', tournament.id)
        .eq('user_id', session.user.id)
        .single()

      if (!participant) return

      let rankLine: string | undefined = undefined
      const priorDay = dayNumber - 1

      const { data: priorLog } = await supabase
        .from('survival_logs')
        .select('details')
        .eq('tournament_id', tournament.id)
        .eq('day_number', priorDay)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const eliminatedIdsFromLog = Array.isArray(priorLog?.details?.eliminated_ids)
        ? (priorLog.details.eliminated_ids as string[])
        : []

      const { data: activeParticipants } = await supabase
        .from('survival_participants')
        .select('id')
        .eq('tournament_id', tournament.id)
        .eq('status', 'active')

      const activeIds = (activeParticipants || []).map(p => p.id)
      const rankingParticipantIds = Array.from(new Set([...activeIds, ...eliminatedIdsFromLog]))

      if (rankingParticipantIds.length > 0) {
        const { data: scoreRows } = await supabase
          .from('survival_scores')
          .select('participant_id, score, submitted_at')
          .eq('day_number', priorDay)
          .in('participant_id', rankingParticipantIds)

        const bestByParticipant = new Map<string, { score: number; submittedAtMs: number }>()
        for (const row of scoreRows || []) {
          const rowTime = new Date(row.submitted_at).getTime()
          const prev = bestByParticipant.get(row.participant_id)
          if (!prev || row.score > prev.score || (row.score === prev.score && rowTime < prev.submittedAtMs)) {
            bestByParticipant.set(row.participant_id, { score: row.score, submittedAtMs: rowTime })
          }
        }

        const rankedRows = rankingParticipantIds.map((participantId) => {
          const best = bestByParticipant.get(participantId)
          return {
            participantId,
            score: best?.score ?? -1,
            submittedAtMs: best?.submittedAtMs ?? Number.MAX_SAFE_INTEGER,
          }
        })

        rankedRows.sort((a, b) => {
          if (a.score !== b.score) return b.score - a.score
          return a.submittedAtMs - b.submittedAtMs
        })

        const myIdx = rankedRows.findIndex(r => r.participantId === participant.id)
        if (myIdx >= 0) {
          rankLine = `Final Rank: #${myIdx + 1} / ${rankedRows.length}`
        }
      }

      let nextOutcome: Outcome | null = null
      if (participant.status === 'active') {
        nextOutcome = {
          type: 'survived',
          title: `You Survived Day ${dayNumber - 1}`,
          subtitle: `Welcome to Day ${dayNumber}. Stay sharp.`,
          rankLine,
        }
      } else if (participant.status === 'eliminated') {
        nextOutcome = {
          type: 'eliminated',
          title: 'You Were Eliminated',
          subtitle: `The cut happened after Day ${dayNumber - 1}. You'll be back.`,
          rankLine,
        }
      } else if (participant.status === 'winner') {
        nextOutcome = {
          type: 'winner',
          title: 'You Won Survival',
          subtitle: 'Last one standing. Absolute legend.',
          rankLine: rankLine || 'Final Rank: #1',
        }
      }

      if (!nextOutcome) return

      localStorage.setItem(seenKey, '1')
      if (mounted) {
        setOutcome(nextOutcome)
        setOpen(true)
      }
    }

    checkOutcome()
    return () => {
      mounted = false
    }
  }, [pathname, supabase])

  if (!open || !outcome) return null

  const isEliminated = outcome.type === 'eliminated'
  const isWinner = outcome.type === 'winner'

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`w-full max-w-sm rounded-2xl border relative overflow-hidden shadow-2xl ${isEliminated
          ? 'bg-gradient-to-br from-neutral-950 via-red-950/60 to-black border-red-500/40'
          : 'bg-gradient-to-br from-neutral-950 via-emerald-950/60 to-black border-emerald-500/40'
        }`}>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`absolute inset-0 pointer-events-none ${isEliminated ? 'bg-red-500/5' : 'bg-emerald-500/5'} animate-pulse`} />

        <div className="relative z-10 p-6 text-center space-y-4">
          <div className={`mx-auto w-16 h-16 rounded-full border flex items-center justify-center ${isEliminated ? 'bg-red-500/15 border-red-500/30' : 'bg-emerald-500/15 border-emerald-500/30'
            }`}>
            {isWinner ? (
              <Crown className="w-9 h-9 text-amber-400" />
            ) : isEliminated ? (
              <Skull className="w-9 h-9 text-red-400" />
            ) : (
              <Trophy className="w-9 h-9 text-emerald-400" />
            )}
          </div>

          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              {outcome.title}
            </h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-300">
              {outcome.subtitle}
            </p>
            {outcome.rankLine && (
              <p className="mt-2 text-xs font-black uppercase tracking-widest text-amber-300">
                {outcome.rankLine}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              asChild
              className={`w-full h-12 font-black uppercase tracking-widest ${isEliminated
                  ? 'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white border border-red-400/40'
                  : 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white border border-emerald-400/40'
                }`}
              onClick={() => setOpen(false)}
            >
              <Link href="/survival">{isEliminated ? 'View Survival Mode' : 'Continue Survival'}</Link>
            </Button>

            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="w-full text-neutral-400 hover:text-white"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
