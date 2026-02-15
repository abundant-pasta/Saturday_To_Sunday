'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trophy, Calendar, User as UserIcon, Loader2, Share2, Star, Dribbble, Users, BookOpen, History as HistoryIcon, Skull } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import InstallPWA from '@/components/InstallPWA'
import PushNotificationManager from '@/components/PushNotificationManager'
import { createBrowserClient } from '@supabase/ssr'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'
import LiveRankDisplay from '@/components/LiveRankDisplay'
import { checkYesterdayPodium, type PodiumResult } from '@/app/actions/podium'
import PodiumCelebration from '@/components/PodiumCelebration'

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

  const [inviteCount, setInviteCount] = useState(0)
  const [survivalCount, setSurvivalCount] = useState<number | null>(null)

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

  // 1.5 Fetch Global Data (Survival Count)
  useEffect(() => {
    const fetchGlobalData = async () => {
      const { data: activeTournament } = await supabase
        .from('survival_tournaments')
        .select('id')
        .eq('is_active', true)
        .single()

      if (activeTournament) {
        const { count } = await supabase
          .from('survival_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', activeTournament.id)
        setSurvivalCount(count)
      }
    }
    fetchGlobalData()
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

      // Fetch Pending Invites Count
      const { count } = await supabase
        .from('squad_invites')
        .select('*', { count: 'exact', head: true })
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
      setInviteCount(count || 0)
    }

    fetchUserData()

    // 2.5 TRACK PWA USAGE
    const trackPWA = async () => {
      if (!user) return

      // Check if standalone
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone

      if (isStandalone) {
        console.log("PWA launched standalone")
      }
    }
    trackPWA()

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

  // 5. Podium Celebration Logic
  const [celebrationData, setCelebrationData] = useState<PodiumResult | null>(null)

  useEffect(() => {
    const checkPodium = async () => {
      if (!user) return

      // Check if already celebrated today (for yesterday's results)
      const now = new Date()
      // Approximate yesterday string for the key. 
      // Actually, we store the date of the RESULT we celebrated.
      // So if "2023-10-27" results were celebrated, we store "2023-10-27".

      const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000) - TIMEZONE_OFFSET_MS)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const lastCelebrated = localStorage.getItem('s2s_last_podium_date')

      if (lastCelebrated === yesterdayStr) {
        return // Already celebrated this date
      }

      // Check both sports
      const [fbResult, bbResult] = await Promise.all([
        checkYesterdayPodium('football'),
        checkYesterdayPodium('basketball')
      ])

      // Prioritize Champion > RunnerUp > Third
      // If both same rank, prioritize Football (default)
      let bestResult = null
      if (fbResult && bbResult) {
        bestResult = fbResult.rank <= bbResult.rank ? fbResult : bbResult
      } else if (fbResult) {
        bestResult = fbResult
      } else if (bbResult) {
        bestResult = bbResult
      }

      if (bestResult) {
        setCelebrationData(bestResult)
      }
    }

    checkPodium()
  }, [user])

  const closeCelebration = () => {
    setCelebrationData(null)
    const now = new Date()
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000) - TIMEZONE_OFFSET_MS)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    localStorage.setItem('s2s_last_podium_date', yesterdayStr)
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-950 flex flex-col items-center p-4 font-sans relative">

      {/* Celebration Overlay */}
      {celebrationData && (
        <PodiumCelebration
          rank={celebrationData.rank}
          score={celebrationData.score}
          sport={celebrationData.sport}
          onClose={closeCelebration}
        />
      )}

      <div className="w-full max-w-md flex flex-col gap-4 h-full pb-safe box-border pt-12">

        {/* LOGO AREA */}
        <div className="text-center space-y-1 pt-2 pb-1 shrink-0">
          <div className="flex justify-center">
            <Trophy className="w-12 h-12 text-yellow-400 animate-in zoom-in duration-700" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-tight drop-shadow-xl">
              Saturday To Sunday
            </h1>
            <p className="text-neutral-500 font-bold text-xs tracking-wide mt-1 uppercase">Guess the college. Beat your friends.</p>
          </div>

          {!user && (
            <div className="pt-2">
              <Button
                onClick={handleGoogleLogin}
                className="w-full h-12 bg-white text-black font-black uppercase tracking-tight rounded-xl hover:bg-neutral-200 transition-all shadow-lg active:scale-95"
              >
                Sign In with Google to Save Progress
              </Button>
            </div>
          )}
        </div>

        {/* --- SURVIVAL MODE BANNER --- */}
        <Link href="/survival" className="w-full shrink-0">
          <div className="w-full bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden group hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(220,38,38,0.15)] mb-3">
            <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors animate-pulse" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30 group-hover:rotate-12 transition-transform">
                <Skull className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-white leading-none">
                    Survival Mode
                  </h3>
                  <span className="bg-red-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse">
                    Sign Up Now
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                  10 Days. <span className="text-white">{survivalCount !== null ? `${survivalCount} Survivors.` : 'One Survivor.'}</span> <span className="text-red-400">Join Now.</span>
                </p>
              </div>
            </div>

            <div className="relative z-10">
              <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-black group-hover:bg-red-500 group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </div>
          </div>
        </Link>


        {/* --- DUAL GAME MODE CARDS --- */}
        {/* Grow slightly but prioritize being robust boxes. Using aspect-[4/5] or similar might help, or just let them expand freely but sharing space with the stack below. */}
        <div className="grid grid-cols-2 gap-3 grow min-h-0 items-center">

          {/* FOOTBALL CARD */}
          <Link href="/daily" className="block group h-full max-h-[250px] w-full">
            <div className="bg-gradient-to-br from-neutral-900 to-emerald-950 border border-emerald-500/30 group-hover:border-[#00ff80] p-1 rounded-3xl hover:scale-[1.02] transition-all cursor-pointer shadow-xl h-full flex flex-col">
              <div className="bg-neutral-900/80 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 text-center flex-1 backdrop-blur-sm">
                <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-6 h-6 text-[#00ff80]"
                    style={{ transform: 'rotate(-45deg)' }}
                  >
                    {/* Football Shape (Prolate Spheroid) */}
                    <path d="M12 3c-5 0-9 4-9 9 0 5 4 9 9 9 5 0 9-4 9-9 0-5-4-9-9-9z" style={{ display: 'none' }} />
                    {/* Better Lemon Shape */}
                    <path d="M5 12c0-8 8-10 15-8-1 1-1 1-1 1s2 7-6 15c-7 2-8-8-8-8z" style={{ display: 'none' }} />
                    <path d="M12 2C6 2 2 6 2 12s4 10 10 10 10-4 10-10S18 2 12 2z" style={{ display: 'none' }} />

                    {/* Vertical Football Shape (to be rotated) */}
                    <path d="M12 2c6 0 8 5 8 10s-2 10-8 10-8-5-8-10 2-10 8-10z" />
                    {/* Laces */}
                    <path d="M12 7v10" />
                    <path d="M9 10h6" />
                    <path d="M9 14h6" />
                  </svg>
                </div>
                <div>
                  <div className="text-[#00ff80] font-black uppercase text-[10px] tracking-widest mb-0.5">
                    {footballScore !== null ? 'Football' : 'Play Daily'}
                  </div>
                  <div className="text-white font-black text-lg uppercase italic tracking-tighter leading-none whitespace-nowrap min-w-0">
                    {footballScore !== null ? `Score: ${footballScore}` : 'Football'}
                  </div>
                  {footballScore !== null && (
                    <div className="mt-1 flex justify-center">
                      <LiveRankDisplay score={footballScore} sport="football" align="center" />
                    </div>
                  )}
                </div>
                {user && footballStreak > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                    <span className="text-orange-500 text-xs">🔥</span>
                    <span className="text-orange-400 text-[10px] font-black">{footballStreak} Day{footballStreak !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* BASKETBALL CARD */}
          <Link href="/daily/basketball" className="block group h-full max-h-[250px] w-full">
            <div className="bg-gradient-to-br from-neutral-900 to-amber-950 border border-amber-500/30 group-hover:border-amber-400 p-1 rounded-3xl hover:scale-[1.02] transition-all cursor-pointer shadow-xl h-full flex flex-col">
              <div className="bg-neutral-900/80 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 text-center flex-1 backdrop-blur-sm">
                <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                  <Dribbble className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <div className="text-amber-500 font-black uppercase text-[10px] tracking-widest mb-0.5">
                    {basketballScore !== null ? 'Basketball' : 'Play Daily'}
                  </div>
                  <div className="text-white font-black text-lg uppercase italic tracking-tighter leading-none whitespace-nowrap min-w-0">
                    {basketballScore !== null ? `Score: ${basketballScore}` : 'Basketball'}
                  </div>
                  {basketballScore !== null && (
                    <div className="mt-1 flex justify-center">
                      <LiveRankDisplay score={basketballScore} sport="basketball" align="center" />
                    </div>
                  )}
                </div>
                {user && basketballStreak > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full">
                    <span className="text-orange-500 text-xs">🔥</span>
                    <span className="text-orange-400 text-[10px] font-black">{basketballStreak} Day{basketballStreak !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>

        </div>

        {/* --- SECONDARY ACTIONS - Vertical Stack --- */}
        <div className="flex flex-col gap-2 shrink-0 pb-2 custom-xs-stack">

          {/* --- RECAP & UTILITY GRID --- */}
          <div className="space-y-2 w-full">
            {/* DAILY RECAP BANNER */}
            <Link href="/recap" className="w-full">
              <div className="w-full h-14 bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/50 rounded-xl flex items-center justify-between px-4 hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] group relative overflow-hidden">
                <div className="absolute inset-0 bg-amber-500/10 animate-pulse" />

                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
                    <HistoryIcon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-amber-100 uppercase tracking-wide leading-none">Daily Recap</span>
                    <span className="text-[9px] text-amber-400 font-bold uppercase tracking-widest">Yesterday's Legends</span>
                  </div>
                </div>
                <div className="bg-amber-500 text-black text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider shadow-lg">
                  View
                </div>
              </div>
            </Link>

            {/* UTILITY ROW (3 Col) */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {/* LEADERBOARD - Gold/Yellow */}
              <Link href="/leaderboard" className="w-full">
                <div className="aspect-[4/3] bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 hover:border-yellow-400 group rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-yellow-500/30 transition-all relative overflow-hidden shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                  <div className="absolute inset-0 bg-yellow-400/5 group-hover:bg-yellow-400/10 transition-colors" />
                  <Trophy className="w-7 h-7 text-yellow-500 group-hover:scale-110 transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                  <span className="text-[10px] font-black text-yellow-200 uppercase tracking-widest relative z-10 drop-shadow-md group-hover:text-white">Ranks</span>
                </div>
              </Link>

              {/* SQUADS - Blue/Cyan */}
              <Link href="/squads" className="w-full relative">
                <div className="aspect-[4/3] bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 hover:border-cyan-400 group rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-cyan-500/30 transition-all relative overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <div className="absolute inset-0 bg-cyan-400/5 group-hover:bg-cyan-400/10 transition-colors" />
                  <Users className="w-7 h-7 text-cyan-400 group-hover:scale-110 transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                  <span className="text-[10px] font-black text-cyan-200 uppercase tracking-widest relative z-10 drop-shadow-md group-hover:text-white">Squads</span>
                  {inviteCount > 0 && (
                    <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-600 border border-black shadow-lg animate-pulse" />
                  )}
                </div>
              </Link>

              {/* TROPHY ROOM - Purple/Pink */}
              <Link href="/collection" className="w-full">
                <div className="aspect-[4/3] bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 hover:border-purple-400 group rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-purple-500/30 transition-all relative overflow-hidden shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                  <div className="absolute inset-0 bg-purple-400/5 group-hover:bg-purple-400/10 transition-colors" />
                  <Trophy className="w-7 h-7 text-purple-400 group-hover:scale-110 transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                  <span className="text-[10px] font-black text-purple-200 uppercase tracking-widest relative z-10 drop-shadow-md group-hover:text-white">Awards</span>
                </div>
              </Link>
            </div>
          </div>

          {/* --- FOOTER ACTIONS --- */}
          <div className="flex flex-col gap-3 mt-2 w-full">

            {/* 1. HOW TO PLAY & GUIDES */}
            <Link href="/how-to-play" className="w-full">
              <Button
                variant="outline"
                className="w-full h-12 text-xs font-black tracking-widest uppercase border-[#00ff80]/30 bg-[#00ff80]/5 text-[#00ff80] hover:bg-[#00ff80]/10 hover:text-[#00ff80] hover:border-[#00ff80] transition-all rounded-xl shadow-[0_0_10px_rgba(0,255,128,0.1)]"
              >
                <BookOpen className="mr-2 w-4 h-4" /> How to Play & Guides
              </Button>
            </Link>

            {/* 2. INSTALL APP */}
            <InstallPWA mode="button" />

            {/* 3. SHARE APP */}
            <Button
              onClick={handleShareApp}
              variant="ghost"
              className="w-full h-12 text-[10px] font-bold tracking-widest uppercase text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all rounded-lg"
            >
              <Share2 className="mr-2 w-3 h-3" /> Share App
            </Button>
          </div>

          {/* --- ABOUT SECTION (SEO) --- */}
          <div className="mt-6 p-4 bg-neutral-900/40 border border-neutral-800/50 rounded-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Professional Grade Trivia</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-medium">
              Saturday to Sunday is the ultimate daily trivia challenge for college football and basketball fans. We bridge the gap between campus icons and professional superstars. Test your knowledge, climb the ranks, and protect your streak in the world's most intense sports origin game.
              <Link href="/guides/the-ultimate-guide" className="text-[#00ff80] ml-1 font-bold hover:underline">Learn more.</Link>
            </p>
          </div>

          {/* --- FOOTER: ABOUT / LEGAL --- */}
          <div className="pt-4 flex flex-col items-center gap-1 mt-2">
            <div className="flex flex-wrap justify-center gap-3 text-[9px] font-bold text-neutral-700 uppercase tracking-widest">
              <Link href="/guides" className="hover:text-white transition-colors">Guides</Link>
              <span className="text-neutral-800">•</span>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <span className="text-neutral-800">•</span>
              <Link href="/termsofservice" className="hover:text-white transition-colors">Terms</Link>
              <span className="text-neutral-800">•</span>
              <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            </div>
            <p className="text-neutral-800 text-[8px] font-black uppercase tracking-widest">v1.1.0</p>
          </div>

        </div>

        {/* --- STICKY INSTALL BANNER REMOVED (Redundant with button) --- */}
      </div>
    </div>
  )
}