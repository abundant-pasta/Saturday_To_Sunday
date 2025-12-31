import { createClient } from '@/utils/supabase/server'
import GameView from '@/components/GameView'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ code: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function RoomPage({ params, searchParams }: Props) {
  const { code } = await params
  const { pid } = await searchParams
  const supabase = await createClient()

  // 1. Fetch Room
  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!room) return notFound()

  // 2. Fetch Current Question Player
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', room.current_player_id)
    .single()

  // 3. Fetch THIS User (Participant)
  let participant = null
  if (pid) {
    const { data: p } = await supabase
      .from('room_participants')
      .select('*')
      .eq('id', pid)
      .single()
    participant = p
  }

  return (
    <GameView 
        initialRoom={room} 
        player={player} 
        initialParticipant={participant} 
    />
  )
}