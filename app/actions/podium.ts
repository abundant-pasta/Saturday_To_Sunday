'use server'

import { createClient } from '@/utils/supabase/server'

export type PodiumResult = {
    rank: number
    score: number
    sport: 'football' | 'basketball'
} | null

export async function checkYesterdayPodium(sport: 'football' | 'basketball' = 'football'): Promise<PodiumResult> {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
        return null
    }

    // Calculate "yesterday" based on timezone offset logic used elsewhere
    // In other files we see TIMEZONE_OFFSET_MS used. Since this is server-side, 
    // we should be careful. Ideally we use the same "game date" logic.
    // The game date is usually just YYYY-MM-DD.
    // Let's approximate "yesterday" by subtracting 24h from now - offset.
    // However, server time is UTC. 
    // Let's rely on the client passing the date or just check the most recent completed game date.
    // For simplicity, let's look for the most recent entry for this user and see if it was "yesterday".
    // Actually, to be precise, let's just use the standard offset logic if possible, or just standard UTC-5 (or whatever constant is).
    // Let's assume the user wants to see the result for the *previous* game date.

    // Simplest approach: Find the user's *latest* result. If it's from yesterday, check rank.
    // If it's from today, ignore (game is ongoing).
    // If it's older, ignore (old news).

    // Better approach: Calculate yesterday string.
    const TIMEZONE_OFFSET_MS = 60 * 60 * 1000 * 5 // EST/EDT offset approximation or from constants if shared
    // Since we can't easily import the constant from @/lib/constants if it's not set up for server, let's just define it or use standard Date.

    // Let's use the DB date.
    const now = new Date()
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000) - TIMEZONE_OFFSET_MS)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // 1. Get User's Score for Yesterday
    const { data: stringData, error } = await supabase
        .from('daily_results')
        .select('score')
        .eq('user_id', session.user.id)
        .eq('game_date', yesterdayStr)
        .eq('sport', sport)
        .single()

    if (error || !stringData) {
        return null
    }

    const myScore = stringData.score

    // 2. Calculate Rank
    // Count how many users had a higher score on that day/sport
    const { count, error: countError } = await supabase
        .from('daily_results')
        .select('*', { count: 'exact', head: true })
        .eq('game_date', yesterdayStr)
        .eq('sport', sport)
        .gt('score', myScore)

    if (countError) {
        return null
    }

    const rank = (count || 0) + 1

    if (rank <= 3) {
        return {
            rank,
            score: myScore,
            sport
        }
    }

    return null
}
