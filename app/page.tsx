'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createRoom, joinRoom } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Play, Loader2, Trophy, Calendar, User as UserIcon, LogOut } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image' // <--- Added for Avatar
import InstallPWA from '@/components/InstallPWA'
import { createBrowserClient } from '@supabase/ssr' // <--- Added for Auth

export default function Home() {
  const router = useRouter()
  
  // Auth State
  const [user, setUser] = useState<any>(null)
  const [showSignOut, setShowSignOut] = useState(false)
  
  // Game State
  const [hostName, setHostName] = useState('')
  const [joinName, setJoinName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. Check Session on Mount
  useEffect(() => {
    const getUser = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 2. Auth Handlers
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`
        }
    })
  }

  const handleSignOut = async () => {
      await supabase.auth.signOut()
      setShowSignOut(false)
  }

  // 3. Game Handlers
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
    <div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center p-4 font-sans overflow-hidden relative">
      
      {/* --- TOP RIGHT PROFILE ICON --- */}
      <div className="absolute top-4 right-4 z-50">
        {user ? (
            <div className="relative">
                <button 
                    onClick={() => setShowSignOut(!showSignOut)}
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-neutral-800 hover:border-[#00ff80] transition-colors relative"
                >
                    {user.user_metadata?.avatar_url ? (
                        <Image src={user.user_metadata.avatar_url} alt="User" fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                             <UserIcon className="w-5 h-5 text-neutral-400" />
                        </div>
                    )}
                </button>
                {/* Sign Out Dropdown */}
                {showSignOut && (
                    <div className="absolute top-12 right-0 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl py-1 w-32 animate-in slide-in-from-top-2 fade-in">
                        <button 
                            onClick={handleSignOut}
                            className="w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-neutral-800 flex items-center gap-2"
                        >
                            <LogOut className="w-3 h-3" /> Sign Out
                        </button>
                    </div>
                )}
            </div>
        ) : (
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleGoogleLogin}
                className="text-neutral-500 hover:text-[#00ff80] hover:bg-neutral-800 rounded-full w-10 h-10"
            >
                <UserIcon className="w-6 h-6" />
            </Button>
        )}
      </div>

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

            {/* --- FOOTER: ABOUT / LEGAL --- */}
            <div className="pt-8 pb-4 flex flex-col items-center gap-3 border-t border-neutral-900 mt-4">
                <p className="text-neutral-700 text-[10px] font-black uppercase tracking-widest">About</p>
                <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                    <span className="text-neutral-800">•</span>
                    <Link href="/termsofservice" className="hover:text-white transition-colors">Terms</Link>
                    <span className="text-neutral-800">•</span>
                    <a href="mailto:support@playsaturdaytosunday.com" className="hover:text-white transition-colors">Support</a>
                </div>
            </div>

        </div>
      </div>
    </div>
  )
}