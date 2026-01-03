'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom, joinRoom } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Play, Loader2, Trophy, Calendar } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const [hostName, setHostName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!hostName) return
    setIsLoading(true)
    try {
      const result = await createRoom(hostName)
      if (result.success && result.code) {
        router.push(`/room/${result.code}?playerId=${result.playerId}`)
      }
    } catch (e) {
      console.error(e)
      setIsLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!roomCode || !joinName) return
    setIsLoading(true)
    setError('')
    try {
      const result = await joinRoom(roomCode.toUpperCase(), joinName)
      if (result.success) {
        router.push(`/room/${result.code}?playerId=${result.playerId}`)
      } else {
        setError(result.error || 'Failed to join')
        setIsLoading(false)
      }
    } catch (e) {
      setError('Failed to join room')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-8">
        
        {/* LOGO AREA */}
        <div className="text-center space-y-4 pt-8">
          <div className="flex justify-center">
            <Trophy className="w-12 h-12 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
              Saturday To Sunday
            </h1>
            <p className="text-slate-400 font-bold text-sm tracking-wide">Guess the college. Beat your friends.</p>
          </div>
        </div>

        <div className="space-y-6">
            
            {/* 1. DAILY CHALLENGE CARD */}
            <Link href="/daily" className="block group">
                <div className="bg-gradient-to-r from-indigo-900 to-purple-900 border border-indigo-500/50 p-1 rounded-xl hover:scale-[1.02] transition-transform cursor-pointer">
                    <div className="bg-slate-900/50 rounded-lg p-4 flex items-center justify-between">
                        <div>
                            <div className="text-indigo-300 font-black uppercase text-sm tracking-widest mb-1">Single Player</div>
                            <div className="text-white font-bold text-xl flex items-center gap-2"><Calendar className="w-5 h-5" /> Daily Challenge</div>
                        </div>
                        <div className="bg-indigo-600 text-white px-4 py-2 rounded font-black uppercase text-sm">Play</div>
                    </div>
                </div>
            </Link>

            {/* 2. HOST GAME CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-blue-400 font-black uppercase text-xs tracking-widest">
                    <Users className="w-4 h-4" /> Host a Game
                </div>
                <div className="space-y-3">
                    <Input 
                        placeholder="Your Name (e.g. SickosMode)" 
                        className="bg-slate-950 border-slate-800 h-12 font-bold text-white placeholder:text-slate-600"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                    />
                    <Button 
                        className="w-full h-12 text-lg font-black uppercase bg-blue-600 hover:bg-blue-500 text-white transition-all" 
                        onClick={handleCreate} 
                        disabled={isLoading || !hostName}
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Create Room'}
                    </Button>
                </div>
            </div>

            {/* 3. JOIN GAME CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-green-400 font-black uppercase text-xs tracking-widest">
                    <Play className="w-4 h-4 fill-current" /> Join a Game
                </div>
                <div className="grid grid-cols-5 gap-3">
                    <Input 
                        placeholder="Your Name" 
                        className="col-span-3 bg-slate-950 border-slate-800 h-12 font-bold text-white placeholder:text-slate-600"
                        value={joinName}
                        onChange={(e) => setJoinName(e.target.value)}
                    />
                    <Input 
                        placeholder="ABCD" 
                        className="col-span-2 bg-slate-950 border-slate-800 h-12 font-black text-center uppercase text-white placeholder:text-slate-700"
                        maxLength={4}
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    />
                </div>
                {error && <div className="text-red-500 text-xs font-bold text-center">{error}</div>}
                <Button 
                    className="w-full h-12 text-lg font-black uppercase bg-green-600 hover:bg-green-500 text-white transition-all" 
                    onClick={handleJoin} 
                    disabled={isLoading || !roomCode || !joinName}
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Enter Room'}
                </Button>
            </div>

        </div>
      </div>
    </div>
  )
}