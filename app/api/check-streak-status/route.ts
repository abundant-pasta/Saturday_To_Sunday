import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

interface CheckStreakStatusRequest {
    userId: string
    sport: 'football' | 'basketball'
}

export async function POST(request: Request) {
    try {
        const body: CheckStreakStatusRequest = await request.json()
        const { userId, sport } = body

        if (!userId || !sport) {
            return NextResponse.json(
                { error: 'Missing userId or sport' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Get user profile data
        const { data: profile, error } = await supabase
            .from('profiles')
            .select(
                `last_played_football_at, 
         last_played_basketball_at, 
         football_freezes_used, 
         basketball_freezes_used, 
         freeze_week_start,
         streak_football,
         streak_basketball`
            )
            .eq('id', userId)
            .single()

        if (error || !profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        const now = new Date()
        const lastPlayedColumn = sport === 'football' ? 'last_played_football_at' : 'last_played_basketball_at'
        const freezesUsedColumn = sport === 'football' ? 'football_freezes_used' : 'basketball_freezes_used'
        const currentStreak = sport === 'football' ? profile.streak_football : profile.streak_basketball

        const lastPlayedAt = profile[lastPlayedColumn]
        const freezesUsed = profile[freezesUsedColumn] || 0

        // Check if weekly limit needs reset (every Monday)
        let shouldResetWeeklyLimit = false
        if (profile.freeze_week_start) {
            const weekStart = new Date(profile.freeze_week_start)
            const currentWeekStart = getMonday(now)

            if (weekStart < currentWeekStart) {
                shouldResetWeeklyLimit = true
            }
        } else {
            shouldResetWeeklyLimit = true
        }

        // If we need to reset, do it now
        if (shouldResetWeeklyLimit) {
            await supabase
                .from('profiles')
                .update({
                    football_freezes_used: 0,
                    basketball_freezes_used: 0,
                    freeze_week_start: getMonday(now).toISOString().split('T')[0]
                })
                .eq('id', userId)
        }

        // Calculate hours since last play
        let hoursInactive = 0
        let needsFreeze = false

        if (lastPlayedAt) {
            const lastPlayed = new Date(lastPlayedAt)
            const diffMs = now.getTime() - lastPlayed.getTime()
            hoursInactive = diffMs / (1000 * 60 * 60)

            // Only need freeze if >24 hours AND has active streak
            needsFreeze = hoursInactive > 24 && currentStreak > 0
        }

        // Can use freeze if: needs it, hasn't used weekly limit, and has active streak
        const effectiveFreezesUsed = shouldResetWeeklyLimit ? 0 : freezesUsed
        const canUseFreeze = needsFreeze && effectiveFreezesUsed < 1 && currentStreak > 0

        return NextResponse.json({
            needsFreeze,
            canUseFreeze,
            hoursInactive: Math.floor(hoursInactive),
            freezesUsedThisWeek: effectiveFreezesUsed,
            currentStreak
        })

    } catch (error: any) {
        console.error('Check streak status error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}

// Helper: Get the Monday of the current week
function getMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    return new Date(d.setDate(diff))
}
