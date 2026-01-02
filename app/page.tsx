'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom, joinRoom } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Trophy, Users, Loader2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [hostName, setHostName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hostName) return
    setIsLoading(true)
    
    try {
        const result = await createRoom(hostName)
        if (result.success && result.code) {
        router.push(`/room/${result.code}?playerId=${result.playerId}`)
        } else {
        setIsLoading(false)
        }
    } catch (error) {
        setIsLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinName || !roomCode) return
    setIsLoading(true)

    try {
        const result = await joinRoom(roomCode.toUpperCase(), joinName)
        if (result.success) {
        router.push(`/room/${roomCode.toUpperCase()}?playerId=${result.playerId}`)
        } else {
        alert(result.error) 
        setIsLoading(false)
        }
    } catch (error) {
        setIsLoading(false)
    }
  }

  return (
    // FORCE DARK MODE: bg-slate-950 and text-white
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 space-y-8 animate-in fade-in duration-500 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col items-center space-y-2 text-center">
        <Trophy className="w-12 h-12 text-yellow-400" />
        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white drop-shadow-sm">
          Saturday to Sunday
        </h1>
        <p className="text-lg font-medium text-slate-400">
          Guess the college. Beat your friends.
        </p>
      </div>

      {/* HOST A GAME CARD */}
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/50 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-white uppercase font-bold text-sm tracking-widest">
            <Users className="w-5 h-5 mr-2 text-blue-500" />
            Host a Game
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="host-name" className="text-xs font-bold text-slate-500 uppercase">Your Name</label>
              <Input 
                id="host-name" 
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. SickosMode" 
                className="border-slate-800 bg-slate-950 text-white placeholder:text-slate-600 h-12"
                required
              />
            </div>
            <Button 
              type="submit"
              disabled={isLoading || !hostName}
              className="w-full h-12 text-lg font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white transition-all"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Room'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* JOIN A GAME CARD */}
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/50 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white uppercase font-bold text-sm tracking-widest flex items-center">
            <Users className="w-5 h-5 mr-2 text-green-500" />
            Join a Game
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="join-name" className="text-xs font-bold text-slate-500 uppercase">Your Name</label>
                <Input 
                  id="join-name" 
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="Player 2" 
                  className="border-slate-800 bg-slate-950 text-white placeholder:text-slate-600 h-12"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="room-code" className="text-xs font-bold text-slate-500 uppercase">Room Code</label>
                <Input 
                  id="room-code" 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCD" 
                  className="border-slate-800 bg-slate-950 text-white placeholder:text-slate-600 uppercase text-center font-mono text-xl tracking-widest h-12"
                  required
                  maxLength={4}
                />
              </div>
            </div>
            <Button 
              type="submit"
              disabled={isLoading || !joinName || !roomCode}
              className="w-full h-12 text-lg font-bold uppercase bg-green-600 hover:bg-green-700 text-white transition-all"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Room'}
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}