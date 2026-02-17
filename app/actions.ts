'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getSimilarDistractors } from '@/lib/conferences'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'
import { hashAnswer, generateSalt } from '@/utils/crypto'

// --- Helper: Generate Random Room Code ---


// --- 6. ADMIN FUNCTIONS ---
export async function deletePlayer(playerId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('players').delete().eq('id', playerId)
  if (error) {
    console.error('Error deleting player:', error)
    throw new Error('Failed to delete player')
  }
  revalidatePath('/admin')
}

export async function updatePlayerImage(playerId: string, imageUrl: string) {
  const supabase = await createClient()

  // Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const isAuthorized = user && adminEmail && user.email?.toLowerCase() === adminEmail?.toLowerCase()

  if (!isAuthorized) {
    throw new Error('Unauthorized')
  }

  // Use Admin Client (Service Role) to bypass RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin.from('players').update({
    image_url: imageUrl,
    is_image_verified: true
  }).eq('id', playerId)

  if (error) {
    console.error('Error updating player image:', error)
    throw new Error('Failed to update player image')
  }
  revalidatePath('/admin')
  revalidatePath('/admin/images')
}

export async function verifyPlayerImage(playerId: string, isVerified: boolean) {
  const supabase = await createClient()

  // Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const isAuthorized = user && adminEmail && user.email?.toLowerCase() === adminEmail?.toLowerCase()

  if (!isAuthorized) {
    throw new Error('Unauthorized')
  }

  // Use Admin Client (Service Role) to bypass RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin.from('players').update({ is_image_verified: isVerified }).eq('id', playerId)

  if (error) {
    console.error('Error verifying player image:', error)
    throw new Error('Failed to verify player image')
  }
  revalidatePath('/admin/images')
}

// --- 7. DAILY GAME (MULTI-SPORT SUPPORT) ---
// Note: We accept a 'sport' parameter now.
export async function getDailyGame(sport: string = 'football') {
  const supabase = await createClient()

  // 1. DATE LOGIC
  const adjustedTime = new Date(Date.now() - TIMEZONE_OFFSET_MS)
  const today = adjustedTime.toISOString().split('T')[0]

  // 2. FETCH GAME (Filtered by Sport)
  // Ensure your 'daily_games' table has a 'sport' column, or this filter will fail.
  // If you haven't added it yet, run: ALTER TABLE daily_games ADD COLUMN sport TEXT DEFAULT 'football';
  const { data: existingGames } = await supabase
    .from('daily_games')
    .select('content')
    .eq('date', today)
    .eq('sport', sport) // <--- The Logic Wall
    .limit(1)

  if (existingGames && existingGames.length > 0) {
    const questions = existingGames[0].content as any[]

    // Check if the first question is already secured (has answer_hash and NO plain name)
    // Actually, check for 'correct_answer' since that's what we want to REMOVE.
    const needsSecurity = questions.some(q => q.correct_answer || !q.answer_hash || !q.name.includes('=') && q.name.length < 50) // Basic heuristic

    if (!needsSecurity) return questions

    console.log(`Securing legacy ${sport} game on-the-fly...`)
    return await Promise.all(questions.map(async (q) => {
      const answer = q.correct_answer || q.answer // Support both legacy key names
      const salt = q.salt || generateSalt()
      const answerHash = q.answer_hash || await hashAnswer(answer, salt)

      // Determine if name needs obfuscation (if it's plain text)
      // A simple check: if it contains spaces, it's likely plain text
      const name = (q.name.includes(' ') || !q.name.includes('='))
        ? Buffer.from(q.name).toString('base64')
        : q.name

      return {
        ...q,
        name,
        answer_hash: answerHash,
        salt: salt,
        correct_answer: undefined, // Eviscerate the plain text answer
        answer: undefined
      }
    }))
  }

  // 3. EMERGENCY FALLBACK
  console.log(`CRON MISS: Generating emergency ${sport} game for today...`)

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch pool using Service Role & Sport Filter
  const { data: pool } = await supabaseAdmin
    .from('players')
    .select('*')
    .gt('rating', 0)
    .eq('sport', sport) // <--- Fetch only relevant players
    .limit(200)

  if (!pool || pool.length < 10) return null

  // Shuffle and pick 10
  const selectedPlayers = pool.sort(() => 0.5 - Math.random()).slice(0, 10)

  // Get colleges for distractors (Filtered by Sport)
  const { data: allCollegesData } = await supabase
    .from('players')
    .select('college')
    .eq('sport', sport) // <--- Distractors must match the sport
    .not('college', 'is', null)

  const collegeList = Array.from(new Set(allCollegesData?.map((c: any) => c.college) || [])) as string[]

  const questions = await Promise.all(selectedPlayers.map(async (p: any) => {
    const wrong = getSimilarDistractors(p.college, collegeList)
    const options = [p.college, ...wrong].sort(() => 0.5 - Math.random())

    // Security: Hash the answer so it's not visible in network tab
    const salt = generateSalt()
    const answerHash = await hashAnswer(p.college, salt)

    return {
      id: p.id,
      name: Buffer.from(p.name).toString('base64'),
      image_url: p.image_url,
      // correct_answer: p.college, // REMOVED FOR SECURITY
      answer_hash: answerHash,
      salt: salt,
      options: options,
      tier: p.tier,
      sport: p.sport // Useful for UI
    }
  }))

  // Save it immediately with the Sport tag
  await supabaseAdmin.from('daily_games').insert({
    date: today,
    content: questions,
    sport: sport // <--- Save with sport tag
  })

  return questions
}