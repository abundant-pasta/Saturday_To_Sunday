'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { hashAnswer, generateSalt } from '@/utils/crypto'

import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function getSurvivalGame() {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const sport = 'survival_basketball'

    // 1. Check for existing game
    const { data: existingGames } = await supabase
        .from('daily_games')
        .select('content')
        .eq('date', today)
        .eq('sport', sport)
        .limit(1)

    if (existingGames && existingGames.length > 0) {
        return existingGames[0].content
    }

    // 2. Generate New Game (Admin Access for Pool + Write)
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: pool } = await supabaseAdmin
        .from('players')
        .select('*')
        .in('game_mode', ['survival', 'both'])
        .limit(300)

    if (!pool || pool.length < 10) return null

    // Shuffle and pick 10
    const selectedPlayers = pool.sort(() => 0.5 - Math.random()).slice(0, 10)

    // Get distractors (colleges)
    const allColleges = Array.from(new Set(pool.map(p => p.college).filter(Boolean))) as string[]

    const questions = await Promise.all(selectedPlayers.map(async p => {
        // 3 distractors
        const otherColleges = allColleges.filter(c => c !== p.college)
        const distractors = otherColleges
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)

        // Fallback if not enough distractors (shouldn't happen with 200 players)
        while (distractors.length < 3) {
            distractors.push('Unknown University')
        }

        const options = [p.college, ...distractors].sort(() => 0.5 - Math.random())

        const salt = generateSalt()
        const answerHash = await hashAnswer(p.college, salt)

        return {
            id: p.id,
            name: p.name,
            image_url: p.image_url,
            // correct_answer: p.college, // REMOVED FOR SECURITY
            answer_hash: answerHash,
            salt: salt,
            options,
            tier: p.tier,
            sport: 'basketball' // For UI styling
        }
    }))

    // 3. Save Game
    await supabaseAdmin.from('daily_games').insert({
        date: today,
        content: questions,
        sport: sport
    })

    return questions
}

export async function joinTournament(tournamentId: string) {
    const supabase = await createClient()

    // 1. Auth Check
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'You must be logged in to join the tournament.' }
    }

    try {
        // 2. Tournament Validation
        const { data: tournament, error: tourneyError } = await supabase
            .from('survival_tournaments')
            .select('is_active, start_date')
            .eq('id', tournamentId)
            .single()

        if (tourneyError || !tournament) {
            return { error: 'Tournament not found.' }
        }

        if (!tournament.is_active) {
            return { error: 'This tournament is not currently active.' }
        }

        // Optional: Check if already started? 
        // Usually joining after start date is allowed in some modes, but strictly for winning usually not.
        // Given requirements, we just check is_active.

        // 3. Join
        const { error: joinError } = await supabase
            .from('survival_participants')
            .insert({
                user_id: user.id,
                tournament_id: tournamentId,
                status: 'active'
            })

        if (joinError) {
            if (joinError.code === '23505') { // Unique violation
                return { error: 'You have already joined this tournament.' }
            }
            throw joinError
        }

        revalidatePath('/') // Revalidate homepage or wherever the button is
        return { success: true }

    } catch (error) {
        console.error('Error joining tournament:', error)
        return { error: 'Failed to join tournament. Please try again.' }
    }
}
