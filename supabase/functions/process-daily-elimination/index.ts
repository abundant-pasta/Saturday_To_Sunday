import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
        // Assumes cron runs at midnight for the day that just ended.
        // Day 1 ends at T_start + 24h.
        // If now is T_start + 24h + epsilon, we process day 1.
        // day_number = floor( (now - start) / 24h ) IF we process "current day" as "active day".
        // BUT logic usually is: midnight runs for previous day?
        // Let's assume day_number is 1-based index.
        // If T_start = Jan 1 00:00. Now = Jan 2 00:00. Diff = 1 day.
        // We are processing Day 1 results.
        const now = new Date()
        const startDate = new Date(tournament.start_date)
        const diffTime = Math.abs(now.getTime() - startDate.getTime())
        const dayNumber = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        // Note: Using ceil so Jan 1 00:01 -> Day 1. Jan 2 00:01 -> Day 2.
        // If running at Jan 2 00:00, it's exactly 1 day diff. Ceil(1) = 1.
        // If running at Jan 2 00:05, it's 1.003 days. Ceil = 2?
        // If we process Day X results, we usually run AFTER Day X ends.
        // So at Jan 2 00:05 (Day 2 just started), we process Day 1?
        // Using "previous full day" logic is safer.
        // Let's stick to: We process the day_number that JUST finished.
        const processingDayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24))
        // Example: Jan 1 00:00 to Jan 2 00:05. Diff = 24.1 hrs = 1.004 days. Floor = 1.
        // Creates processingDayNumber = 1. Perfect.

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
        const eliminateCount = Math.ceil(totalActive * 0.25)

        console.log(`Total Active: ${totalActive}. Eliminating: ${eliminateCount}`)

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
