import { createClient } from '@/utils/supabase/server'
import GameView from '@/components/GameView'
import { notFound } from 'next/navigation'

// We do NOT import actions here anymore!
export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()

  // 1. Fetch Room
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', code)
    .single()

  if (!room) return notFound()

  // 2. Fetch Player
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', room.current_player_id)
    .single()

  return <GameView initialRoom={room} player={player} />
}