import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DAY_MS = 1000 * 60 * 60 * 24
const TARGET_TOURNAMENT_DAYS = 5

function targetRemainingForDay(initialFieldSize: number, dayNumber: number): number {
    if (dayNumber >= TARGET_TOURNAMENT_DAYS) return 1

    // 5-day pacing curve:
    // Day 1: 62.5%, Day 2: 37.5%, Day 3: 25%, Day 4: 12.5% (Final 3)
    const ratioByDay: Record<number, number> = {
        1: 0.625,
        2: 0.375,
        3: 0.25,
        4: 0.125, // For 22-24 players, this is exactly 3 survivors
    }

    const ratio = ratioByDay[dayNumber] ?? 0.125
    let target = Math.ceil(initialFieldSize * ratio)

    // Explicit override for Day 4 to ensure a competitive final 3
    if (dayNumber === 4) target = 3

    return Math.max(1, target)
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get Active Tournament
        const { data: tournaments, error: tourneyError } = await supabase
            .from('survival_tournaments')
            .select('*')
            .eq('is_active', true)
            .lte('start_date', new Date().toISOString())
            .gte('end_date', new Date().toISOString())

        if (tourneyError) throw tourneyError
        if (!tournaments || tournaments.length === 0) {
            return new Response(JSON.stringify({ message: 'No active tournament found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const tournament = tournaments[0]

        // 2. Calculate Day Number
        // Tournament rollover is at 06:00 UTC (TIMEZONE_OFFSET_MS)
        // Adding a 6.5 hour buffer ensures that at Midnight UTC, we process the day 
        // that ended at 06:00 UTC *that day*, instead of waiting another 24h.
        const now = new Date()
        const startDate = new Date(tournament.start_date)
        const bufferMs = 6.5 * 60 * 60 * 1000
        const diffTime = now.getTime() - startDate.getTime()
        const processingDayNumber = Math.floor((diffTime + bufferMs) / (1000 * 60 * 60 * 24))
        // Example: T_start = Feb 20 06:00. 
        // Feb 21 00:00 (Midnight UTC). Diff = 18h. +6.5h = 24.5h. Floor = Day 1.
        // Previously: 18h. Floor = 0. (Delayed 24h).

        if (processingDayNumber < 1) {
            return new Response(JSON.stringify({ message: 'Tournament just started, no results to process yet' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        console.log(`Processing Elimination for Tournament: ${tournament.name} (ID: ${tournament.id}), Day: ${processingDayNumber}`)

        // 3. Fetch Active Participants
        const { data: participants, error: partError } = await supabase
            .from('survival_participants')
            .select('id, user_id, status')
            .eq('tournament_id', tournament.id)
            .eq('status', 'active')

        if (partError) throw partError
        if (!participants || participants.length === 0) {
            return new Response(JSON.stringify({ message: 'No active participants' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 4. Fetch Scores for this Day
        const { data: scores, error: scoreError } = await supabase
            .from('survival_scores')
            .select('participant_id, score, submitted_at')
            .eq('day_number', processingDayNumber)
            .in('participant_id', participants.map(p => p.id))

        if (scoreError) throw scoreError

        // Map scores
        const scoreMap = new Map()
        scores?.forEach(s => scoreMap.set(s.participant_id, s))

        // 5. Prepare List for Sorting
        // Missing score = 0, Timestamp = Now (latest possible = worst for ties)
        // Or if score is missing, should they be auto-eliminated? Score 0.
        const combined = participants.map(p => {
            const s = scoreMap.get(p.id)
            return {
                ...p,
                score: s ? s.score : -1, // Use -1 or 0? If game scores can be 0, -1 ensures non-players are bottom.
                submitted_at: s ? new Date(s.submitted_at).getTime() : now.getTime() + 100000 // Future time for worst tie-break
            }
        })

        // Sort:
        // 1. Score ASC (Lower is worse)
        // 2. Tie: Timestamp DESC (Later is worse, so "Greater" timestamp comes FIRST in "Worse" list?)
        // Wait.
        // We want the BOTTOM list (Index 0 = Worst Player to be eliminated).
        // Worst Player = Lowest Score.
        // Tie-breaker: "Prioritize earlier timestamp".
        // Prioritize = KEEP.
        // So Earlier Timestamp = Better.
        // Later Timestamp = Worse (Eliminate).
        // So we want Later Timestamp to be "Lower" in the ranking list? 
        // No. If we sort list from Worst to Best.
        // Index 0 should be Worst.
        // Compare A (Early) vs B (Late). B is Worse.
        // So B should be before A.
        // So Sort Order for Timestamp: DESC (Larger/Later value comes before Smaller/Earlier value).
        // JS sort(a, b): if > 0, b comes first? No, a comes after b.
        // want B (Late) before A (Early).
        // B.time > A.time.
        // if (B.time > A.time) return -1. (B comes first).

        combined.sort((a, b) => {
            if (a.score !== b.score) {
                return a.score - b.score // ASC: Small score comes first (Index 0).
            }
            // Scores equal.
            // Want Later time first.
            return b.submitted_at - a.submitted_at // DESC: Larger (Later) comes first.
        })

        // 6. Calculate Cutoff
        const totalActive = combined.length
        const startTs = new Date(tournament.start_date).getTime()
        const endTs = new Date(tournament.end_date).getTime()
        const configuredTournamentDays = Math.max(1, Math.ceil((endTs - startTs) / DAY_MS))
        const totalTournamentDays = Math.min(TARGET_TOURNAMENT_DAYS, configuredTournamentDays)
        const daysRemainingIncludingToday = Math.max(1, totalTournamentDays - processingDayNumber + 1)
        const { count: initialFieldSize } = await supabase
            .from('survival_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id)

        const baseFieldSize = initialFieldSize || totalActive
        const targetRemaining = targetRemainingForDay(baseFieldSize, processingDayNumber)
        const eliminateCount = Math.max(0, Math.min(totalActive - 1, totalActive - targetRemaining))

        console.log(`Total Active: ${totalActive}. Days remaining: ${daysRemainingIncludingToday}. Base field: ${baseFieldSize}. Target remaining: ${targetRemaining}. Eliminating: ${eliminateCount}`)

        // Identify Victims
        const victims = combined.slice(0, eliminateCount)
        const victimIds = victims.map(v => v.id)

        // 7. Execute Elimination
        if (victimIds.length > 0) {
            const { error: eliminateError } = await supabase
                .from('survival_participants')
                .update({ status: 'eliminated' })
                .in('id', victimIds)

            if (eliminateError) throw eliminateError

            // 8. Log Elimination
            await supabase.from('survival_logs').insert({
                tournament_id: tournament.id,
                day_number: processingDayNumber,
                message: `Eliminated ${victimIds.length} participants`,
                details: {
                    total_active_start: totalActive,
                    eliminated_count: eliminateCount,
                    target_remaining_after_cut: targetRemaining,
                    base_field_size: baseFieldSize,
                    days_remaining_including_today: daysRemainingIncludingToday,
                    eliminated_ids: victimIds,
                    cutoff_score_threshold: victims[victims.length - 1].score // approximate
                }
            })
        } else {
            await supabase.from('survival_logs').insert({
                tournament_id: tournament.id,
                day_number: processingDayNumber,
                message: `No participants eliminated (Count was 0?)`,
                details: { total_active: totalActive }
            })
        }

        return new Response(
            JSON.stringify({
                success: true,
                day: processingDayNumber,
                total: totalActive,
                eliminated: victimIds.length,
                victims: victimIds
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
