'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSimilarDistractors } from '@/lib/conferences'

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// --- 1. CREATE ROOM ---
export async function createRoom(formData: FormData) {
  const supabase = await createClient()
  const playerName = formData.get('playerName') as string || 'Host'

  // Fetch initial player (Same as before)
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

  // A. Create Room
  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      code: roomCode, 
      current_round: 1,
      total_rounds: 10,
      score: 0, // Legacy field, ignored now
      game_state: 'waiting',
      current_player_id: p.id,
      correct_answer: p.college,
      options: options,
      host_name: playerName 
    })
    .select()
    .single()

  if (error) throw new Error('Failed to create room')

  // B. Add Host as Participant
  const { data: participant } = await supabase
    .from('room_participants')
    .insert({ room_id: room.id, name: playerName, is_host: true })
    .select()
    .single()

  // Redirect with PID (Participant ID) so we know who is who
  redirect(`/room/${room.code}?pid=${participant.id}`) 
}

// --- 2. JOIN ROOM ---
export async function joinRoom(formData: FormData) {
  const supabase = await createClient()
  const code = formData.get('code') as string
  const playerName = formData.get('playerName') as string || 'Player'

  if (!code) return

  // Find Room
  const { data: room } = await supabase.from('rooms').select('id, code').eq('code', code.toUpperCase()).single()
  if (!room) throw new Error("Room not found")

  // Add Participant
  const { data: participant } = await supabase
    .from('room_participants')
    .insert({ room_id: room.id, name: playerName, is_host: false })
    .select()
    .single()

  redirect(`/room/${room.code}?pid=${participant.id}`)
}

// --- 3. START GAME ---
export async function startGame(roomCode: string) {
  const supabase = await createClient()
  await supabase.from('rooms').update({ game_state: 'playing' }).eq('code', roomCode)
  revalidatePath(`/room/${roomCode}`)
}

// --- 4. SUBMIT ANSWER (Does NOT advance round anymore) ---
export async function submitAnswer(roomCode: string, participantId: string, answer: string, points: number) {
  const supabase = await createClient()

  const { data: room } = await supabase.from('rooms').select('*').eq('code', roomCode).single()
  if (!room) return { error: 'Room not found' }

  const isCorrect = answer === room.correct_answer
  const pointsToAdd = isCorrect ? points : 0

  // Update Participant Score
  if (pointsToAdd > 0) {
    // We need to fetch current score first to increment safely, or use an RPC. 
    // For simplicity, we'll just fetch-update.
    const { data: p } = await supabase.from('room_participants').select('score').eq('id', participantId).single()
    if (p) {
        await supabase.from('room_participants').update({ score: p.score + pointsToAdd }).eq('id', participantId)
    }
  }

  // Mark as Submitted for this round
  await supabase.from('round_submissions').insert({
    room_id: room.id,
    participant_id: participantId,
    round_number: room.current_round
  })

  revalidatePath(`/room/${roomCode}`)
  return { isCorrect, waiting: true }
}

// --- 5. ADVANCE ROUND (Host Only) ---
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

  // Setup Next Player
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