'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { hashAnswer, generateSalt } from '@/utils/crypto'

import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function getSurvivalGame() {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const sport = 'survival_basketball'

    const { data: { user } } = await supabase.auth.getUser()
    let status = 'new'
    let score = 0

    // 0. Check if user has already played today
    if (user) {
        const { data: tournament } = await supabase
            .from('survival_tournaments')
            .select('id, start_date')
            .eq('is_active', true)
            .single()

        if (tournament) {
            const start = new Date(tournament.start_date).getTime()
            const now = new Date().getTime()
            const dayNumber = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1)

            const { data: participant } = await supabase
                .from('survival_participants')
                .select('id')
                .eq('user_id', user.id)
                .eq('tournament_id', tournament.id)
                .single()

            if (participant) {
                const { data: existingScore } = await supabase
                    .from('survival_scores')
                    .select('score')
                    .eq('participant_id', participant.id)
                    .eq('day_number', dayNumber)
                    .maybeSingle()

                if (existingScore) {
                    status = 'played'
                    score = existingScore.score
                }
            }
        }
    }

    // 1. Check for existing game
    const { data: existingGames } = await supabase
        .from('daily_games')
        .select('content')
        .eq('date', today)
        .eq('sport', sport)
        .limit(1)

    if (existingGames && existingGames.length > 0) {
        const questions = existingGames[0].content as any[]
        const needsSecurity = questions.some(q => q.correct_answer || !q.answer_hash)

        let safeQuestions = questions
        if (needsSecurity) {
            console.log(`Securing legacy survival game on-the-fly...`)
            safeQuestions = await Promise.all(questions.map(async (q) => {
                const answer = q.correct_answer || q.answer
                const salt = q.salt || generateSalt()
                const answerHash = q.answer_hash || await hashAnswer(answer, salt)
                const name = (q.name.includes(' ') || !q.name.includes('='))
                    ? Buffer.from(q.name).toString('base64')
                    : q.name

                return {
                    ...q,
                    name,
                    answer_hash: answerHash,
                    salt: salt,
                    correct_answer: undefined,
                    answer: undefined
                }
            }))
        }
        return { questions: safeQuestions, status, score }
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
            name: Buffer.from(p.name).toString('base64'),
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

    return { questions, status, score }
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

export async function submitSurvivalScore(answers: { questionId: number, answer: string, potentialPoints: number }[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 1. Get Active Tournament
    const { data: tournament } = await supabase
        .from('survival_tournaments')
        .select('*')
        .eq('is_active', true)
        .single()

    if (!tournament) return { error: 'No active tournament' }

    // 2. Get Participant
    const { data: participant } = await supabase
        .from('survival_participants')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('tournament_id', tournament.id)
        .single()

    if (!participant) return { error: 'Not a participant' }
    if (participant.status === 'eliminated') return { error: 'You are eliminated' }

    // 3. Get Game Content (Securely)
    // We need the *full* content including answers/hashes to verify
    const today = new Date().toISOString().split('T')[0]
    const sport = 'survival_basketball' // or pass it in?

    // Use admin client to read daily_games if RLS restricts it? 
    // Usually daily_games is public read, but we need to ensure we get the stored content.
    // The public 'daily_games' read might rely on RLS (usually true for 'authenticated').
    // But we need to match question IDs from the DB content.

    const { data: gameData } = await supabase
        .from('daily_games')
        .select('content')
        .eq('date', today)
        .eq('sport', sport)
        .single()

    if (!gameData) return { error: 'Game data not found' }

    const questions = gameData.content as any[]
    let finalScore = 0
    let streak = 0

    // 4. Calculate Score
    for (const ans of answers) {
        const question = questions.find(q => q.id === ans.questionId)
        if (!question) continue

        let isCorrect = false
        if (question.correct_answer) {
            isCorrect = question.correct_answer === ans.answer
        } else if (question.answer_hash && question.salt) {
            const h = await hashAnswer(ans.answer, question.salt)
            isCorrect = h === question.answer_hash
        }

        if (isCorrect) {
            streak++

            // Validate points
            // Cap potential points at 100 per question
            const validPotential = Math.min(100, Math.max(10, ans.potentialPoints))

            // Re-apply tier multiplier logic server-side
            const tier = question.tier || 1
            const multiplier = tier === 3 ? 1.75 : tier === 2 ? 1.5 : 1.0

            const points = Math.round(validPotential * multiplier)

            let bonus = 0
            if (streak === 5) bonus = 50 // Match client logic? Client said "6 in a row"?
            // Checking client code: "if (currentStreakCount === 6) { bonus = 50 ... }"
            // And "if (currentStreakCount === 10) { bonus = 150 ... }"
            // WAIT - Client loop:
            // for (let i = currentIndex - 1; i >= 0; i--) { ... } if (isCorrect) currentStreakCount++
            // If index is 5 (6th question), and previous 5 were correct + this one implies streak is 6.
            // Client logic:
            // "if (currentStreakCount === 6) { bonus = 50; ... }"
            // "if (currentStreakCount === 10) { bonus = 150; ... }"

            if (streak === 6) bonus = 50
            if (streak === 10) bonus = 150

            finalScore += (points + bonus)
        } else {
            streak = 0
        }
    }

    // 5. Calculate Day Number
    const start = new Date(tournament.start_date).getTime()
    const now = new Date().getTime()
    const dayNumber = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1)

    // 6. Insert Score
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: existingScore } = await supabaseAdmin
        .from('survival_scores')
        .select('id')
        .eq('participant_id', participant.id)
        .eq('day_number', dayNumber)
        .maybeSingle()

    if (existingScore) {
        revalidatePath('/survival')
        return { success: true, alreadySubmitted: true, score: finalScore }
    }

    const { error } = await supabaseAdmin
        .from('survival_scores')
        .insert({
            participant_id: participant.id,
            day_number: dayNumber,
            score: finalScore
        })

    if (error) {
        console.error("Score submit error:", error)
        return { error: error.message }
    }

    revalidatePath('/survival')
    return { success: true, score: finalScore }
}
