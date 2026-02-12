import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

interface EarnStreakFreezeRequest {
    userId: string
    sport: 'football' | 'basketball'
}

export async function POST(request: Request) {
    try {
        const body: EarnStreakFreezeRequest = await request.json()
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

        // Get current freeze status
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select(`${freezesAvailableColumn}, freeze_week_start`)
            .eq('id', userId)
            .single()

        if (fetchError || !profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        const freezesAvailable = profile[freezesAvailableColumn] || 0
        const freezeWeekStart = profile.freeze_week_start

        // Check if already has a freeze
        if (freezesAvailable >= 1) {
            return NextResponse.json(
                { error: 'Already have a freeze available' },
                { status: 400 }
            )
        }

        // Check weekly limit
        const now = new Date()
        const currentWeekStart = getMonday(now)

        if (freezeWeekStart) {
            const weekStart = new Date(freezeWeekStart)
            const isSameWeek = weekStart >= currentWeekStart

            if (isSameWeek && freezesAvailable === 0) {
                // Already earned this week (used it)
                return NextResponse.json(
                    { error: 'Weekly limit reached. Resets every Monday.' },
                    { status: 400 }
                )
            }
        }

        // Award the freeze
        const updateData: any = {
            [freezesAvailableColumn]: 1
        }

        // Set freeze_week_start if new week or first time
        if (!freezeWeekStart || new Date(freezeWeekStart) < currentWeekStart) {
            updateData.freeze_week_start = currentWeekStart.toISOString().split('T')[0]
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)

        if (updateError) {
            return NextResponse.json(
                { error: 'Failed to award freeze' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: `${sport === 'football' ? 'Football' : 'Basketball'} freeze earned!`,
            freezesAvailable: 1
        })

    } catch (error: any) {
        console.error('Earn freeze error:', error)
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
