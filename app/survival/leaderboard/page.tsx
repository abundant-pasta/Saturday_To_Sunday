import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Trophy, Home, Skull, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

type ScoreRow = {
  participant_id: string
  score: number
  submitted_at: string
}

type ParticipantRow = {
  id: string
  user_id: string
  status: string
}

type ProfileRow = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url?: string | null
}

export default async function SurvivalLeaderboardPage(props: { searchParams: Promise<{ day?: string }> }) {
  const searchParams = await props.searchParams
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

  const currentDayNumber = Math.max(
    1,
    Math.floor((Date.now() - new Date(tournament.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
  )

  const selectedDay = searchParams.day ? parseInt(searchParams.day) : currentDayNumber

  const { data: tournamentParticipantsRaw } = await supabase
    .from('survival_participants')
    .select('id, user_id, status')
    .eq('tournament_id', tournament.id)

  const tournamentParticipants = (tournamentParticipantsRaw || []) as ParticipantRow[]
  const tournamentParticipantIds = tournamentParticipants.map((participant) => participant.id)

  // 1. Fetch scores for the selected day, restricted to the active tournament.
  const { data: rawScores } = tournamentParticipantIds.length > 0
    ? await supabase
      .from('survival_scores')
      .select('participant_id, score, submitted_at, day_number')
      .eq('day_number', selectedDay)
      .in('participant_id', tournamentParticipantIds)
    : { data: [] as ScoreRow[] }

  let participantIds = Array.from(new Set((rawScores || []).map(s => s.participant_id)))

  // 2. Fetch Active Participants (for current day view)
  // If we are on the current day, we want to see EVERYONE who is still active,
  // even if they haven't recorded a score yet.
  let activeParticipants: ParticipantRow[] = []
  if (selectedDay === currentDayNumber) {
    activeParticipants = tournamentParticipants.filter((participant) => participant.status === 'active')

    // Merge IDs
    const activeIds = activeParticipants.map(p => p.id)
    participantIds = Array.from(new Set([...participantIds, ...activeIds]))
  }

  // 3. Fetch participants and profiles for those who played OR are active
  const participantIdSet = new Set(participantIds)
  const participants = tournamentParticipants.filter((participant) => participantIdSet.has(participant.id))

  const userIds = participants.map(p => p.user_id)

  const { data: profilesRaw } = userIds.length > 0
    ? await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds)
    : { data: [] as ProfileRow[] }

  const profiles = (profilesRaw || []) as ProfileRow[]

  const bestByParticipant = new Map<string, { score: number; submittedAtMs: number }>()
  for (const row of (rawScores || []) as ScoreRow[]) {
    const rowTime = new Date(row.submitted_at).getTime()
    const prev = bestByParticipant.get(row.participant_id)
    if (!prev || row.score > prev.score || (row.score === prev.score && rowTime < prev.submittedAtMs)) {
      bestByParticipant.set(row.participant_id, { score: row.score, submittedAtMs: rowTime })
    }
  }

  const rows = participants.map((p) => {
    const profile = (profiles || []).find(pr => pr.id === p.user_id)
    const best = bestByParticipant.get(p.id)
    return {
      participantId: p.id,
      userId: p.user_id,
      name: profile?.username || profile?.full_name || 'Player',
      score: best?.score ?? -1,
      submittedAtMs: best?.submittedAtMs ?? Number.MAX_SAFE_INTEGER,
      isCurrentlyActive: p.status === 'active'
    }
  })

  rows.sort((a, b) => {
    // Put those who played above those who haven't
    if (a.score === -1 && b.score !== -1) return 1
    if (a.score !== -1 && b.score === -1) return -1
    // Sort by score
    if (a.score !== b.score) return b.score - a.score
    // Sort by submission time
    return a.submittedAtMs - b.submittedAtMs
  })

  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-white p-4 pt-16">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between mb-2">
          <Link href="/survival">
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white rounded-full">
              <Home className="w-5 h-5" />
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-red-400">Survival Leaderboard</h1>
            <div className="flex items-center justify-center gap-3 mt-1">
              {selectedDay > 1 && (
                <Link href={`?day=${selectedDay - 1}`}>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-neutral-500 hover:text-white uppercase font-black">← Prev</Button>
                </Link>
              )}
              <p className="text-[10px] text-white font-black uppercase tracking-widest bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">Day {selectedDay}</p>
              {selectedDay < currentDayNumber && (
                <Link href={`?day=${selectedDay + 1}`}>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-neutral-500 hover:text-white uppercase font-black">Next →</Button>
                </Link>
              )}
            </div>
          </div>
          <div className="w-10" />
        </div>

        <div className="bg-neutral-900 rounded-2xl border border-red-900/40 overflow-hidden shadow-2xl">
          <div className="p-3 border-b border-neutral-800 bg-black/20 text-center">
            <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">
              {selectedDay === currentDayNumber ? (
                <span>{rows.filter(r => r.isCurrentlyActive).length} Survivors Remaining</span>
              ) : (
                <span>{rows.length} participants recorded for Day {selectedDay}</span>
              )}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Skull className="w-8 h-8 text-neutral-800 mx-auto" />
              <p className="text-neutral-600 font-bold uppercase tracking-widest text-[10px]">No scores recorded for this day.</p>
            </div>
          ) : (
            <div className="max-h-[60dvh] overflow-y-auto divide-y divide-neutral-800/50">
              {rows.map((row, idx) => {
                const isMe = !!user && row.userId === user.id
                const profile = profiles.find(pr => pr.id === row.userId)
                const displayName = profile?.username || profile?.full_name || 'Player'
                const avatarUrl = profile?.avatar_url
                const hasPlayed = row.score >= 0
                return (
                  <div
                    key={row.participantId}
                    className={`flex items-center px-4 py-3 text-sm transition-colors ${isMe ? 'bg-red-500/10' : 'hover:bg-neutral-800/30'
                      } ${!hasPlayed ? 'opacity-60' : ''}`}
                  >
                    <div className={`w-8 font-mono font-black ${idx === 0 && hasPlayed ? 'text-yellow-400' : idx === 1 && hasPlayed ? 'text-neutral-300' : idx === 2 && hasPlayed ? 'text-orange-500' : 'text-neutral-600'}`}>
                      {idx + 1}
                    </div>

                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 shrink-0 flex items-center justify-center">
                        {avatarUrl ? (
                          <Image src={avatarUrl} alt={displayName} fill className="object-cover" unoptimized />
                        ) : (
                          <User className="w-4 h-4 text-neutral-500" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className={`truncate leading-tight flex items-center gap-2 ${isMe ? 'text-red-300 font-black' : 'text-neutral-300 font-bold'}`}>
                          {displayName} {isMe && '(You)'}
                          {!row.isCurrentlyActive && (
                            <Skull className="w-3 h-3 text-red-600" />
                          )}
                        </div>
                        <div className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest">
                          {!row.isCurrentlyActive ? 'Eliminated Later' : !hasPlayed ? 'Yet to Play' : 'Still Surviving'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5">
                      <div className="font-mono font-black text-red-400 text-base leading-none">
                        {hasPlayed ? row.score.toLocaleString() : '--'}
                      </div>
                      <div className="text-[8px] text-neutral-600 font-bold uppercase">Points</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-700 pt-2">
          <span className="flex items-center gap-1.5">
            <Skull className="w-3 h-3 text-red-600" /> Currently Eliminated
          </span>
          <span className="text-neutral-900">•</span>
          <span className="flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-yellow-500" /> Top Ranks
          </span>
        </div>
      </div>
    </div>
  )
}
