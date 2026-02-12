'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trophy, Calendar, User as UserIcon, Loader2, Share2, Star, Dribbble } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import InstallPWA from '@/components/InstallPWA'
import PushNotificationManager from '@/components/PushNotificationManager'
import { createBrowserClient } from '@supabase/ssr'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'

// Wrapper for Suspense (Best Practice)
export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center"><Loader2 className="animate-spin text-neutral-600" /></div>}>
      <HomeContent />
    </Suspense>
  )
}

function HomeContent() {
  const router = useRouter()

  // Auth State
  const [user, setUser] = useState<any>(null)

  // Streak State
  const [footballStreak, setFootballStreak] = useState<number>(0)
  const [basketballStreak, setBasketballStreak] = useState<number>(0)

  // Game Status State
  const [footballScore, setFootballScore] = useState<number | null>(null)
  const [basketballScore, setBasketballScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

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

  // 2. Fetch User Data (Streaks + Daily Status)
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setFootballStreak(0)
        setBasketballStreak(0)
        setFootballScore(null)
        setBasketballScore(null)
        setLoading(false)
        return
      }

      const today = new Date(Date.now() - TIMEZONE_OFFSET_MS).toISOString().split('T')[0]

      // Parallel fetch: Profile (Streaks) + Daily Results (Status)
      const [profileReq, resultsReq] = await Promise.all([
        supabase.from('profiles').select('streak_football, streak_basketball').eq('id', user.id).single(),
        supabase.from('daily_results').select('sport, score').eq('user_id', user.id).eq('game_date', today)
      ])

      // Handle Streaks
      if (profileReq.data) {
        setFootballStreak(profileReq.data.streak_football || 0)
        setBasketballStreak(profileReq.data.streak_basketball || 0)
      }

      // Handle Daily Results
      if (resultsReq.data) {
        const fbResult = resultsReq.data.find(r => r.sport === 'football')
        const bbResult = resultsReq.data.find(r => r.sport === 'basketball')

        if (fbResult) setFootballScore(fbResult.score)
        if (bbResult) setBasketballScore(bbResult.score)
      }

      setLoading(false)
    }

    fetchUserData()
  }, [user])

  // 3. Auth Handlers
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  // 4. Share Handler 
  const handleShareApp = async () => {
    const text = `🏈 Saturday to Sunday\n\nGuess the college for 10 NFL/NBA players.\n\nPlay today's grid: 👇\nhttps://www.playsaturdaytosunday.com`

    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        alert('Link copied to clipboard!')
      }
    } catch (err) {
      console.error("Error sharing:", err)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center p-4 font-sans overflow-hidden relative">

      {/* --- TOP RIGHT PROFILE ICON --- */}
      <div className="absolute top-4 right-4 z-50">
        {user ? (
          // LOGGED IN: Go to Profile
          <Link href="/profile">
            <button
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-neutral-800 hover:border-[#00ff80] transition-colors relative block shadow-lg"
            >
              {user.user_metadata?.avatar_url ? (
                <Image src={user.user_metadata.avatar_url} alt="User" fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-neutral-400" />
                </div>
              )}
            </button>
          </Link>
        ) : (
          // LOGGED OUT: Google Login
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGoogleLogin}
            className="text-neutral-500 hover:text-[#00ff80] hover:bg-neutral-800 rounded-full w-10 h-10 transition-all"
          >
            <UserIcon className="w-6 h-6" />
          </Button>
        )}
      </div>

      <div className="w-full max-w-md flex flex-col gap-6">

        {/* LOGO AREA */}
        <div className="text-center space-y-4 py-4">
          <div className="flex justify-center">
            <Trophy className="w-16 h-16 text-yellow-400 animate-in zoom-in duration-700" />
          </div>
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-tight drop-shadow-2xl">
              Saturday To Sunday
            </h1>
            <p className="text-neutral-400 font-bold text-sm tracking-wide mt-2 uppercase">Guess the college. Beat your friends.</p>
          </div>
        </div>

        {/* --- DUAL GAME MODE CARDS --- */}
        <div className="grid grid-cols-2 gap-4">

          {/* FOOTBALL CARD */}
          <Link href="/daily" className="block group h-full">
            <div className="bg-gradient-to-br from-neutral-900 to-emerald-950 border border-emerald-500/30 group-hover:border-[#00ff80] p-1 rounded-xl hover:scale-[1.02] transition-all cursor-pointer shadow-xl h-full flex flex-col">
              <div className="bg-neutral-900/80 rounded-lg p-4 flex flex-col items-center justify-center gap-3 text-center flex-1 backdrop-blur-sm min-h-[140px]">
                <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                  <Star className="w-8 h-8 text-[#00ff80] fill-current" />
                </div>
                <div>
                  <div className="text-[#00ff80] font-black uppercase text-[10px] tracking-widest mb-1">
                    {footballScore !== null ? 'Completed' : 'Play Daily'}
                  </div>
                  <div className="text-white font-black text-xl uppercase italic tracking-tighter leading-none">
                    {footballScore !== null ? `Score: ${footballScore}` : 'Football'}
                  </div>
                </div>
                {user && footballStreak > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                    <span className="text-orange-500 text-sm">🔥</span>
                    <span className="text-orange-400 text-xs font-black">{footballStreak} Day{footballStreak !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* BASKETBALL CARD */}
          <Link href="/daily/basketball" className="block group h-full">
            <div className="bg-gradient-to-br from-neutral-900 to-amber-950 border border-amber-500/30 group-hover:border-amber-400 p-1 rounded-xl hover:scale-[1.02] transition-all cursor-pointer shadow-xl h-full flex flex-col">
              <div className="bg-neutral-900/80 rounded-lg p-4 flex flex-col items-center justify-center gap-3 text-center flex-1 backdrop-blur-sm min-h-[140px]">
                <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                  <Dribbble className="w-8 h-8 text-amber-500" />
                </div>
                <div>
                  <div className="text-amber-500 font-black uppercase text-[10px] tracking-widest mb-1">
                    {basketballScore !== null ? 'Completed' : 'Play Daily'}
                  </div>
                  <div className="text-white font-black text-xl uppercase italic tracking-tighter leading-none">
                    {basketballScore !== null ? `Score: ${basketballScore}` : 'Basketball'}
                  </div>
                </div>
                {user && basketballStreak > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                    <span className="text-orange-500 text-sm">🔥</span>
                    <span className="text-orange-400 text-xs font-black">{basketballStreak} Day{basketballStreak !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>

        </div>

        {/* --- SECONDARY ACTIONS --- */}
        <div className="flex flex-col gap-4">
          {/* LEADERBOARD BUTTON */}
          <Link href="/leaderboard" className="w-full">
            <Button
              variant="outline"
              className="w-full h-14 text-lg font-black tracking-widest uppercase border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all hover:border-neutral-600"
            >
              <Trophy className="mr-3 w-5 h-5 text-yellow-500" /> View Leaderboard
            </Button>
          </Link>

          {/* NOTIFICATION BUTTON */}
          <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors empty:hidden">
            <PushNotificationManager hideOnSubscribed={true} />
          </div>

          {/* INSTALL PWA BUTTON */}
          <InstallPWA />

          {/* SHARE BUTTON */}
          <Button
            onClick={handleShareApp}
            variant="outline"
            className="w-full h-12 text-sm font-bold tracking-widest uppercase border-neutral-800 bg-neutral-900/30 text-neutral-500 hover:bg-neutral-800 hover:text-white transition-all hover:border-neutral-700"
          >
            <Share2 className="mr-2 w-4 h-4" /> Share App
          </Button>

          {/* --- FOOTER: ABOUT / LEGAL --- */}
          <div className="pt-8 pb-4 flex flex-col items-center gap-3 border-t border-neutral-900 mt-4">
            <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <span className="text-neutral-800">•</span>
              <Link href="/termsofservice" className="hover:text-white transition-colors">Terms</Link>
              <span className="text-neutral-800">•</span>
              <a href="mailto:support@playsaturdaytosunday.com" className="hover:text-white transition-colors">Support</a>
            </div>
            <p className="text-neutral-800 text-[10px] font-black uppercase tracking-widest">v1.1.0</p>
          </div>

        </div>
      </div>
    </div>
  )
}