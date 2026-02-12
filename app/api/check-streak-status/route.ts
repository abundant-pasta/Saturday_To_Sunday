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

        const freezesAvailableColumn = sport === 'football'
            ? 'football_freezes_available'
            : 'basketball_freezes_available'

        // Get user freeze inventory
        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`${freezesAvailableColumn}, freeze_week_start`)
            .eq('id', userId)
            .single()

        if (error || !profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        const freezesAvailable = profile[freezesAvailableColumn] || 0
        const freezeWeekStart = profile.freeze_week_start

        // Check if user can earn a new freeze (weekly limit check)
        const now = new Date()
        const currentWeekStart = getMonday(now)

        let canEarnFreeze = false
        let hoursUntilWeeklyReset = 0

        if (!freezeWeekStart) {
            // Never earned before, can earn if doesn't have one
            canEarnFreeze = freezesAvailable === 0
        } else {
            const weekStart = new Date(freezeWeekStart)
            const isSameWeek = weekStart >= currentWeekStart

            if (isSameWeek) {
                // Still in same week, can only earn if don't have one
                canEarnFreeze = freezesAvailable === 0

                // Calculate hours until next Monday
                const nextMonday = getNextMonday(now)
                hoursUntilWeeklyReset = Math.floor((nextMonday.getTime() - now.getTime()) / (1000 * 60 * 60))
            } else {
                // New week, can earn again (if don't have one)
                canEarnFreeze = freezesAvailable === 0
            }
        }

        return NextResponse.json({
            hasFreeze: freezesAvailable > 0,
            canEarnFreeze,
            freezesAvailable,
            hoursUntilWeeklyReset,
            weeklyLimit: 1
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
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
}

// Helper: Get next Monday
function getNextMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const daysUntilMonday = day === 0 ? 1 : 8 - day
    d.setDate(d.getDate() + daysUntilMonday)
    return d
}
