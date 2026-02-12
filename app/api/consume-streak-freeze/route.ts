import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

interface ConsumeStreakFreezeRequest {
    userId: string
    sport: 'football' | 'basketball'
}

export async function POST(request: Request) {
    try {
        const body: ConsumeStreakFreezeRequest = await request.json()
        const { userId, sport } = body

        if (!userId || !sport) {
            return NextResponse.json(
                { error: 'Missing userId or sport' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const lastPlayedColumn = sport === 'football'
            ? 'last_played_football_at'
            : 'last_played_basketball_at'
        const freezesAvailableColumn = sport === 'football'
            ? 'football_freezes_available'
            : 'basketball_freezes_available'
        const streakColumn = sport === 'football'
            ? 'streak_football'
            : 'streak_basketball'

        // Get current profile data
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select(`${freezesAvailableColumn}, ${streakColumn}, ${lastPlayedColumn}`)
            .eq('id', userId)
            .single()

        if (fetchError || !profile) {
            return NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }

        const freezesAvailable = profile[freezesAvailableColumn] || 0
        const currentStreak = profile[streakColumn] || 0

        // Validate that user has a freeze to consume
        if (freezesAvailable === 0) {
            return NextResponse.json(
                { error: 'No freeze available to consume' },
                { status: 400 }
            )
        }

        // Validate that user has an active streak worth saving
        if (currentStreak === 0) {
            return NextResponse.json(
                { error: 'No active streak to protect' },
                { status: 400 }
            )
        }

        // Consume the freeze
        const now = new Date()
        const updateData: any = {
            [freezesAvailableColumn]: 0,
            [lastPlayedColumn]: now.toISOString()
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)

        if (updateError) {
            return NextResponse.json(
                { error: 'Failed to consume freeze' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: `Streak freeze consumed! Your ${currentStreak}-day streak is safe.`,
            streakPreserved: currentStreak,
            freezesRemaining: 0
        })

    } catch (error: any) {
        console.error('Consume freeze error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
