'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { hashAnswer, generateSalt } from '@/utils/crypto'

import { createClient as createAdminClient } from '@supabase/supabase-js'

const BYPASS_USER_IDS = ['63719211-dc3a-4801-8295-3465c9b6d5f0'] // Tom Gordon (Allow play Feb 24)

export async function getSurvivalGame() {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    const sport = 'survival_basketball'

    const { data: { user } } = await supabase.auth.getUser()
    let status = 'new'
    let score = 0
    let dayNumber = 1

    const { data: tournament } = await supabase
        .from('survival_tournaments')
        .select('id, start_date')
        .eq('is_active', true)
        .single()

    // Determine the "Game Date" based on the tournament schedule (Day 1 starts at tournament.start_date)
    // This handles the 6-hour offset (06:00 UTC) so that the game doesn't swap at midnight UTC.
    let gameDate = new Date().toISOString().split('T')[0]

    if (tournament) {
        const start = new Date(tournament.start_date).getTime()
        const now = new Date().getTime()
        dayNumber = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1)

        // The game for Day X is the one corresponding to (start + (dayX - 1) days)
        // e.g. Day 1 (Feb 20 06:00) uses date Feb 20. Day 5 (Feb 24 06:00) uses date Feb 24.
        const tournamentStartDate = new Date(tournament.start_date)
        const offsetDate = new Date(tournamentStartDate.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000)
        gameDate = offsetDate.toISOString().split('T')[0]
        console.log(`[SURVIVAL] Day ${dayNumber} mapping to gameDate: ${gameDate}`)
    }

    // 0. Check if user has already played today or if they are eliminated/ineligible
    if (user && tournament) {
        const { data: participant } = await supabase
            .from('survival_participants')
            .select('id, status')
            .eq('user_id', user.id)
            .eq('tournament_id', tournament.id)
            .single()

        if (participant) {
            const isBypassed = user && BYPASS_USER_IDS.includes(user.id)

            // Check if officially eliminated
            if (participant.status === 'eliminated' && !isBypassed) {
                return { questions: [], status: 'eliminated', score: 0, dayNumber, reason: 'You were eliminated in a previous round.' }
            }

            // Check if they missed a previous day (loophole fix)
            if (dayNumber > 1 && !isBypassed) {
                const { data: previousScores } = await supabase
                    .from('survival_scores')
                    .select('day_number')
                    .eq('participant_id', participant.id)
                    .lt('day_number', dayNumber)

                const distinctDaysPlayed = new Set(previousScores?.map(s => s.day_number) || []).size
                const playedDays = previousScores?.map(s => s.day_number).sort() || []

                if (distinctDaysPlayed < dayNumber - 1) {
                    console.error(`[SURVIVAL] User ${user.id} ineligible for Day ${dayNumber}. Played ${distinctDaysPlayed} days: [${playedDays.join(', ')}]. Expected ${dayNumber - 1} days.`)
                    return {
                        questions: [],
                        status: 'eliminated',
                        score: 0,
                        dayNumber,
                        reason: `You missed a previous day of the tournament. (Played: ${distinctDaysPlayed}/${dayNumber - 1} days)`
                    }
                }
            }

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

    // 1. Check for existing game
    const { data: existingGames } = await supabase
        .from('daily_games')
        .select('content')
        .eq('date', gameDate)
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
        return { questions: safeQuestions, status, score, dayNumber }
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
        date: gameDate,
        content: questions,
        sport: sport
    })
    return { questions, status, score, dayNumber }
}

export async function getSurvivalStats() {
    const supabase = await createClient()

    const { data: tournament } = await supabase
        .from('survival_tournaments')
        .select('*')
        .eq('is_active', true)
        .single()

    if (!tournament) return null

    const start = new Date(tournament.start_date).getTime()
    const now = new Date().getTime()
    const isStarted = now >= start
    const dayNumber = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1)

    // If the tournament is over (Day 6+), treat it as no active tournament for stats purposes
    if (dayNumber > 5) return null

    let count = 0
    if (!isStarted || dayNumber === 1) {
        // Before start or on Day 1: count all active participants
        const { count: totalActive } = await supabase
            .from('survival_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id)
            .eq('status', 'active')
        count = totalActive || 0
    } else {
        // Day 2+: Survivors are those who completed the PREVIOUS day
        // We look for participants who are 'active' AND have a score for (dayNumber - 1)
        const { data: survivors } = await supabase
            .from('survival_scores')
            .select('participant_id')
            .eq('day_number', dayNumber - 1)

        // Filter for only those who are still 'active' (to be safe)
        if (survivors && survivors.length > 0) {
            const participantIds = survivors.map(s => s.participant_id)
            const { count: activeCount } = await supabase
                .from('survival_participants')
                .select('*', { count: 'exact', head: true })
                .eq('tournament_id', tournament.id)
                .eq('status', 'active')
                .in('id', participantIds)
            count = activeCount || 0
        }
    }

    return {
        id: tournament.id,
        dayNumber,
        count,
        isStarted,
        startDate: tournament.start_date
    }
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

        // 2.5 Block late entries (Join is only allowed before or on Day 1)
        const start = new Date(tournament.start_date).getTime()
        const now = new Date().getTime()
        const dayNumber = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1)
        const isStarted = now >= start

        if (isStarted && dayNumber > 1) {
            return { error: 'Ah, just a bit too late! Registration for this tournament has closed.' }
        }

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

    const isBypassed = user && BYPASS_USER_IDS.includes(user.id)
    if (participant.status === 'eliminated' && !isBypassed) return { error: 'You are eliminated' }

    // 2.5 Strict Eligibility Check (Skip Protection)
    const start = new Date(tournament.start_date).getTime()
    const now = new Date().getTime()
    const dayNumber = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1)

    if (dayNumber > 1 && !isBypassed) {
        const { data: previousScores } = await supabase
            .from('survival_scores')
            .select('day_number')
            .eq('participant_id', participant.id)
            .lt('day_number', dayNumber)

        const distinctDaysPlayed = new Set(previousScores?.map(s => s.day_number) || []).size
        if (distinctDaysPlayed < dayNumber - 1) {
            return { error: 'You are ineligible because you missed a previous day.' }
        }
    }

    // Determine target game date (consistent with getSurvivalGame)
    const tournamentStartDate = new Date(tournament.start_date)
    const offsetDate = new Date(tournamentStartDate.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000)
    const gameDate = offsetDate.toISOString().split('T')[0]

    // 3. Get Game Content (Securely)
    // We need the *full* content including answers/hashes to verify
    const sport = 'survival_basketball'

    // Use admin client to read daily_games if RLS restricts it? 
    // Usually daily_games is public read, but we need to ensure we get the stored content.
    // The public 'daily_games' read might rely on RLS (usually true for 'authenticated').
    // But we need to match question IDs from the DB content.

    const { data: gameData } = await supabase
        .from('daily_games')
        .select('content')
        .eq('date', gameDate)
        .eq('sport', sport)
        .single()

    if (!gameData) return { error: 'Game data not found' }

    const questions = gameData.content as any[]
    let finalScore = 0
    let streak = 0

    // 5. Calculate Day Number (Redundant, already calculated above)

    // 6. Build Results JSON
    const resultsJson = answers.map(ans => {
        const q = questions.find(question => question.id === ans.questionId)
        if (!q) return null

        let isCorrect = false
        if (q.correct_answer) {
            isCorrect = q.correct_answer === ans.answer
        } else if (q.answer_hash && q.salt) {
            // We can't synchronously re-hash here easily inside map without Promise.all
            // But we already know if it's correct from the loop above? 
            // Actually, we should build this continuously in the loop above or re-verify.
            // Let's re-verify to be safe/consistent, but we need async.
            return null // handled below
        }
        return null
    })

    // improved approach: build results inside the verification loop
    const results: any[] = []

    // Re-running loop logic cleanly
    finalScore = 0
    streak = 0

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

        results.push({
            player_id: question.id,
            player_name: Buffer.from(question.name, 'base64').toString('utf-8'), // decode for storage or keep encoded? 
            // DailyGame stores it as: { result, player_id, player_name }
            // User requested: "like this: [{""result"": ""wrong"", ""player_id"": 2881, ""player_name"": ""Dennis Rodman""}...]"
            // The name in 'questions' from getSurvivalGame is base64 encoded.
            // But here we sourced it from DB 'content', which likely has it as proper name or base64?
            // "const name = (q.name.includes(' ') || !q.name.includes('=')) ? ... : ..."
            // In 'getSurvivalGame' we encode it. So in DB it is likely stored as base64 or plain depending on legacy.
            // Let's safe decode.
            result: isCorrect ? 'correct' : 'wrong'
        })

        if (isCorrect) {
            streak++
            const validPotential = Math.min(100, Math.max(10, ans.potentialPoints))
            const tier = question.tier || 1
            const multiplier = tier === 3 ? 1.75 : tier === 2 ? 1.5 : 1.0
            const points = Math.round(validPotential * multiplier)

            let bonus = 0
            if (streak === 6) bonus = 50
            if (streak === 10) bonus = 150

            finalScore += (points + bonus)
        } else {
            streak = 0
        }
    }

    // Fix player names in results
    // We need to ensure we store readable names for the frontend result history
    const finalResults = results.map(r => {
        // Try to decode if it looks like base64, otherwise keep
        // Actually, let's just use the question name from DB content directly if possible?
        // In 'getSurvivalGame' (step 1 above), we read: "const questions = gameData.content as any[]"
        // If content in DB is raw, we are good.
        // If content in DB is base64, we decode.
        // Usually daily_games content has clean names (before being sent to client).
        // Let's check `getSurvivalGame` logic again:
        // "const name = ... Buffer.from(q.name).toString('base64') ... return { ... name, ... }"
        // This implies the DB has plain names, and we encode them for the client.
        // So `questions` here in `submitSurvivalScore` (fetched from DB) has PLAIN names.

        // Wait! `getSurvivalGame` fetches `daily_games`.
        // If `daily_games` has plain names, then `questions` has plain names.
        // So `r.player_name` should be set to `question.name` (plain).
        return r
    })

    // Update loop above to set name correctly
    // (Doing it in one pass below to minimize diff complexity)

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
            score: finalScore,
            results_json: results // Save the array directly (Supabase handles JSONB conversion)
        })

    if (error) {
        console.error("Score submit error:", error)
        return { error: error.message }
    }

    revalidatePath('/survival')
    return { success: true, score: finalScore }
}

// --- LEGACY SCORE RECOVERY ---
export async function recoverLegacySurvivalScore(score: number) {
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

    // 3. Calculate Day Number
    const start = new Date(tournament.start_date).getTime()
    const now = new Date().getTime()
    const dayNumber = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1)

    // 4. Check if Score ALREADY EXISTS (Critical)
    // We only recover if they have NO score for today.
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
        // Already exists, just return success (idempotent)
        return { success: true, recovered: false }
    }

    // 5. Insert Legacy Score
    // Trusting client score here because it's a recovery action for a bug.
    // Cap it reasonably just in case? (e.g. 2000 max)
    const safeScore = Math.min(2000, Math.max(0, score))

    const { error } = await supabaseAdmin
        .from('survival_scores')
        .insert({
            participant_id: participant.id,
            day_number: dayNumber,
            score: safeScore
        })

    if (error) {
        console.error("Recovery score submit error:", error)
        return { error: error.message }
    }

    revalidatePath('/survival')
    return { success: true, recovered: true }
}
