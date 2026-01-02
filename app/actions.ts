'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// --- Helper: Generate Random Room Code ---
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// --- Helper: Distractors (Inlined for safety) ---
function getSimilarDistractors(correctCollege: string, allColleges: string[]) {
  // Filter out the correct answer and empty values
  const pool = allColleges.filter(c => c && c !== correctCollege)
  // Shuffle and pick 3
  return pool.sort(() => 0.5 - Math.random()).slice(0, 3)
}

// --- 1. CREATE ROOM ---
// FIXED: Changed signature to accept 'string' instead of 'FormData'
export async function createRoom(hostName: string) {
  const supabase = await createClient()
  const safeHostName = hostName || 'Host'

  // Fetch initial player
  const { count } = await supabase.from('players').select('*', { count: 'exact', head: true }).gt('rating', 0)
  const randomOffset = Math.floor(Math.random() * (count || 100))
  const { data: players } = await supabase.from('players').select('*').gt('rating', 0).range(randomOffset, randomOffset).limit(1)
  const p = players?.[0]
  
  if (!p) throw new Error("Failed to pick a player")

  // Generate Options
  const { data: allCollegesData } = await supabase.from('players').select('college').not('college', 'is', null)
  const collegeList = Array.from(new Set(allCollegesData?.map((c: any) => c.college) || [])) as string[]
  const wrongColleges = getSimilarDistractors(p.college, collegeList)
  const options = [p.college, ...wrongColleges].sort(() => 0.5 - Math.random())
  const roomCode = generateRoomCode() 

  // Create Room
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

  // Add Host
  const { data: participant } = await supabase
    .from('room_participants')
    .insert({ room_id: room.id, name: safeHostName, is_host: true })
    .select()
    .single()

  // Redirect
  redirect(`/room/${room.code}?playerId=${participant.id}`) 
}

// --- 2. JOIN ROOM ---
export async function joinRoom(formData: FormData) {
  const supabase = await createClient()
  const code = formData.get('code') as string
  const playerName = formData.get('playerName') as string || 'Player'

  if (!code) return

  const { data: room } = await supabase.from('rooms').select('id, code').eq('code', code.toUpperCase()).single()
  if (!room) throw new Error("Room not found")

  const { data: participant } = await supabase
    .from('room_participants')
    .insert({ room_id: room.id, name: playerName, is_host: false })
    .select()
    .single()

  redirect(`/room/${room.code}?playerId=${participant.id}`)
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

  // Update Participant Score
  if (pointsToAdd > 0) {
    const { data: p } = await supabase.from('room_participants').select('score').eq('id', participantId).single()
    if (p) {
        await supabase.from('room_participants').update({ score: p.score + pointsToAdd }).eq('id', participantId)
    }
  }

  // Record Submission
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

  // Check Game Over
  if (room.current_round >= room.total_rounds) {
    await supabase.from('rooms').update({ game_state: 'finished' }).eq('id', room.id)
    revalidatePath(`/room/${roomCode}`)
    return { gameOver: true }
  }

  // Get Next Player
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