'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js' // <--- Fixes createAdminClient error
import { revalidatePath } from 'next/cache'
import { getSimilarDistractors } from '@/lib/conferences' // <--- Fixes getSimilarDistractors error

// --- Helper: Generate Random Room Code ---
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// --- 1. CREATE ROOM ---
export async function createRoom(hostName: string) {
  const supabase = await createClient()
  const safeHostName = hostName || 'Host'

  const { count } = await supabase.from('players').select('*', { count: 'exact', head: true }).gt('rating', 0)
  const randomOffset = Math.floor(Math.random() * (count || 100))
  const { data: players } = await supabase.from('players').select('*').gt('rating', 0).range(randomOffset, randomOffset).limit(1)
  const p = players?.[0]
  
  if (!p) throw new Error("Failed to pick a player")

  const { data: allCollegesData } = await supabase.from('players').select('college').not('college', 'is', null)
  const collegeList = Array.from(new Set(allCollegesData?.map((c: any) => c.college) || [])) as string[]
  
  const wrongColleges = getSimilarDistractors(p.college, collegeList)
  
  const options = [p.college, ...wrongColleges].sort(() => 0.5 - Math.random())
  const roomCode = generateRoomCode() 

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      code: roomCode, 
      current_round: 1,
      total_rounds: 10,
      score: 0,
      game_state: 'waiting',
      current_player_id: p.id,
      correct_answer: p.college,
      options: options,
      host_name: safeHostName 
    })
    .select()
    .single()

  if (error) {
    console.error("Room Creation Error:", error)
    throw new Error('Failed to create room')
  }

  const { data: participant } = await supabase
    .from('room_participants')
    .insert({ room_id: room.id, name: safeHostName, is_host: true })
    .select()
    .single()

  return { success: true, code: room.code, playerId: participant.id }
}

// --- 2. JOIN ROOM ---
export async function joinRoom(roomCode: string, playerName: string) {
  const supabase = await createClient()
  const safeName = playerName || 'Player'

  if (!roomCode) return { success: false, error: 'No code provided' }

  const { data: room } = await supabase.from('rooms').select('id, code').eq('code', roomCode.toUpperCase()).single()
  if (!room) return { success: false, error: 'Room not found' }

  const { data: participant, error: joinError } = await supabase
    .from('room_participants')
    .insert({ room_id: room.id, name: safeName, is_host: false })
    .select()
    .single()

  if (joinError) {
    console.error('Error joining room:', joinError)
    return { success: false, error: 'Failed to join room' }
  }

  return { success: true, code: room.code, playerId: participant.id }
}

// --- 3. START GAME ---
export async function startGame(roomCode: string) {
  const supabase = await createClient()
  await supabase.from('rooms').update({ game_state: 'playing' }).eq('code', roomCode)
  revalidatePath(`/room/${roomCode}`)
}

// --- 4. SUBMIT ANSWER ---
export async function submitAnswer(roomCode: string, participantId: string, answer: string, points: number) {
  const supabase = await createClient()

  const { data: room } = await supabase.from('rooms').select('*').eq('code', roomCode).single()
  if (!room) return { error: 'Room not found' }

  const isCorrect = answer === room.correct_answer
  const pointsToAdd = isCorrect ? points : 0

  if (pointsToAdd > 0) {
    const { data: p } = await supabase.from('room_participants').select('score').eq('id', participantId).single()
    if (p) {
        await supabase.from('room_participants').update({ score: p.score + pointsToAdd }).eq('id', participantId)
    }
  }

  await supabase.from('round_submissions').insert({
    room_id: room.id,
    player_id: participantId,
    round_number: room.current_round
  })

  revalidatePath(`/room/${roomCode}`)
  return { isCorrect, waiting: true }
}

// --- 5. ADVANCE ROUND ---
export async function advanceRound(roomCode: string) {
  const supabase = await createClient()

  const { data: room } = await supabase.from('rooms').select('*').eq('code', roomCode).single()
  if (!room) return

  if (room.current_round >= room.total_rounds) {
    await supabase.from('rooms').update({ game_state: 'finished' }).eq('id', room.id)
    revalidatePath(`/room/${roomCode}`)
    return { gameOver: true }
  }

  const { count } = await supabase.from('players').select('*', { count: 'exact', head: true }).gt('rating', 0)
  const randomOffset = Math.floor(Math.random() * (count || 100))
  const { data: players } = await supabase.from('players').select('*').gt('rating', 0).range(randomOffset, randomOffset).limit(1)
  const nextPlayer = players?.[0]

  if (nextPlayer) {
    const { data: allCollegesData } = await supabase.from('players').select('college').not('college', 'is', null)
    const collegeList = Array.from(new Set(allCollegesData?.map((c: any) => c.college) || [])) as string[]
    
    const wrong = getSimilarDistractors(nextPlayer.college, collegeList)
    const nextOptions = [nextPlayer.college, ...wrong].sort(() => 0.5 - Math.random())

    await supabase.from('rooms').update({
        current_round: room.current_round + 1,
        current_player_id: nextPlayer.id,
        correct_answer: nextPlayer.college,
        options: nextOptions
      }).eq('id', room.id)
  }

  revalidatePath(`/room/${roomCode}`)
  return { success: true }
}

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

// --- 7. DAILY GAME (READ ONLY + EMERGENCY BACKUP) ---
export async function getDailyGame() {
  const supabase = await createClient()
  
  // 1. DATE LOGIC
  const offset = 6 * 60 * 60 * 1000 
  const adjustedTime = new Date(Date.now() - offset)
  const today = adjustedTime.toISOString().split('T')[0]

  // 2. FETCH GAME
  const { data: existingGames } = await supabase
    .from('daily_games')
    .select('content')
    .eq('date', today)
    .limit(1)

  if (existingGames && existingGames.length > 0) {
      return existingGames[0].content
  }

  // 3. EMERGENCY FALLBACK
  // If we reach here, the Cron Job failed. We must generate it now (Just in Time).
  console.log("CRON MISS: Generating emergency game for today...")

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! 
  )

  // Fetch pool using Service Role
  const { data: pool } = await supabaseAdmin.from('players').select('*').gt('rating', 0).limit(200)
  
  if (!pool || pool.length < 10) return null

  // Shuffle and pick 10
  const selectedPlayers = pool.sort(() => 0.5 - Math.random()).slice(0, 10)
  
  // Get colleges for distractors
  const { data: allCollegesData } = await supabase.from('players').select('college').not('college', 'is', null)
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
      tier: p.tier 
    }
  })

  // Save it immediately so the next person doesn't have to wait
  await supabaseAdmin.from('daily_games').insert({ date: today, content: questions })

  return questions
}