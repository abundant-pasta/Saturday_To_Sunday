'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom, joinRoom } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Play, Loader2, Trophy, Calendar } from 'lucide-react'
import Link from 'next/link'
import InstallPWA from '@/components/InstallPWA' // <--- Added

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
    <div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center p-4 font-sans overflow-hidden">
      <div className="w-full max-w-md flex flex-col gap-4">
        
        {/* LOGO AREA */}
        <div className="text-center space-y-2 py-2">
          <div className="flex justify-center">
            <Trophy className="w-8 h-8 md:w-12 md:h-12 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-tight">
              Saturday To Sunday
            </h1>
            <p className="text-neutral-400 font-bold text-xs md:text-sm tracking-wide">Guess the college. Beat your friends.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
            
            {/* 1. DAILY CHALLENGE CARD */}
            <Link href="/daily" className="block group">
                <div className="bg-gradient-to-r from-neutral-900 to-emerald-950 border border-emerald-500/30 group-hover:border-[#00ff80] p-1 rounded-xl hover:scale-[1.02] transition-all cursor-pointer">
                    <div className="bg-neutral-900/50 rounded-lg p-3 md:p-4 flex items-center justify-between">
                        <div>
                            <div className="text-[#00ff80] font-black uppercase text-[10px] md:text-sm tracking-widest mb-0.5">Single Player</div>
                            <div className="text-white font-bold text-lg md:text-xl flex items-center gap-2"><Calendar className="w-4 h-4 md:w-5 md:h-5" /> Daily Challenge</div>
                        </div>
                        <div className="bg-[#00ff80] text-black px-3 py-1.5 md:px-4 md:py-2 rounded font-black uppercase text-xs md:text-sm transition-colors group-hover:bg-white">Play</div>
                    </div>
                </div>
            </Link>

            {/* LEADERBOARD BUTTON */}
            <Link href="/leaderboard" className="w-full">
              <Button 
                variant="outline" 
                className="w-full h-14 text-lg font-black tracking-tighter border-neutral-800 bg-transparent text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all"
              >
                <Trophy className="mr-2 w-5 h-5 text-yellow-500" /> View Today's Leaderboard
              </Button>
            </Link>

            {/* 2. HOST GAME CARD */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 md:p-6 space-y-3 md:space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-[#00ff80] font-black uppercase text-[10px] md:text-xs tracking-widest">
                    <Users className="w-3 h-3 md:w-4 md:h-4" /> Host a Game
                </div>
                <div className="space-y-2 md:space-y-3">
                    <Input 
                        placeholder="Your Name (e.g. SickosMode)" 
                        className="bg-neutral-950 border-neutral-800 h-10 md:h-12 font-bold text-white placeholder:text-neutral-600 focus-visible:ring-[#00ff80]"
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                    />
                    <Button 
                        className="w-full h-10 md:h-12 text-base md:text-lg font-black uppercase bg-[#00ff80] hover:bg-[#05ff84] text-black transition-all" 
                        onClick={handleCreate} 
                        disabled={isLoading || !hostName}
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Create Room'}
                    </Button>
                </div>
            </div>

            {/* 3. JOIN GAME CARD */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 md:p-6 space-y-3 md:space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-[#00ff80] font-black uppercase text-[10px] md:text-xs tracking-widest">
                    <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" /> Join a Game
                </div>
                <div className="grid grid-cols-5 gap-2 md:gap-3">
                    <Input 
                        placeholder="Your Name" 
                        className="col-span-3 bg-neutral-950 border-neutral-800 h-10 md:h-12 font-bold text-white placeholder:text-neutral-600 focus-visible:ring-[#00ff80]"
                        value={joinName}
                        onChange={(e) => setJoinName(e.target.value)}
                    />
                    <Input 
                        placeholder="ABCD" 
                        className="col-span-2 bg-neutral-950 border-neutral-800 h-10 md:h-12 font-black text-center uppercase text-white placeholder:text-neutral-600 focus-visible:ring-[#00ff80]"
                        maxLength={4}
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    />
                </div>
                {error && <div className="text-red-500 text-xs font-bold text-center">{error}</div>}
                <Button 
                    className="w-full h-10 md:h-12 text-base md:text-lg font-black uppercase bg-[#00ff80] hover:bg-[#05ff84] text-black transition-all" 
                    onClick={handleJoin} 
                    disabled={isLoading || !roomCode || !joinName}
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Enter Room'}
                </Button>
            </div>
            
             {/* INSTALL PWA BUTTON */}
            <InstallPWA />

        </div>
      </div>
    </div>
  )
}