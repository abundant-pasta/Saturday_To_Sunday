import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

interface UseStreakFreezeRequest {
    userId: string
    sport: 'football' | 'basketball'
}

export async function POST(request: Request) {
    try {
        const body: UseStreakFreezeRequest = await request.json()
        const { userId, sport } = body

        if (!userId || !sport) {
            return NextResponse.json(
                { error: 'Missing userId or sport' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Get current freeze usage
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select(`${sport}_freezes_used, freeze_week_start, streak_${sport}`)
            .eq('id', userId)
            .single()

        if (fetchError || !profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        const freezesUsedColumn = `${sport}_freezes_used` as const
        const currentFreezesUsed = (profile as any)[freezesUsedColumn] || 0

        // Check weekly limit
        if (currentFreezesUsed >= 1) {
            return NextResponse.json(
                { error: 'Weekly freeze limit reached (max 1 per week)' },
                { status: 400 }
            )
        }

        // Check if user has an active streak
        const streakColumn = `streak_${sport}` as const
        const currentStreak = (profile as any)[streakColumn] || 0
        if (currentStreak === 0) {
            return NextResponse.json(
                { error: 'No active streak to preserve' },
                { status: 400 }
            )
        }

        const now = new Date()

        // Update profile: set last_played_at to now, increment freeze counter
        const updateData: any = {
            [`last_played_${sport}_at`]: now.toISOString(),
            [freezesUsedColumn]: currentFreezesUsed + 1
        }

        // Set freeze_week_start if not set
        if (!profile.freeze_week_start) {
            updateData.freeze_week_start = getMonday(now).toISOString().split('T')[0]
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)

        if (updateError) {
            console.error('Error updating profile:', updateError)
            return NextResponse.json(
                { error: 'Failed to apply streak freeze' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Streak freeze applied successfully',
            freezesRemaining: 0, // Since we just used the one allowed per week
            streakPreserved: currentStreak
        })

    } catch (error: any) {
        console.error('Use streak freeze error:', error)
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
