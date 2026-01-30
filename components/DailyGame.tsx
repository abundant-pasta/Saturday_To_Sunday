'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getDailyGame } from '@/app/actions' 
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Home, Share2, Loader2, Trophy, AlertCircle, Star, Shield, Flame, Zap, Medal, Skull, Dribbble } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import IntroScreen from '@/components/IntroScreen'
import AuthButton from '@/components/AuthButton'
import { createBrowserClient } from '@supabase/ssr'
import Leaderboard from '@/components/Leaderboard'
import InstallPWA from '@/components/InstallPWA'
import PushNotificationManager from '@/components/PushNotificationManager'

// --- CONSTANTS & THEMES ---
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

// --- CONFIG: Game Lengths & SCALING ---
const GAME_CONFIG = {
    football: { 
        rounds: 10, 
        maxScore: 1350, 
        pointScale: 1.0 
    },
    basketball: { 
        rounds: 5, 
        maxScore: 1350, 
        pointScale: 2.0 
    } 
}

// --- HELPER: Get Date ---
const getGameDate = () => {
    const offset = 6 * 60 * 60 * 1000 
    const adjustedTime = new Date(Date.now() - offset)
    return adjustedTime.toISOString().split('T')[0]
}

// --- HELPER: Multiplier Logic ---
const getMultiplier = (tier: number) => {
    if (tier === 3) return 2.0
    if (tier === 2) return 1.5
    return 1.0
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

// --- HELPER: Dynamic Ranks ---
const getRankTitle = (score: number, sport: 'football' | 'basketball') => {
    if (sport === 'football') {
        if (score >= 1100) return { title: "Heisman Hopeful", color: "text-yellow-400", icon: Trophy }
        if (score >= 700) return { title: "All-American", color: "text-[#00ff80]", icon: Medal }
        if (score >= 300) return { title: "Varsity Starter", color: "text-blue-400", icon: Star }
        if (score > 0) return { title: "Practice Squad", color: "text-neutral-400", icon: Shield }
        return { title: "Redshirt", color: "text-red-500", icon: Skull }
    } else {
        if (score >= 1100) return { title: "MVP Contender", color: "text-yellow-400", icon: Trophy }
        if (score >= 700) return { title: "All-Star", color: "text-amber-500", icon: Medal }
        if (score >= 300) return { title: "Starting 5", color: "text-blue-400", icon: Star }
        if (score > 0) return { title: "6th Man", color: "text-neutral-400", icon: Shield }
        return { title: "G-League", color: "text-red-500", icon: Skull }
    }
}

// --- PROPS INTERFACE ---
interface DailyGameProps {
    sport?: 'football' | 'basketball'
}

export default function DailyGameWrapper({ sport = 'football' }: DailyGameProps) {
    return (
        <Suspense fallback={<div className="bg-neutral-950 min-h-screen flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>}>
            <DailyGame sport={sport} />
        </Suspense>
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
  const [results, setResults] = useState<('correct' | 'wrong' | 'pending')[]>([])
  const [potentialPoints, setPotentialPoints] = useState(100)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isImageReady, setIsImageReady] = useState(false)

  const [user, setUser] = useState<any>(null)
  const [isSaved, setIsSaved] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. INITIAL LOAD
  useEffect(() => {
    const loadGame = async () => {
      try {
          const data = await getDailyGame(sport) 
          
          if (data && data.length > 0) {
            const gameData = data.slice(0, config.rounds)
            setQuestions(gameData)
            
            const storageKeyScore = `s2s_${sport}_today_score`
            const storageKeyDate = `s2s_${sport}_last_played_date`
            const storageKeyResults = `s2s_${sport}_daily_results`

            const savedScore = localStorage.getItem(storageKeyScore)
            const savedDate = localStorage.getItem(storageKeyDate)
            const savedResults = localStorage.getItem(storageKeyResults) 
            
            const today = getGameDate()

            if (savedScore && savedDate === today) {
                setScore(parseInt(savedScore))
                try {
                    if (savedResults) setResults(JSON.parse(savedResults))
                    else setResults(new Array(gameData.length).fill('pending'))
                } catch (e) {
                    setResults(new Array(gameData.length).fill('pending'))
                }
                setGameState('finished')
                setIsSaved(true) 
            } else {
                setResults(new Array(gameData.length).fill('pending'))
                setGameState('intro')
            }
          }
      } catch (err) {
          console.error("Critical Error Loading Game:", err)
      }
    }
    loadGame()
  }, [sport, config.rounds])

  // AUTH LISTENER
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

  // 4. SAVE LOGIC
  useEffect(() => {
    const saveScore = async () => {
      if (gameState !== 'finished' || isSaved || score <= 0) return

      const todayISO = getGameDate() 
      
      let upsertPayload: any = {
          score: score,
          game_date: todayISO,
          results_json: results,
          sport: sport 
      }
      
      let conflictTarget = ''
      
      if (user) {
          upsertPayload.user_id = user.id
          conflictTarget = 'user_id,game_date,sport' 
      } else {
          upsertPayload.guest_id = getGuestId()
          conflictTarget = 'guest_id,game_date,sport'
      }

      const { error } = await supabase.from('daily_results').upsert(upsertPayload, { onConflict: conflictTarget })
      if (!error) setIsSaved(true)
    }
    saveScore()
  }, [gameState, user, score, isSaved, results, sport])

  const handleStartGame = () => {
      setGameState('playing')
  }

  // TIMER LOGIC
  useEffect(() => {
    if (gameState !== 'playing' || showResult || !isImageReady) return
    const currentQ = questions[currentIndex]
    const tier = currentQ ? (currentQ.tier || 1) : 1
    const multiplier = getMultiplier(tier)
    const decayAmount = 5 / multiplier
    let decayInterval: any
    const startTimer = setTimeout(() => {
        decayInterval = setInterval(() => {
            setPotentialPoints((prev) => (prev <= 10 ? 10 : prev - decayAmount))
        }, 800)
    }, 1000)
    return () => { clearTimeout(startTimer); if (decayInterval) clearInterval(decayInterval) }
  }, [gameState, showResult, isImageReady, currentIndex, questions])

  const handleGuess = (option: string) => {
    if (showResult) return
    setSelectedOption(option)
    const currentQ = questions[currentIndex]
    const isCorrect = option === currentQ.correct_answer
    
    let newScore = score
    if (isCorrect) {
        const multiplier = getMultiplier(currentQ.tier || 1)
        const pointsAwarded = Math.round(potentialPoints * multiplier * config.pointScale)
        newScore = score + pointsAwarded
        setScore(newScore)
    }
    
    const newResults = [...results]
    newResults[currentIndex] = isCorrect ? 'correct' : 'wrong'
    setResults(newResults)
    setShowResult(true)

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setSelectedOption(null)
        setShowResult(false)
        setPotentialPoints(100)
        setIsImageReady(false) 
      } else {
        localStorage.setItem(`s2s_${sport}_today_score`, newScore.toString())
        localStorage.setItem(`s2s_${sport}_last_played_date`, getGameDate())
        localStorage.setItem(`s2s_${sport}_daily_results`, JSON.stringify(newResults))
        setGameState('finished')
      }
    }, 1500)
  }

  // --- SHARE LOGIC ---
  const handleShare = async () => {
    const squares = results.map(r => r === 'correct' ? '🟩' : '🟥').join('')
    const dateObj = new Date(Date.now() - 6 * 60 * 60 * 1000)
    const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const streakText = streak > 1 ? ` | 🔥 ${streak}` : ''
    
    const rankInfo = getRankTitle(score, sport)
    const domain = 'https://www.playsaturdaytosunday.com'
    const challengeUrl = `${domain}/daily${sport === 'basketball' ? '/basketball' : ''}?s=${score}` 

    const text = `Saturday to Sunday (${shortDate})
${sport === 'basketball' ? '🏀' : '🏈'} ${theme.label} Mode
Score: ${score.toLocaleString()} (${rankInfo.title})${streakText}

${squares}

Can you beat my score? 👇
${challengeUrl}`
  
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        alert('Copied to clipboard!') 
      }
    } catch (err) {
      await navigator.clipboard.writeText(text)
    }
  }

  // --- RENDER ---
  if (gameState === 'loading') return <div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading...</div>
  
  if (gameState === 'intro') {
      const firstImage = questions[0]?.image_url
      return (
        <div className="h-[100dvh] bg-neutral-950 overflow-y-auto overflow-x-hidden relative">
             <IntroScreen 
                onStart={handleStartGame} 
                challengerScore={challengerScore} 
                sport={sport} // PASS SPORT PROP
             /> 
             {firstImage && (
                <div className="hidden"><Image src={firstImage} alt="Preload Q1" width={400} height={400} priority={true} /></div>
             )}
        </div>
      )
  }

  // FINISHED SCREEN
  const rankInfo = getRankTitle(score, sport)

  if (gameState === 'finished') {
    return (
      <div className="min-h-[100dvh] bg-neutral-950 text-white flex flex-col items-center justify-center p-4 space-y-4 animate-in fade-in duration-500 relative">
        <Link href="/" className="absolute top-4 left-4 z-20">
            <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-white rounded-full"><Home className="w-6 h-6" /></Button>
        </Link>

        <div className="text-center space-y-2 mb-2">
            <Trophy className={`w-16 h-16 ${theme.primary} mx-auto animate-bounce mb-2`} />
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Daily Complete</h1>
        </div>
        
        <Card className={`w-full max-w-md ${theme.cardBg} border-neutral-800 shadow-2xl relative overflow-hidden`}>
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6 relative">
            <div className="flex flex-col items-center justify-center gap-2">
                <div className="flex flex-col items-center">
                    <span className="text-neutral-500 text-xs uppercase tracking-widest font-bold mb-1">Final Score</span>
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
                {results.map((r, i) => (
                    <div key={i} className={`w-6 h-6 rounded-sm ${r === 'correct' ? 'bg-[#00ff80]' : r === 'wrong' ? 'bg-red-500' : 'bg-neutral-800'}`} />
                ))}
            </div>

            <Button onClick={handleShare} className={`w-full h-12 text-lg font-bold ${theme.bgPrimary} text-black mt-6 hover:opacity-90 shadow-lg`}>
                <Share2 className="mr-2 w-5 h-5" /> Share Result
            </Button>
            
            <div className="pt-4 w-full">
                <Link href={sport === 'football' ? '/daily/basketball' : '/daily'} className="w-full block">
                    <Button variant="outline" className={`w-full h-12 text-lg font-bold border-neutral-700 bg-neutral-900/50 hover:bg-neutral-800 ${sport === 'football' ? 'text-amber-500 hover:text-amber-400 hover:border-amber-500' : 'text-[#00ff80] hover:text-[#00ff80] hover:border-[#00ff80]'} transition-all`}>
                        {sport === 'football' ? 'Play Basketball Mode 🏀' : 'Play Football Mode 🏈'}
                    </Button>
                </Link>
            </div>

        </CardContent>
        </Card>
      </div>
    )
  }

  // PLAYING SCREEN
  const q = questions[currentIndex]
  const nextQ = questions[currentIndex + 1] 
  
  if (!q) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Loading...</div>

  const currentPotential = Math.round(potentialPoints * getMultiplier(q.tier || 1) * config.pointScale)

  return (
    <div className="h-[100dvh] bg-neutral-950 text-white flex flex-col font-sans overflow-hidden">
        
        {nextQ && nextQ.image_url && (
            <div className="hidden"><Image src={nextQ.image_url} alt="Preload Next" width={400} height={400} priority={true} /></div>
        )}

        {/* HEADER */}
        <div className="w-full max-w-md mx-auto pt-2 px-2 pb-0 shrink-0 z-50">
           <div className={`flex items-center justify-between ${theme.cardBg} backdrop-blur-md rounded-full px-4 py-2 border border-white/5 shadow-2xl`}>
               <Link href="/"><button className="text-neutral-400 hover:text-white"><Home className="w-4 h-4" /></button></Link>
               <div className="flex items-center gap-2">
                   <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Score</div>
                   <div className={`text-lg font-black ${theme.primary} tabular-nums leading-none`}>{score}</div>
               </div>
               <div className="text-[10px] font-bold text-neutral-500 font-mono tracking-widest"><span className="text-white">{currentIndex + 1}</span>/{config.rounds}</div>
           </div>
           <div className="mt-2 px-1">
              <Progress value={((currentIndex) / config.rounds) * 100} className={`h-1 bg-neutral-800 rounded-full [&>div]:${theme.bgPrimary}`} />
           </div>
        </div>

        {/* MAIN GAME CARD */}
        <main className="flex-1 w-full max-w-md mx-auto p-2 pb-4 flex flex-col gap-2 overflow-hidden h-full">
            <div className={`flex-1 relative ${theme.cardBg} rounded-xl overflow-hidden border ${theme.borderPrimary} border-opacity-20 shadow-2xl min-h-0`}>
               <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                   <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg border border-black/20 bg-white text-black flex items-center gap-1`}>
                       <theme.icon className="w-3 h-3 text-black" />
                       {theme.label}
                   </div>
                   <div className={`px-3 py-1 rounded-full font-black text-sm shadow-xl border border-black/10 transition-all ${ showResult ? (selectedOption === q.correct_answer ? `bg-[#00ff80] text-black` : 'bg-red-500 text-white') : 'bg-white text-black' }`}>
                        {showResult ? (selectedOption === q.correct_answer ? `+${currentPotential}` : '+0') : `${currentPotential}`}
                   </div>
               </div>

               {q.image_url ? (
                 <Image src={q.image_url} alt="Player" fill className={`object-cover transition-opacity duration-500 ${isImageReady ? 'opacity-100' : 'opacity-0'}`} onLoadingComplete={() => setIsImageReady(true)} priority={true} />
               ) : ( <div className="flex items-center justify-center h-full text-neutral-600"><AlertCircle /> No Image</div> )}
               
               <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-16 z-10">
                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter shadow-black drop-shadow-lg leading-none">{q.name}</h2>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-2 shrink-0 h-32 md:h-40">
                {q.options.map((opt: string) => {
                    let btnClass = `bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:${theme.borderPrimary} hover:border-opacity-50`
                    if (showResult) {
                        if (opt === q.correct_answer) btnClass = `bg-[#00ff80] text-black border-[#00ff80] ring-2 ring-[#00ff80] ring-opacity-50` 
                        else if (opt === selectedOption) btnClass = "bg-red-500 text-white border-red-600" 
                        else btnClass = "bg-neutral-950 text-neutral-600 opacity-30" 
                    }
                    return ( <Button key={opt} onClick={() => handleGuess(opt)} disabled={showResult || !isImageReady} className={`h-full text-xs md:text-sm font-bold uppercase whitespace-normal leading-tight shadow-lg transition-all ${btnClass}`}> {cleanText(opt)} </Button> )
                })}
            </div>
        </main>
    </div>
  )
}