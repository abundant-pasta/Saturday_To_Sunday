'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getSimilarDistractors } from '@/lib/conferences'

export async function createRoom(formData: FormData) {
  const supabase = await createClient()

  // 1. Get a list of ALL colleges to use for "smart distractors"
  const { data: allCollegesData } = await supabase
    .from('players')
    .select('college')
    .not('college', 'is', null)

  // FIX: We forcefully tell TypeScript this is a list of strings
  const collegeList = Array.from(new Set(
    allCollegesData?.map((c: any) => c.college) || []
  )) as string[]

  // 2. Pick a Random Player (Rating > 0)
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .gt('rating', 0)

  if (!count) throw new Error("No players found!")

  const randomOffset = Math.floor(Math.random() * count)

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .gt('rating', 0)
    .range(randomOffset, randomOffset)
    .limit(1)

  const p = players?.[0]
  if (!p) throw new Error("Failed to pick a player")

  // 3. Generate Smart Options
  const correctCollege = p.college
  const wrongColleges = getSimilarDistractors(correctCollege, collegeList)
  
  const options = [correctCollege, ...wrongColleges].sort(() => 0.5 - Math.random())

  // 4. Create the Room
  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      current_round: 1,
      total_rounds: 10,
      score: 0,
      game_state: 'playing',
      current_player_id: p.id,
      correct_answer: p.college,
      options: options
    })
    .select()
    .single()

  if (error) {
    console.error(error)
    throw new Error('Failed to create room')
  }

  redirect(`/room/${room.id}`)
}

export async function submitAnswer(roomId: string, answer: string) {
  const supabase = await createClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single()

  if (!room) return { error: 'Room not found' }

  const isCorrect = answer === room.correct_answer
  const newScore = isCorrect ? room.score + 1 : room.score

  // CHECK GAME OVER
  if (room.current_round >= room.total_rounds) {
    await supabase
      .from('rooms')
      .update({ 
        game_state: 'finished',
        score: newScore 
      })
      .eq('id', roomId)
    
    revalidatePath(`/room/${roomId}`)
    return { isCorrect, gameOver: true }
  }

  // PREPARE NEXT ROUND
  // We need the college list again for the next question
  const { data: allCollegesData } = await supabase
    .from('players')
    .select('college')
    .not('college', 'is', null)

  const collegeList = Array.from(new Set(
    allCollegesData?.map((c: any) => c.college) || []
  )) as string[]

  // Pick new player
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .gt('rating', 0)
  
  const randomOffset = Math.floor(Math.random() * (count || 100))
  
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .gt('rating', 0)
    .range(randomOffset, randomOffset)
    .limit(1)

  const nextPlayer = players?.[0]

  if (nextPlayer) {
    const wrong = getSimilarDistractors(nextPlayer.college, collegeList)
    const nextOptions = [nextPlayer.college, ...wrong].sort(() => 0.5 - Math.random())

    await supabase
      .from('rooms')
      .update({
        current_round: room.current_round + 1,
        score: newScore,
        current_player_id: nextPlayer.id,
        correct_answer: nextPlayer.college,
        options: nextOptions
      })
      .eq('id', roomId)
  }

  revalidatePath(`/room/${roomId}`)
  return { isCorrect, gameOver: false }
}