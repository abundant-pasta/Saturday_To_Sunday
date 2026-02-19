import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Trophy, Home, Skull } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

type ScoreRow = {
  participant_id: string
  score: number
  submitted_at: string
}

export default async function SurvivalLeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: tournament } = await supabase
    .from('survival_tournaments')
    .select('id, name, start_date, is_active')
    .eq('is_active', true)
    .single()

  if (!tournament) {
    return (
      <div className="min-h-[100dvh] bg-neutral-950 text-white p-4 pt-20">
        <div className="max-w-md mx-auto text-center space-y-3">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">No Active Survival Event</h1>
          <Link href="/survival">
            <Button className="bg-neutral-800 hover:bg-neutral-700">Back to Survival</Button>
          </Link>
        </div>
      </div>
    )
  }

  const dayNumber = Math.max(
    1,
    Math.floor((Date.now() - new Date(tournament.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
  )

  const { data: participants } = await supabase
    .from('survival_participants')
    .select('id, user_id, status')
    .eq('tournament_id', tournament.id)
    .eq('status', 'active')

  const participantIds = (participants || []).map(p => p.id)
  const userIds = (participants || []).map(p => p.user_id)

  const { data: profiles } = userIds.length > 0
    ? await supabase
      .from('profiles')
      .select('id, username, full_name')
      .in('id', userIds)
    : { data: [] as any[] }

  const { data: rawScores } = participantIds.length > 0
    ? await supabase
      .from('survival_scores')
      .select('participant_id, score, submitted_at')
      .eq('day_number', dayNumber)
      .in('participant_id', participantIds)
    : { data: [] as ScoreRow[] }

  const bestByParticipant = new Map<string, { score: number; submittedAtMs: number }>()
  for (const row of (rawScores || []) as ScoreRow[]) {
    const rowTime = new Date(row.submitted_at).getTime()
    const prev = bestByParticipant.get(row.participant_id)
    if (!prev || row.score > prev.score || (row.score === prev.score && rowTime < prev.submittedAtMs)) {
      bestByParticipant.set(row.participant_id, { score: row.score, submittedAtMs: rowTime })
    }
  }

  const rows = (participants || []).map((p) => {
    const profile = (profiles || []).find(pr => pr.id === p.user_id)
    const best = bestByParticipant.get(p.id)
    return {
      participantId: p.id,
      userId: p.user_id,
      name: profile?.username || profile?.full_name || 'Player',
      score: best?.score ?? -1,
      submittedAtMs: best?.submittedAtMs ?? Number.MAX_SAFE_INTEGER,
    }
  })

  rows.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    return a.submittedAtMs - b.submittedAtMs
  })

  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-white p-4 pt-16">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/survival">
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white rounded-full">
              <Home className="w-5 h-5" />
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-red-400">Survival Leaderboard</h1>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Day {dayNumber} • Active Field</p>
          </div>
          <div className="w-10" />
        </div>

        <div className="bg-neutral-900 border border-red-900/40 rounded-2xl p-4 shadow-2xl">
          {rows.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 font-bold uppercase tracking-widest text-xs">
              No Active Participants
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row, idx) => {
                const isMe = !!user && row.userId === user.id
                return (
                  <div
                    key={row.participantId}
                    className={`flex items-center justify-between rounded-xl px-3 py-3 border ${
                      isMe ? 'bg-red-500/10 border-red-500/40' : 'bg-black/30 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 text-center font-black ${idx < 3 ? 'text-red-400' : 'text-neutral-500'}`}>
                        #{idx + 1}
                      </div>
                      <div className="font-bold truncate">{row.name}</div>
                    </div>
                    <div className="font-black tabular-nums text-red-400">
                      {row.score >= 0 ? row.score.toLocaleString() : '-'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <Skull className="w-3 h-3 text-red-500" />
            Ties broken by earlier submission
          </span>
        </div>
      </div>
    </div>
  )
}

