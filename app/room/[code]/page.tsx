'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@supabase/supabase-js'
import { startGame, nextRound } from '@/app/actions' 
import GameView from '@/components/GameView'
import { Trophy, Play, CheckCircle2, Clock, Users } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const searchParams = useSearchParams()
  const username = searchParams.get('username')
  
  const [room, setRoom] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])

  const currentUser = participants.find((u: any) => u.username === username)

  // Calculate who is still thinking
  // We check if their 'last_answered_round' matches the room's 'current_round'
  const playersDone = participants.filter(p => p.last_answered_round === room?.current_round).length
  const totalPlayers = participants.length
  const everyoneAnswered = playersDone === totalPlayers && totalPlayers > 0

  const refreshRoom = async () => {
    if (!room?.id && !code) return
    const query = room?.id ? supabase.from('rooms').select('*').eq('id', room.id) : supabase.from('rooms').select('*').eq('code', code)
    const { data: roomData } = await query.single()
    if (roomData) setRoom(roomData)
    if (roomData?.id) {
       const { data: usersData } = await supabase.from('participants').select('*').eq('room_id', roomData.id)
       if (usersData) setParticipants(usersData)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: roomData } = await supabase.from('rooms').select('*').eq('code', code).single()
      setRoom(roomData)
      if (roomData) {
         const { data: usersData } = await supabase.from('participants').select('*').eq('room_id', roomData.id)
         setParticipants(usersData || [])
      }
    }
    init()

    const channel = supabase
      .channel('room_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${code}` }, 
        (payload: any) => setRoom(payload.new)
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, 
        async () => {
             const { data } = await supabase.from('participants').select('*').eq('room_id', room?.id)
             setParticipants(data || [])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [code, room?.id]) 

  if (!room) return <div className="text-white p-10 flex justify-center">Loading Room...</div>

  const handleStartGame = async () => {
    await startGame(room.id)
    setTimeout(refreshRoom, 100) 
  }

  const handleNextRound = async () => {
    await nextRound(room.id, room.current_round)
    setTimeout(refreshRoom, 100)
  }

  const handleScoreUpdate = async (isCorrect: boolean, points: number) => {
    if (!currentUser) return
    
    // Update Score AND mark this round as "answered"
    const newScore = (currentUser.score || 0) + points
    
    await supabase.from('participants').update({ 
      score: newScore,
      last_answered_round: room.current_round 
    }).eq('id', currentUser.id)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div className="text-sm font-mono text-slate-400">
          ROOM: <span className="text-xl font-bold text-white tracking-widest">{room.code}</span>
        </div>
        
        {/* Mobile-friendly Score for current user */}
        <div className="flex items-center gap-2 md:hidden">
           <Trophy className="w-4 h-4 text-yellow-500" />
           <span className="font-bold">{currentUser?.score || 0}</span>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Main Game Area (Takes up 2/3 space) */}
        <div className="md:col-span-2 space-y-6">
          
          {room?.status === 'WAITING' && (
             <div className="text-center space-y-6 pt-10">
                <h1 className="text-3xl font-bold">Waiting for players...</h1>
                {currentUser?.is_host && (
                  <button onClick={handleStartGame} className="w-full max-w-md mx-auto bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2">
                    <Play className="fill-current" /> START GAME
                  </button>
                )}
                {!currentUser?.is_host && <p className="text-slate-500 animate-pulse">Host will start soon...</p>}
             </div>
          )}

          {room?.status === 'PLAYING' && (
            <>
               <div className="text-center">
                 <span className="bg-slate-800 text-slate-300 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm">
                   Round {room.current_round} / 10
                 </span>
               </div>
               
               <GameView 
                 key={room.current_round} 
                 playerId={room.current_player_id} 
                 onGuess={handleScoreUpdate} 
               />

               {/* Host Controls */}
               {currentUser?.is_host && (
                 <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-6 text-center">
                    {everyoneAnswered ? (
                        <button 
                          onClick={handleNextRound} 
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg animate-bounce-short transition-all"
                        >
                          Next Round &rarr;
                        </button>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-slate-400 font-mono text-sm py-2">
                          <Clock className="w-4 h-4 animate-spin-slow" />
                          Waiting for {totalPlayers - playersDone} players...
                        </div>
                    )}
                 </div>
               )}
            </>
          )}

          {room?.status === 'FINISHED' && (
             <div className="text-center pt-10">
                <h1 className="text-5xl font-black italic mb-2">GAME OVER</h1>
                <p className="text-slate-400">Check the leaderboard to see who won!</p>
             </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Leaderboard (Takes up 1/3 space) */}
        <div className="hidden md:block bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden h-fit sticky top-4">
          <div className="bg-slate-800/50 p-4 border-b border-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-slate-300">Live Standings</h3>
          </div>
          <div className="divide-y divide-slate-800/50">
            {participants.sort((a,b) => b.score - a.score).map((p, i) => {
              // Check if this specific player is "Done" with the round
              const isDone = p.last_answered_round === room?.current_round
              const isMe = p.username === username
              
              return (
                <div key={p.id} className={`p-4 flex items-center gap-3 ${isMe ? 'bg-blue-500/10' : ''}`}>
                   <div className={`font-mono font-bold text-sm w-6 ${i===0 ? 'text-yellow-500' : 'text-slate-500'}`}>
                     #{i+1}
                   </div>
                   <div className="flex-1">
                     <div className={`font-bold text-sm ${isMe ? 'text-white' : 'text-slate-300'}`}>
                       {p.username} {isMe && '(You)'}
                     </div>
                   </div>
                   
                   {/* Status Indicators */}
                   {room?.status === 'PLAYING' && (
                     <div className="flex items-center gap-3">
                        {/* Show Checkmark if they answered */}
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-700 border-t-slate-400 animate-spin" />
                        )}
                        <span className="font-mono font-bold text-yellow-500">{p.score}</span>
                     </div>
                   )}
                   
                   {room?.status !== 'PLAYING' && (
                      <span className="font-mono font-bold text-yellow-500">{p.score}</span>
                   )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </main>
  )
}