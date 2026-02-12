'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getSimilarDistractors } from '@/lib/conferences'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'

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
  const { error } = await supabase.from('players').update({ image_url: imageUrl }).eq('id', playerId)
  if (error) {
    console.error('Error updating player image:', error)
    throw new Error('Failed to update player image')
  }
  revalidatePath('/admin')
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
      return existingGames[0].content
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

  const questions = selectedPlayers.map((p: any) => {
    const wrong = getSimilarDistractors(p.college, collegeList)
    const options = [p.college, ...wrong].sort(() => 0.5 - Math.random())
    return {
      id: p.id,
      name: p.name,
      image_url: p.image_url,
      correct_answer: p.college,
      options: options,
      tier: p.tier,
      sport: p.sport // Useful for UI
    }
  })

  // Save it immediately with the Sport tag
  await supabaseAdmin.from('daily_games').insert({ 
    date: today, 
    content: questions,
    sport: sport // <--- Save with sport tag
  })

  return questions
}