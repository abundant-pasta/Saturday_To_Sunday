'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getDailyGame } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Home, Share2, Loader2, Trophy, AlertCircle, Star, Shield, Medal, Skull, Dribbble } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import IntroScreen from '@/components/IntroScreen'
import { createBrowserClient } from '@supabase/ssr'
import Leaderboard from '@/components/Leaderboard'
import LiveRankDisplay from '@/components/LiveRankDisplay'
import { TIMEZONE_OFFSET_MS, TIER_MULTIPLIERS, GAME_CONFIG, type Sport } from '@/lib/constants'
import { RewardedAdProvider } from '@/components/RewardedAdProvider'
import InstallPWA from '@/components/InstallPWA'

const THEMES = {
  football: {
    primary: 'text-[#00ff80]',
    bgPrimary: 'bg-[#00ff80]',
    borderPrimary: 'border-[#00ff80]',
    cardBg: 'bg-neutral-900',
    ring: 'ring-[#00ff80]',
    icon: Star,
    label: 'Football'
  },
  basketball: {
    primary: 'text-amber-400',
    bgPrimary: 'bg-amber-600',
    borderPrimary: 'border-amber-600',
    cardBg: 'bg-gradient-to-br from-amber-950 to-black',
    ring: 'ring-amber-500',
    icon: Dribbble,
    label: 'Basketball'
  }
}

const getGameDate = () => {
  return new Date(Date.now() - TIMEZONE_OFFSET_MS).toISOString().split('T')[0]
}

const getMultiplier = (tier: number, sport: Sport) => {
  const multipliers = TIER_MULTIPLIERS[sport]
  return multipliers[tier as keyof typeof multipliers] || 1.0
}

const cleanText = (text: string) => text ? text.replace(/&amp;/g, '&') : ''

const getGuestId = () => {
  if (typeof window === 'undefined') return null
  let id = localStorage.getItem('s2s_guest_id')
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    localStorage.setItem('s2s_guest_id', id)
  }
  return id
}

const getRankTitle = (score: number, sport: 'football' | 'basketball') => {
  if (sport === 'football') {
    if (score >= 1100) return { title: "Heisman Hopeful", icon: Trophy }
    if (score >= 700) return { title: "All-American", icon: Medal }
    if (score >= 300) return { title: "Varsity Starter", icon: Star }
    if (score > 0) return { title: "Practice Squad", icon: Shield }
    return { title: "Redshirt", icon: Skull }
  } else {
    if (score >= 1100) return { title: "MVP Contender", icon: Trophy }
    if (score >= 700) return { title: "All-Star", icon: Medal }
    if (score >= 300) return { title: "Starting 5", icon: Star }
    if (score > 0) return { title: "6th Man", icon: Shield }
    return { title: "G-League", icon: Skull }
  }
}

export default function DailyGameWrapper({ sport = 'football' }: { sport?: 'football' | 'basketball' }) {
  return (
    <RewardedAdProvider>
      <Suspense fallback={<div className="bg-neutral-950 min-h-screen flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>}>
        <DailyGame sport={sport} />
      </Suspense>
    </RewardedAdProvider>
  )
}

function DailyGame({ sport }: { sport: 'football' | 'basketball' }) {
  const searchParams = useSearchParams()
  const challengerScore = searchParams.get('s')
  const theme = THEMES[sport]
  const config = GAME_CONFIG[sport]

  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [gameState, setGameState] = useState<'loading' | 'intro' | 'playing' | 'finished'>('loading')
  // Enhanced results: can be old format (string[]) or new format (object[])
  type ResultEntry = { player_id: number; result: 'correct' | 'wrong' | 'pending'; player_name: string } | 'correct' | 'wrong' | 'pending'
  const [results, setResults] = useState<ResultEntry[]>([])
  const [potentialPoints, setPotentialPoints] = useState(100)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isImageReady, setIsImageReady] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [receivedBonus, setReceivedBonus] = useState<number | null>(null)
  const [bonusReason, setBonusReason] = useState<string | null>(null)
  const [lastEarnedPoints, setLastEarnedPoints] = useState<number>(0)
  const [freezeConsumed, setFreezeConsumed] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const loadGame = async () => {
      try {
        const data = await getDailyGame(sport)
        if (data && data.length > 0) {
          const gameData = data.slice(0, config.rounds)
          setQuestions(gameData)
          const savedScore = localStorage.getItem(`s2s_${sport}_today_score`)
          const savedDate = localStorage.getItem(`s2s_${sport}_last_played_date`)
          const savedResults = localStorage.getItem(`s2s_${sport}_daily_results`)
          const today = getGameDate()

          if (savedScore && savedDate === today) {
            setScore(parseInt(savedScore))
            try {
              setResults(savedResults ? JSON.parse(savedResults) : new Array(gameData.length).fill('pending'))
            } catch (e) {
              setResults(new Array(gameData.length).fill('pending'))
            }
            setGameState('finished')
            setIsSaved(true)
          } else {
            setResults(new Array(gameData.length).fill('pending'))
            setGameState('intro')
            setGameState('intro')
          }
        }
      } catch (err) { console.error(err) }
    }
    loadGame()
  }, [sport, config.rounds])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) setUser(session.user)
    }
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Auto-consume freeze if user missed a day
  useEffect(() => {
    const checkAndConsumeFreeze = async () => {
      if (!user || freezeConsumed || gameState !== 'loading') return

      try {
        const lastPlayedColumn = sport === 'football' ? 'last_played_football_at' : 'last_played_basketball_at'
        const freezesAvailableColumn = sport === 'football' ? 'football_freezes_available' : 'basketball_freezes_available'
        const streakColumn = sport === 'football' ? 'streak_football' : 'streak_basketball'

        // Check last played time and freeze status
        const { data: profile } = await supabase
          .from('profiles')
          .select(`${lastPlayedColumn}, ${freezesAvailableColumn}, ${streakColumn}`)
          .eq('id', user.id)
          .single()

        if (profile) {
          const lastPlayed = (profile as any)[lastPlayedColumn]
          const freezesAvailable = (profile as any)[freezesAvailableColumn] || 0
          const currentStreak = (profile as any)[streakColumn] || 0

          if (lastPlayed && currentStreak > 0) {
            const now = new Date()
            const lastPlayedDate = new Date(lastPlayed)
            const hoursInactive = (now.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60)

            // If inactive > 24h and has freeze, auto-consume it
            if (hoursInactive > 24 && freezesAvailable > 0) {
              const response = await fetch('/api/consume-streak-freeze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, sport })
              })

              if (response.ok) {
                // Show success notification
                console.log(`Streak freeze consumed! ${currentStreak}-day streak preserved.`)
                setFreezeConsumed(true)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking/consuming freeze:', error)
      }
    }

    checkAndConsumeFreeze()
  }, [user, gameState, sport, freezeConsumed, supabase])

  // Check for existing DB result (Cross-device sync)
  useEffect(() => {
    const checkDbResult = async () => {
      if (!user || gameState === 'finished') return

      const today = getGameDate()
      const { data } = await supabase
        .from('daily_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_date', today)
        .eq('sport', sport)
        .single()

      if (data) {
        // Sync to local state
        setScore(data.score)
        setResults(data.results_json || [])
        setGameState('finished')
        setIsSaved(true)

        // Sync to localStorage
        localStorage.setItem(`s2s_${sport}_today_score`, data.score.toString())
        localStorage.setItem(`s2s_${sport}_last_played_date`, today)
        if (data.results_json) {
          localStorage.setItem(`s2s_${sport}_daily_results`, JSON.stringify(data.results_json))
        }
      }
    }

    checkDbResult()
  }, [user, sport, gameState])

  useEffect(() => {
    const getStreak = async () => {
      if (!user) return
      const column = sport === 'basketball' ? 'streak_basketball' : 'streak_football'
      const { data } = await supabase.from('profiles').select(column).eq('id', user.id).single()
      if (data) setStreak((data as any)[column] || 0)
    }
    if (user) getStreak()
    if (isSaved) getStreak()
  }, [user, sport, isSaved])

  useEffect(() => {
    const saveScore = async () => {
      if (gameState !== 'finished' || isSaved || score <= 0) return
      const todayISO = getGameDate()
      let upsertPayload: any = { score, game_date: todayISO, results_json: results, sport }
      let conflictTarget = user ? 'user_id,game_date,sport' : 'guest_id,game_date,sport'
      if (user) upsertPayload.user_id = user.id
      else upsertPayload.guest_id = getGuestId()
      const { error } = await supabase.from('daily_results').upsert(upsertPayload, { onConflict: conflictTarget })
      if (!error) {
        setIsSaved(true)
        // Update last_played_at timestamp
        if (user) {
          const column = sport === 'football' ? 'last_played_football_at' : 'last_played_basketball_at'
          await supabase.from('profiles').update({ [column]: new Date().toISOString() }).eq('id', user.id)
        }
      }
    }
    saveScore()
  }, [gameState, user, score, isSaved, results, sport])

  // --- RESTORED TIMER LOGIC ---
  useEffect(() => {
    if (gameState !== 'playing' || showResult || !isImageReady) return
    const currentQ = questions[currentIndex]
    const multiplier = getMultiplier(currentQ?.tier || 1, sport)

    // Lose 5 final points per half second (scaled by tier multiplier)
    const decayAmount = 5 / multiplier
    let decayInterval: any

    const startTimer = setTimeout(() => {
      decayInterval = setInterval(() => {
        setPotentialPoints((prev) => (prev <= 10 ? 10 : prev - decayAmount))
      }, 500) // Half-second interval
    }, 1000) // 1 second initial pause

    return () => { clearTimeout(startTimer); if (decayInterval) clearInterval(decayInterval) }
  }, [gameState, showResult, isImageReady, currentIndex, questions, sport])

  const handleGuess = (option: string) => {
    if (showResult) return
    setSelectedOption(option)
    const currentQ = questions[currentIndex]
    const isCorrect = option === currentQ.correct_answer

    // Calculate new streak (locally, before state update)
    // We only care about consecutive 'correct' up to this point + this one
    let currentStreakCount = 0
    // Check backwards from current index - 1
    for (let i = currentIndex - 1; i >= 0; i--) {
      const res = results[i]
      const isCorrectResult = typeof res === 'string' ? res === 'correct' : res.result === 'correct'
      if (isCorrectResult) currentStreakCount++
      else break
    }
    if (isCorrect) currentStreakCount++
    else currentStreakCount = 0

    let newScore = score
    let pointsEarned = 0
    let bonus = 0

    if (isCorrect) {
      const basePoints = Math.round(potentialPoints * getMultiplier(currentQ.tier || 1, sport) * config.pointScale)

      // BONUS LOGIC
      if (sport === 'football') {
        if (currentStreakCount === 6) { bonus = 50; setBonusReason("6 IN A ROW!") }
        if (currentStreakCount === 10) { bonus = 100; setBonusReason("PERFECT 10!") }
      } else {
        // Basketball (5 rounds)
        if (currentStreakCount === 5) { bonus = 150; setBonusReason("PERFECT 5!") }
      }

      pointsEarned = basePoints + bonus
      newScore += pointsEarned

      setScore(newScore)
      setReceivedBonus(bonus > 0 ? bonus : null)
      setLastEarnedPoints(pointsEarned)
    } else {
      setReceivedBonus(null)
      setBonusReason(null)
      setLastEarnedPoints(0)
    }

    const newResults = [...results]
    newResults[currentIndex] = {
      player_id: currentQ.id,
      result: isCorrect ? 'correct' : 'wrong',
      player_name: currentQ.name
    }
    setResults(newResults)
    setShowResult(true)

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setSelectedOption(null)
        setShowResult(false)
        setPotentialPoints(100)
        setIsImageReady(false)
        setReceivedBonus(null)
        setBonusReason(null)
        setLastEarnedPoints(0)
      } else {
        localStorage.setItem(`s2s_${sport}_today_score`, newScore.toString())
        localStorage.setItem(`s2s_${sport}_last_played_date`, getGameDate())
        localStorage.setItem(`s2s_${sport}_daily_results`, JSON.stringify(newResults))
        setGameState('finished')
      }
    }, 1500)
  }

  const handleShare = async () => {
    const squares = results.map(r => {
      const status = typeof r === 'string' ? r : r.result
      return status === 'correct' ? '🟩' : '🟥'
    }).join('')
    const dateObj = new Date(Date.now() - TIMEZONE_OFFSET_MS)
    const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const rankInfo = getRankTitle(score, sport)
    const text = `Saturday to Sunday (${shortDate})\n${sport === 'basketball' ? '🏀' : '🏈'} ${theme.label} Mode\nScore: ${score.toLocaleString()} (${rankInfo.title})\n\n${squares}\n\nCan you beat my score? Play now:\nhttps://www.playsaturdaytosunday.com`
    try {
      if (navigator.share) await navigator.share({ text })
      else { await navigator.clipboard.writeText(text); alert('Copied!') }
    } catch (err) { await navigator.clipboard.writeText(text) }
  }

  if (gameState === 'loading') return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading...</div>

  if (gameState === 'intro') return (
    <div className="h-[100dvh] bg-neutral-950 overflow-y-auto overflow-x-hidden relative">
      <IntroScreen onStart={() => setGameState('playing')} challengerScore={challengerScore} sport={sport} />
    </div>
  )

  if (gameState === 'finished') {
    const rankInfo = getRankTitle(score, sport)
    return (
      <div className="min-h-[100dvh] bg-neutral-950 text-white flex flex-col items-center justify-start p-4 space-y-4 animate-in fade-in duration-500 relative overflow-y-auto">
        <Link href="/" className="absolute top-4 left-4 z-20">
          <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-white rounded-full"><Home className="w-6 h-6" /></Button>
        </Link>

        <div className="text-center space-y-2 mb-2 mt-8">
          <Trophy className={`w-16 h-16 ${theme.primary} mx-auto animate-bounce mb-2`} />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Daily Complete</h1>
        </div>

        <Card className={`w-full max-w-md ${theme.cardBg} border-neutral-800 shadow-2xl relative overflow-hidden shrink-0`}>
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-6 relative">

            {/* RANK BADGE (Top Left) */}
            <div className="absolute top-6 left-6">
              <LiveRankDisplay key={`${sport}-${score}`} score={score} sport={sport} />
            </div>

            {/* CENTERED SCORE AND TITLE */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="flex flex-col items-center">
                <span className="text-neutral-500 text-[10px] uppercase tracking-[0.15em] font-black mb-1">Final Score</span>
                <div className={`text-6xl font-black ${theme.primary} font-mono tracking-tighter leading-none`}>
                  {score}<span className="text-2xl text-neutral-600">/{config.maxScore}</span>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-black/40 ${theme.primary} ${theme.borderPrimary} border-opacity-30 shadow-lg mt-2`}>
                <rankInfo.icon className="w-4 h-4 fill-current" />
                <span className="text-xs font-black uppercase tracking-widest">{rankInfo.title}</span>
              </div>
            </div>

            <div className="flex justify-center gap-1 mt-4">
              {results.map((r, i) => {
                const isCorrect = typeof r === 'string' ? r === 'correct' : r.result === 'correct'
                const isWrong = typeof r === 'string' ? r === 'wrong' : r.result === 'wrong'
                return (
                  <div key={i} className={`w-6 h-6 rounded-sm ${isCorrect ? 'bg-[#00ff80]' : isWrong ? 'bg-red-500' : 'bg-neutral-800'}`} />
                )
              })}
            </div>

            <div className="flex flex-col gap-3 mt-6 w-full">
              <Button onClick={handleShare} className={`w-full h-12 text-lg font-bold ${theme.bgPrimary} text-black hover:opacity-90 shadow-lg`}>
                <Share2 className="mr-2 w-5 h-5" /> Challenge Your Friends
              </Button>

              <Button asChild variant="outline" className={`w-full h-12 text-lg font-bold border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800 ${sport === 'football' ? 'text-amber-500 hover:text-amber-400 hover:border-amber-500' : 'text-[#00ff80] hover:text-[#00ff80] hover:border-[#00ff80]'} transition-all`}>
                <Link href={sport === 'football' ? '/daily/basketball' : '/daily'}>
                  {sport === 'football' ? 'Play Basketball Mode 🏀' : 'Play Football Mode 🏈'}
                </Link>
              </Button>

              <div className="w-full">
                <InstallPWA mode="button" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="w-full max-w-md pb-8">
          <Leaderboard currentUserId={user?.id} defaultSport={sport} />
        </div>

        <InstallPWA mode="banner" />
      </div>
    )
  }

  const q = questions[currentIndex]
  if (!q) return null

  return (
    <div className="h-[100dvh] bg-neutral-950 text-white flex flex-col font-sans overflow-hidden">
      <div className="w-full max-w-md mx-auto pt-2 px-2 shrink-0 z-50">
        <div className={`flex items-center justify-between ${theme.cardBg} backdrop-blur-md rounded-full px-4 py-2 border border-white/5 shadow-2xl`}>
          {currentIndex === 0 ? (
            <Link href="/"><button className="text-neutral-400 hover:text-white"><Home className="w-4 h-4" /></button></Link>
          ) : (
            <div className="w-4" />
          )}
          <div className="flex items-center gap-2">
            <div className={`text-lg font-black ${theme.primary} tabular-nums leading-none`}>{score}</div>
          </div>
          <div className="text-[10px] font-bold text-neutral-500 tracking-widest"><span className="text-white">{currentIndex + 1}</span>/{config.rounds}</div>
        </div>
        <div className="mt-2 px-1">
          <Progress value={((currentIndex) / config.rounds) * 100} className={`h-1 bg-neutral-800 rounded-full [&>div]:${theme.bgPrimary}`} />
        </div>
      </div>

      <main className="flex-1 w-full max-w-md mx-auto p-2 pb-4 flex flex-col gap-2 overflow-hidden h-full">
        <div className={`flex-1 relative ${theme.cardBg} rounded-xl overflow-hidden border ${theme.borderPrimary} border-opacity-20 shadow-2xl min-h-0`}>
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
            <div className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg bg-white text-black flex items-center gap-1">
              <theme.icon className="w-3 h-3 text-black" /> {theme.label}
            </div>
            <div className={`px-3 py-1 rounded-full font-black text-sm shadow-xl transition-all flex items-center gap-2 ${showResult ? (selectedOption === q.correct_answer ? `bg-[#00ff80] text-black` : 'bg-red-500 text-white') : 'bg-white text-black'}`}>
              {showResult ? (selectedOption === q.correct_answer ? (
                <>
                  <span>+{lastEarnedPoints}</span>
                  {receivedBonus && <span className="text-[10px] bg-black text-[#00ff80] px-1.5 rounded animate-pulse whitespace-nowrap">{bonusReason}</span>}
                </>
              ) : '+0') : `+${Math.round(potentialPoints * getMultiplier(q.tier || 1, sport) * config.pointScale)}`}
            </div>
          </div>
          {q.image_url && <Image src={q.image_url} alt="Player" fill className={`object-cover transition-opacity duration-500 ${isImageReady ? 'opacity-100' : 'opacity-0'}`} onLoadingComplete={() => setIsImageReady(true)} priority={true} />}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-16 z-10">
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{q.name}</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 shrink-0 h-32 md:h-40">
          {q.options.map((opt: string) => {
            let btnClass = `bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800`
            if (showResult) {
              if (opt === q.correct_answer) btnClass = `bg-[#00ff80] text-black ring-2 ring-[#00ff80]`
              else if (opt === selectedOption) btnClass = "bg-red-500 text-white"
              else btnClass = "bg-neutral-950 text-neutral-600 opacity-30"
            }
            return (<Button key={opt} onClick={() => handleGuess(opt)} disabled={showResult || !isImageReady} className={`h-full text-xs md:text-sm font-bold uppercase transition-all ${btnClass}`}> {cleanText(opt)} </Button>)
          })}
        </div>
      </main>
    </div>
  )
}