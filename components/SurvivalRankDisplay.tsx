'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function SurvivalRankDisplay({ tournamentId, userId }: { tournamentId: string, userId: string }) {
    const [rank, setRank] = useState<string | null>(null)
    const [total, setTotal] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {


        if (userId && tournamentId) {
            const fetchScoredRank = async () => {
                setLoading(true)
                try {
                    // 1. Get my participant ID
                    const { data: me } = await supabase
                        .from('survival_participants')
                        .select('id, status')
                        .eq('user_id', userId)
                        .eq('tournament_id', tournamentId)
                        .single()

                    if (!me) { setLoading(false); return }
                    if (me.status === 'eliminated') {
                        const { count } = await supabase.from('survival_participants').select('*', { count: 'exact', head: true }).eq('tournament_id', tournamentId)
                        setRank('Eliminated')
                        setTotal(count)
                        setLoading(false)
                        return
                    }

                    // 2. Determine current day number (needed to filter scores)
                    const { data: tournament } = await supabase
                        .from('survival_tournaments')
                        .select('start_date')
                        .eq('id', tournamentId)
                        .single()

                    if (!tournament) return

                    const dayNumber = Math.max(
                        1,
                        Math.floor((Date.now() - new Date(tournament.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
                    )

                    // 3. Fetch all active participants
                    const { data: participants } = await supabase
                        .from('survival_participants')
                        .select('id, user_id')
                        .eq('tournament_id', tournamentId)
                        .eq('status', 'active')

                    if (!participants) return
                    const participantIds = participants.map(p => p.id)

                    // 4. Fetch scores for today for these participants
                    const { data: scores } = await supabase
                        .from('survival_scores')
                        .select('participant_id, score, submitted_at')
                        .eq('day_number', dayNumber)
                        .in('participant_id', participantIds)

                    // 5. Calculate best score per participant (similar to leaderboard page)
                    const bestByParticipant = new Map<string, { score: number; submittedAtMs: number }>()
                    for (const row of (scores || [])) {
                        const rowTime = new Date(row.submitted_at).getTime()
                        const prev = bestByParticipant.get(row.participant_id)
                        if (!prev || row.score > prev.score || (row.score === prev.score && rowTime < prev.submittedAtMs)) {
                            bestByParticipant.set(row.participant_id, { score: row.score, submittedAtMs: rowTime })
                        }
                    }

                    // 6. Build list and sort
                    const rankingList = participants.map(p => {
                        const best = bestByParticipant.get(p.id)
                        return {
                            participantId: p.id,
                            score: best?.score ?? -1,
                            submittedAtMs: best?.submittedAtMs ?? Number.MAX_SAFE_INTEGER
                        }
                    })

                    rankingList.sort((a, b) => {
                        if (a.score !== b.score) return b.score - a.score
                        return a.submittedAtMs - b.submittedAtMs
                    })

                    // 7. Find my index
                    const myIndex = rankingList.findIndex(x => x.participantId === me.id)

                    setRank((myIndex + 1).toString())
                    setTotal(participants.length)
                } catch (e) {
                    console.error("Rank fetch error:", e)
                } finally {
                    setLoading(false)
                }
            }
            fetchScoredRank()
        }
    }, [userId, tournamentId])

    if (loading) return <Loader2 className="w-3 h-3 animate-spin inline" />

    // If rank is text (Eliminated)
    if (rank === 'Eliminated') return <span className="text-red-500">Eliminated</span>

    // If rank is number (Active count)
    // "5/20"
    // This effectively means "1 of 5 survivors out of 20"
    // It's not exact "rank" (like 1st place), but for Survival mode, "Staying Alive" is the rank.
    // Unless we score by points? The game HAS points.
    // So 1st place is highest points.
    // I should strongly verify if I can easily get position.
    // Since I can't easily do it without a new DB function, I will stick to "Survivors: X/Y" label logic for now
    // but formatted as "X/Y".

    return <span>{rank}/{total}</span>
}
