'use server'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

// --- 1. SETUP CLIENT ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false },
    global: { headers: { 'Cache-Control': 'no-store' } }
  }
)

// --- HELPER: Pick a Unique "Star" Player ---
async function getUniqueStarPlayerId(excludeIds: number[] = []) {
  console.log("Searching for a star player... Excluding:", excludeIds)

  // 1. Fetch ALL stars (Rating > 50)
  const { data: stars, error } = await supabase
    .from('players')
    .select('id')
    .gt('rating', 50)

  if (error || !stars || stars.length === 0) {
    console.log("CRITICAL: No stars found in DB.")
    return 1 // Fallback
  }

  // 2. Filter out players we have already used
  const availableStars = stars.filter(p => !excludeIds.includes(p.id))

  // 3. Logic: If we ran out of stars, reset and pick anyone (or pick non-stars)
  // For now, we will just pick from the used list again to prevent crashing
  const pool = availableStars.length > 0 ? availableStars : stars
  
  const randomIndex = Math.floor(Math.random() * pool.length)
  const selectedId = pool[randomIndex].id
  
  console.log(`Picked Player ID: ${selectedId} (Pool size: ${pool.length})`)
  return selectedId
}

// --- LOBBY ACTIONS ---

export async function createRoom(formData: FormData) {
  const username = formData.get('username') as string
  const code = Math.random().toString(36).substring(2, 6).toUpperCase()

  // Initialize room with empty used_player_ids array
  const { data: room, error } = await supabase
    .from('rooms')
    .insert({ 
      code, 
      status: 'WAITING',
      used_player_ids: [] 
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await supabase.from('participants').insert({ room_id: room.id, username, is_host: true })
  redirect(`/room/${code}?username=${encodeURIComponent(username)}`)
}

export async function joinRoom(formData: FormData) {
  const username = formData.get('username') as string
  const code = (formData.get('code') as string).toUpperCase()

  const { data: room } = await supabase.from('rooms').select('id').eq('code', code).single()

  if (!room) return redirect('/?error=room_not_found')

  const { error } = await supabase
    .from('participants')
    .insert({ room_id: room.id, username, is_host: false })

  if (error && error.code !== '23505') throw new Error(error.message)

  redirect(`/room/${code}?username=${encodeURIComponent(username)}`)
}

// --- GAME ACTIONS ---

export async function startGame(roomId: string) {
  console.log("STARTING GAME for Room:", roomId)
  
  // 1. Pick first player (no exclusions yet)
  const firstPlayerId = await getUniqueStarPlayerId([])
  
  // 2. Update Room: Set status AND add this player to used list
  await supabase
    .from('rooms')
    .update({ 
      status: 'PLAYING', 
      current_round: 1, 
      current_player_id: firstPlayerId,
      used_player_ids: [firstPlayerId] 
    })
    .eq('id', roomId)
}

export async function nextRound(roomId: string, currentRound: number) {
  console.log("NEXT ROUND called. Current:", currentRound)

  if (currentRound >= 10) {
    await supabase.from('rooms').update({ status: 'FINISHED' }).eq('id', roomId)
    return
  }

  // 1. Fetch the current room to get the used_player_ids list
  const { data: room } = await supabase
    .from('rooms')
    .select('used_player_ids')
    .eq('id', roomId)
    .single()
    
  const usedIds = room?.used_player_ids || []

  // 2. Pick a NEW player, excluding the used ones
  const nextPlayerId = await getUniqueStarPlayerId(usedIds)
  
  // 3. Update Room: Increment round, set new player, append to used list
  await supabase
    .from('rooms')
    .update({ 
      current_round: currentRound + 1, 
      current_player_id: nextPlayerId,
      used_player_ids: [...usedIds, nextPlayerId]
    })
    .eq('id', roomId)
}