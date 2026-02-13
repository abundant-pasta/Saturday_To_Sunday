'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trophy, Calendar, User as UserIcon, Loader2, Share2, Star, Dribbble, Users, BookOpen } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import InstallPWA from '@/components/InstallPWA'
import PushNotificationManager from '@/components/PushNotificationManager'
import { createBrowserClient } from '@supabase/ssr'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'
import LiveRankDisplay from '@/components/LiveRankDisplay'

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

  return (
    <div className="min-h-[100dvh] bg-neutral-950 flex flex-col items-center p-4 font-sans relative">

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

        {/* --- DUAL GAME MODE CARDS --- */}
        {/* Grow slightly but prioritize being robust boxes. Using aspect-[4/5] or similar might help, or just let them expand freely but sharing space with the stack below. */}
        <div className="grid grid-cols-2 gap-3 grow min-h-0 items-center">

          {/* FOOTBALL CARD */}
          <Link href="/daily" className="block group h-full max-h-[250px] w-full">
            <div className="bg-gradient-to-br from-neutral-900 to-emerald-950 border border-emerald-500/30 group-hover:border-[#00ff80] p-1 rounded-3xl hover:scale-[1.02] transition-all cursor-pointer shadow-xl h-full flex flex-col">
              <div className="bg-neutral-900/80 rounded-2xl p-3 flex flex-col items-center justify-center gap-2 text-center flex-1 backdrop-blur-sm">
                <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                  <Star className="w-6 h-6 text-[#00ff80] fill-current" />
                </div>
                <div>
                  <div className="text-[#00ff80] font-black uppercase text-[10px] tracking-widest mb-0.5">
                    {footballScore !== null ? 'Completed' : 'Play Daily'}
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
                    {basketballScore !== null ? 'Completed' : 'Play Daily'}
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
                import {Trophy, Calendar, User as UserIcon, Loader2, Share2, Star, Dribbble, Users, BookOpen, History as HistoryIcon} from 'lucide-react'

                // ...

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
            <div className="grid grid-cols-3 gap-2">
              {/* LEADERBOARD */}
              <Link href="/leaderboard" className="w-full">
                <div className="aspect-[4/3] bg-neutral-900/80 border border-neutral-800 hover:border-yellow-500/50 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-neutral-800 transition-all group">
                  <Trophy className="w-6 h-6 text-neutral-600 group-hover:text-yellow-500 transition-colors" />
                  <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest group-hover:text-white">Ranks</span>
                </div>
              </Link>

              {/* SQUADS */}
              <Link href="/squads" className="w-full relative">
                <div className="aspect-[4/3] bg-neutral-900/80 border border-neutral-800 hover:border-emerald-500/50 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-neutral-800 transition-all group">
                  <Users className="w-6 h-6 text-neutral-600 group-hover:text-emerald-500 transition-colors" />
                  <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest group-hover:text-white">Squads</span>
                  {inviteCount > 0 && (
                    <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-600 border border-black" />
                  )}
                </div>
              </Link>

              {/* TROPHY ROOM */}
              <Link href="/collection" className="w-full">
                <div className="aspect-[4/3] bg-neutral-900/80 border border-neutral-800 hover:border-amber-500/50 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-neutral-800 transition-all group">
                  <Trophy className="w-6 h-6 text-neutral-600 group-hover:text-amber-500 transition-colors" />
                  <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest group-hover:text-white">Awards</span>
                </div>
              </Link>
            </div>
          </div>

          {/* SHARE BUTTON */}
          <Button
            onClick={handleShareApp}
            variant="outline"
            className="w-full h-11 text-xs font-bold tracking-widest uppercase border-neutral-800 bg-neutral-900/30 text-neutral-500 hover:bg-neutral-800 hover:text-white transition-all hover:border-neutral-700 rounded-xl"
          >
            <Share2 className="mr-3 w-4 h-4" /> Share App
          </Button>

          {/* INSTALL PWA BUTTON */}
          <div className="w-full">
            <InstallPWA mode="button" />
          </div>

          {/* NOTIFICATION BUTTON */}
          <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors empty:hidden max-h-[44px]">
            <PushNotificationManager hideOnSubscribed={true} compact={true} />
          </div>

          {/* GUIDES / HOW TO PLAY BUTTON */}
          <Link href="/guides" className="w-full mt-2">
            <Button
              variant="outline"
              className="w-full h-11 text-xs font-black tracking-widest uppercase border-[#00ff80]/20 bg-[#00ff80]/5 text-[#00ff80] hover:bg-[#00ff80]/10 hover:text-[#00ff80] transition-all hover:border-[#00ff80]/40 rounded-xl"
            >
              <BookOpen className="mr-3 w-4 h-4 text-[#00ff80]" /> How to Play & Guides
            </Button>
          </Link>

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