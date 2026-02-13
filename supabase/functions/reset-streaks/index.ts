import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 6 hours in milliseconds (CST offset)
const TIMEZONE_OFFSET_MS = 6 * 60 * 60 * 1000

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Calculate "Yesterday" in Game Time
        // Game Midnight is 06:00 UTC.
        // If we run this script at 06:01 UTC, we are resetting for the day that just ended.
        const now = new Date()
        const gameTime = new Date(now.getTime() - TIMEZONE_OFFSET_MS)

        // The "Game Date" we are checking is YESTERDAY
        const yesterday = new Date(gameTime)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        console.log(`[Streak Reset] Processing for Game Date: ${yesterdayStr}`)

        // 2. Fetch all users
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, streak_football, streak_basketball, football_freezes_available, basketball_freezes_available')
            .range(0, 999) // Pagination would be needed for production at scale

        if (profilesError) throw profilesError

        // 3. Fetch ALL results for "Yesterday"
        // Instead of querying per user (N+1), get all plays for yesterday
        const { data: results, error: resultsError } = await supabase
            .from('daily_results')
            .select('user_id, sport')
            .eq('game_date', yesterdayStr)

        if (resultsError) throw resultsError

        // Create a Set of "Who Played What" for fast lookup
        const playedFootball = new Set()
        const playedBasketball = new Set()

        results.forEach((r: any) => {
            if (r.sport === 'football') playedFootball.add(r.user_id)
            if (r.sport === 'basketball') playedBasketball.add(r.user_id)
        })

        const updates = []

        for (const profile of profiles) {
            let needsUpdate = false
            const updatePayload: any = { id: profile.id }

            // --- Football Check ---
            // If they have a streak > 0 AND didn't play yesterday
            if (profile.streak_football > 0 && !playedFootball.has(profile.id)) {
                // TRY FREEZE
                if (profile.football_freezes_available > 0) {
                    console.log(`Frozen Football for ${profile.id}`)
                    updatePayload.football_freezes_available = profile.football_freezes_available - 1
                    // No need to update last_played, just don't reset the streak.
                    // Streak stays same
                    needsUpdate = true
                } else {
                    console.log(`Reset Football for ${profile.id}`)
                    updatePayload.streak_football = 0
                    needsUpdate = true
                }
            }

            // --- Basketball Check ---
            if (profile.streak_basketball > 0 && !playedBasketball.has(profile.id)) {
                if (profile.basketball_freezes_available > 0) {
                    console.log(`Frozen Basketball for ${profile.id}`)
                    updatePayload.basketball_freezes_available = profile.basketball_freezes_available - 1
                    needsUpdate = true
                } else {
                    console.log(`Reset Basketball for ${profile.id}`)
                    updatePayload.streak_basketball = 0
                    needsUpdate = true
                }
            }

            if (needsUpdate) {
                updates.push(updatePayload)
            }
        }

        // 4. Batch Update
        if (updates.length > 0) {
            const { error: updateError } = await supabase
                .from('profiles')
                .upsert(updates)

            if (updateError) throw updateError
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: profiles.length,
                updated: updates.length,
                gameDate: yesterdayStr
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
