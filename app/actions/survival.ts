'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { hashAnswer, generateSalt } from '@/utils/crypto'
import { getConference } from '@/lib/conferences'
import { TIER_MULTIPLIERS, type Sport } from '@/lib/constants'
import {
    buildAnswerSecurity,
    getAcceptedCollegeAnswers,
    getSurvivalSportKey,
    getTransferSafeDistractors,
    matchesQuestionAnswer,
} from '@/lib/player-trust'

import { createClient as createAdminClient } from '@supabase/supabase-js'

const BYPASS_USER_IDS = ['63719211-dc3a-4801-8295-3465c9b6d5f0'] // Tom Gordon (Allow play Feb 24)
const SURVIVAL_TOURNAMENT_DAYS = 5

function getStoredPlayerName(name: unknown) {
    if (typeof name !== 'string') return ''
    const value = name.trim()
    const normalized = value.replace(/=+$/, '')

    if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
        return value
    }

    try {
        const decoded = Buffer.from(value, 'base64').toString('utf-8')
        const roundTrip = Buffer.from(decoded, 'utf-8').toString('base64').replace(/=+$/, '')
        return roundTrip === normalized ? decoded : value
    } catch {
        return value
    }
}

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

function getSurvivalSourceSports(sportMode?: string | null): Sport[] {
    if (sportMode === 'football') return ['football']
    if (sportMode === 'mixed') return ['football', 'basketball']
    return ['basketball']
}

function getSurvivalRoundCount(sportMode: string | null | undefined, sport: Sport) {
    if (sportMode === 'mixed') return sport === 'football' ? 5 : 5
    return 10
}

function getSurvivalMultiplier(tier: number, sport: Sport) {
    const multipliers = TIER_MULTIPLIERS[sport]
    return multipliers[tier as keyof typeof multipliers] || 1.0
}

function getSurvivalDayContext(startDate: string) {
    const start = new Date(startDate).getTime()
    const now = Date.now()
    const dayNumber = Math.min(
        SURVIVAL_TOURNAMENT_DAYS,
        Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1)
    )

    const offsetDate = new Date(start + (dayNumber - 1) * 24 * 60 * 60 * 1000)

    return {
        dayNumber,
        gameDate: offsetDate.toISOString().split('T')[0]
    }
}

export async function getSurvivalGame() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    let status = 'new'
    let score = 0
    let dayNumber = 1

    const { data: tournament } = await supabase
        .from('survival_tournaments')
        .select('id, start_date, sport_mode')
        .eq('is_active', true)
        .single()

    const sportMode = tournament?.sport_mode || 'basketball'
    const sport = getSurvivalSportKey(sportMode)

    // Determine the "Game Date" based on the tournament schedule (Day 1 starts at tournament.start_date)
    // This handles the 6-hour offset (06:00 UTC) so that the game doesn't swap at midnight UTC.
    let gameDate = new Date().toISOString().split('T')[0]

    if (tournament) {
        const dayContext = getSurvivalDayContext(tournament.start_date)
        dayNumber = dayContext.dayNumber
        gameDate = dayContext.gameDate
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
        const needsSecurity = questions.some(q => q.correct_answer || (!q.answer_hash && !q.answer_hashes))

        let safeQuestions = questions
        if (needsSecurity) {
            console.log(`Securing legacy survival game on-the-fly...`)
            safeQuestions = await Promise.all(questions.map(async (q) => {
                const answer = q.correct_answer || q.answer
                const answers = Array.from(new Set([answer, ...(Array.isArray(q.accepted_colleges) ? q.accepted_colleges : [])].filter(Boolean)))
                const salt = q.salt || generateSalt()
                const answerHashes = q.answer_hashes || await Promise.all(answers.map((college) => hashAnswer(college, salt)))
                const name = (q.name.includes(' ') || !q.name.includes('='))
                    ? Buffer.from(q.name).toString('base64')
                    : q.name

                return {
                    ...q,
                    name,
                    answer_hash: q.answer_hash || answerHashes[0],
                    answer_hashes: answerHashes,
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

    const selectedPlayers: any[] = []
    const poolsBySport = new Map<Sport, any[]>()

    for (const sourceSport of getSurvivalSourceSports(sportMode)) {
        const { data: pool } = await supabaseAdmin
            .from('players')
            .select('*')
            .eq('sport', sourceSport)
            .in('game_mode', ['survival', 'both'])
            .gt('rating', 0)
            .not('image_url', 'is', null)
            .not('image_status', 'in', '("spoiler","wrong_person","missing")')
            .order('rating', { ascending: false })
            .limit(300)

        const count = getSurvivalRoundCount(sportMode, sourceSport)
        if (!pool || pool.length < count) return null
        poolsBySport.set(sourceSport, pool)
        selectedPlayers.push(...shuffleArray(pool).slice(0, count))
    }

    const questions = await Promise.all(shuffleArray(selectedPlayers).map(async p => {
        const sourceSport = p.sport as Sport
        const pool = poolsBySport.get(sourceSport) || []
        const allColleges = Array.from(new Set(pool.map(player => player.college).filter(Boolean))) as string[]
        const distractors = getTransferSafeDistractors(p, allColleges)
        while (distractors.length < 3) distractors.push('Unknown University')
        const options = shuffleArray([p.college, ...distractors.slice(0, 3)])
        const security = await buildAnswerSecurity(getAcceptedCollegeAnswers(p))

        return {
            id: p.id,
            name: Buffer.from(p.name).toString('base64'),
            image_url: p.image_url,
            answer_hash: security.answer_hash,
            answer_hashes: security.answer_hashes,
            salt: security.salt,
            options,
            tier: p.tier,
            sport: sourceSport,
            team: p.team,
            college: p.college,
            accepted_colleges: p.accepted_colleges || [],
            college_answer_note: p.college_answer_note || null,
            conference: getConference(p.college)
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

export async function getSurvivalParticipants(tournamentId: string): Promise<string[]> {
    const supabase = await createClient()

    const { data: participants } = await supabase
        .from('survival_participants')
        .select('user_id')
        .eq('tournament_id', tournamentId)
        .eq('status', 'active')

    if (!participants || participants.length === 0) return []

    const userIds = participants.map(p => p.user_id)

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .in('id', userIds)

    return (profiles || []).map(p => p.username || p.full_name || 'Player')
}

export async function joinTournament(tournamentId: string, campaignMetadata: Record<string, string | null> = {}) {
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

        const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        await supabaseAdmin.from('growth_events').insert({
            user_id: user.id,
            event_name: 'survival_joined',
            metadata: {
                tournament_id: tournamentId,
                ...campaignMetadata,
            }
        })

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
    const { dayNumber, gameDate } = getSurvivalDayContext(tournament.start_date)

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
    // 3. Get Game Content (Securely)
    // We need the *full* content including answers/hashes to verify
    const sport = getSurvivalSportKey(tournament.sport_mode || 'basketball')

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

    const results: any[] = []

    for (const ans of answers) {
        const question = questions.find(q => q.id === ans.questionId)
        if (!question) continue

        let isCorrect = false
        isCorrect = await matchesQuestionAnswer(question, ans.answer)

        results.push({
            player_id: question.id,
            player_name: getStoredPlayerName(question.name),
            // DailyGame stores it as: { result, player_id, player_name }
            // User requested: "like this: [{""result"": ""wrong"", ""player_id"": 2881, ""player_name"": ""Dennis Rodman""}...]"
            result: isCorrect ? 'correct' : 'wrong'
        })

        if (isCorrect) {
            streak++
            const validPotential = Math.min(100, Math.max(10, ans.potentialPoints))
            const tier = question.tier || 1
            const questionSport = question.sport === 'football' ? 'football' : 'basketball'
            const multiplier = getSurvivalMultiplier(tier, questionSport)
            const points = Math.round(validPotential * multiplier)

            let bonus = 0
            if (streak === 6) bonus = 50
            if (streak === 10) bonus = 150

            finalScore += (points + bonus)
        } else {
            streak = 0
        }
    }

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

    await supabaseAdmin.from('growth_events').insert({
        user_id: user.id,
        event_name: 'survival_round_played',
        sport,
        metadata: {
            tournament_id: tournament.id,
            sport_mode: tournament.sport_mode || 'basketball',
            day_number: dayNumber,
            score: finalScore
        }
    })

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
    const { dayNumber } = getSurvivalDayContext(tournament.start_date)

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

    await supabaseAdmin.from('growth_events').insert({
        user_id: user.id,
        event_name: 'survival_round_played',
        sport: getSurvivalSportKey(tournament.sport_mode || 'basketball'),
        metadata: {
            tournament_id: tournament.id,
            sport_mode: tournament.sport_mode || 'basketball',
            day_number: dayNumber,
            score: safeScore,
            recovered: true
        }
    })

    revalidatePath('/survival')
    return { success: true, recovered: true }
}
