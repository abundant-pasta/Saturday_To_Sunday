import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function backfill() {
    console.log('🚀 Starting Historical Backfill for Badges...')

    // 1. Fetch all daily results (paginated to avoid the 1,000 row default cap)
    const results: any[] = []
    const pageSize = 1000
    let from = 0

    while (true) {
        const { data: page, error: resultsError } = await supabase
            .from('daily_results')
            .select('user_id, sport, score, game_date')
            .not('user_id', 'is', null) // Only for registered users
            .order('game_date', { ascending: true })
            .range(from, from + pageSize - 1)

        if (resultsError) {
            console.error('Error fetching results:', resultsError)
            return
        }

        if (!page || page.length === 0) break

        results.push(...page)

        if (page.length < pageSize) break
        from += pageSize
    }

    console.log(`📊 Found ${results.length} total game results.`)

    // 2. Group results by date and sport
    const grouped: Record<string, any[]> = {}
    results.forEach(r => {
        const key = `${r.game_date}_${r.sport}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(r)
    })

    const userStats: Record<string, {
        football_daily_wins: number,
        basketball_daily_wins: number,
        football_podium_finishes: number,
        basketball_podium_finishes: number,
        football_top_10_finishes: number,
        basketball_top_10_finishes: number
    }> = {}

    // 3. Calculate rankings for each group
    Object.keys(grouped).forEach(key => {
        const [date, sport] = key.split('_')
        const dayResults = grouped[key].sort((a, b) => b.score - a.score)

        if (dayResults.length === 0) return

        const maxScore = dayResults[0].score
        if (maxScore === 0) return // Skip days with no scores

        dayResults.forEach((r, index) => {
            if (!userStats[r.user_id]) {
                userStats[r.user_id] = {
                    football_daily_wins: 0,
                    basketball_daily_wins: 0,
                    football_podium_finishes: 0,
                    basketball_podium_finishes: 0,
                    football_top_10_finishes: 0,
                    basketball_top_10_finishes: 0
                }
            }

            const stats = userStats[r.user_id]
            const rank = index + 1

            // Award Winners (allowing ties for Top 1)
            if (r.score === maxScore) {
                if (sport === 'football') stats.football_daily_wins++
                else stats.basketball_daily_wins++
            }

            // Award Podium (Top 3)
            if (rank <= 3) {
                if (sport === 'football') stats.football_podium_finishes++
                else stats.basketball_podium_finishes++
            }

            // Award Top 10
            if (rank <= 10) {
                if (sport === 'football') stats.football_top_10_finishes++
                else stats.basketball_top_10_finishes++
            }
        })
    })

    console.log(`✨ Calculated stats for ${Object.keys(userStats).length} users.`)

    // 4. Batch Update Profiles
    const updates = Object.entries(userStats).map(([userId, stats]) => ({
        id: userId,
        ...stats
    }))

    // Process in chunks of 100 to avoid request size limits
    const chunkSize = 100
    for (let i = 0; i < updates.length; i += chunkSize) {
        const chunk = updates.slice(i, i + chunkSize)
        const { error: updateError } = await supabase
            .from('profiles')
            .upsert(chunk)

        if (updateError) {
            console.error('Error updating profiles chunk:', updateError)
        } else {
            console.log(`✅ Updated ${i + chunk.length}/${updates.length} users...`)
        }
    }

    console.log('🏁 Backfill Complete!')
}

backfill()
