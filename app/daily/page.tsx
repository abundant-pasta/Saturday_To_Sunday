'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getDailyGame } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Home, Share2, Loader2, Trophy, AlertCircle, Hash, Star, Shield, Flame, Zap, User, TrendingUp, TrendingDown, Swords } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import IntroScreen from '@/components/IntroScreen'
import AuthButton from '@/components/AuthButton'
import { createBrowserClient } from '@supabase/ssr'
import Leaderboard from '@/components/Leaderboard'
import InstallPWA from '@/components/InstallPWA'
import PushNotificationManager from '@/components/PushNotificationManager'

// --- HELPER: Get Date in Mountain Time logic (UTC - 6h) ---
const getGameDate = () => {
    const offset = 6 * 60 * 60 * 1000 
    const adjustedTime = new Date(Date.now() - offset)
    return adjustedTime.toISOString().split('T')[0]
}

// --- HELPER: Multiplier Logic ---
const getMultiplier = (tier: number) => {
    if (tier === 3) return 2.0    // Hard
    if (tier === 2) return 1.5    // Medium
    return 1.0                    // Easy
}

// --- HELPER: Clean Text (Fixes Texas A&M issue) ---
const cleanText = (text: string) => {
    if (!text) return ''
    return text.replace(/&amp;/g, '&')
}

// --- HELPER: Generate/Get Guest ID ---
const getGuestId = () => {
    if (typeof window === 'undefined') return null
    let id = localStorage.getItem('s2s_guest_id')
    if (!id) {
        id = 'guest_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
        localStorage.setItem('s2s_guest_id', id)
    }
    return id
}

// WRAPPER COMPONENT
export default function DailyGamePage() {
    return (
        <Suspense fallback={<div className="bg-neutral-950 min-h-screen flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>}>
            <DailyGame />
        </Suspense>
    )
}

function DailyGame() {
  const searchParams = useSearchParams()
  const challengerScore = searchParams.get('s')

  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  
  // --- STATE: Stats ---
  const [streak, setStreak] = useState(0)
  const [myRank, setMyRank] = useState<number | null>(null)
  const [totalPlayers, setTotalPlayers] = useState(0)
  
  // NEW: Global Average State
  const [averageScore, setAverageScore] = useState(0)

  const [gameState, setGameState] = useState<'loading' | 'intro' | 'playing' | 'finished'>('loading')
  const [results, setResults] = useState<('correct' | 'wrong' | 'pending')[]>([])
  
  // Game Logic State
  const [potentialPoints, setPotentialPoints] = useState(100)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isImageReady, setIsImageReady] = useState(false)

  // Auth & Save State
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
          const data = await getDailyGame()
          
          if (data && data.length > 0) {
            setQuestions(data)
            
            const savedScore = localStorage.getItem('s2s_today_score')
            const savedDate = localStorage.getItem('s2s_last_played_date')
            const savedResults = localStorage.getItem('s2s_daily_results') 
            
            const today = getGameDate()

            if (savedScore && savedDate === today) {
                setScore(parseInt(savedScore))
                try {
                    if (savedResults) setResults(JSON.parse(savedResults))
                    else setResults(new Array(data.length).fill('pending'))
                } catch (e) {
                    setResults(new Array(data.length).fill('pending'))
                }
                
                setGameState('finished')

                const { data: { session } } = await supabase.auth.getSession()
                const currentUserId = session?.user?.id
                const guestId = localStorage.getItem('s2s_guest_id')

                let query = supabase.from('daily_results').select('score').eq('game_date', today)
                
                if (currentUserId) {
                    query = query.eq('user_id', currentUserId)
                } else if (guestId) {
                    query = query.eq('guest_id', guestId)
                } else {
                    setIsSaved(false)
                    return
                }

                const { data: existingRows } = await query
                
                if (existingRows && existingRows.length > 0) {
                    setIsSaved(true)
                    const dbScore = existingRows[0].score
                    if (dbScore !== parseInt(savedScore)) {
                        setScore(dbScore) 
                        localStorage.setItem('s2s_today_score', dbScore.toString())
                    }
                } else {
                    setIsSaved(false)
                }

            } else {
                setResults(new Array(data.length).fill('pending'))
                setGameState('intro')
            }
          } else {
              console.error("No daily game data found.")
          }
      } catch (err) {
          console.error("Critical Error Loading Game:", err)
      }
    }
    loadGame()
  }, [])

  // 2. AUTH LISTENER
  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
            setUser(session.user)
        }
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 3. PROFILE FETCH
  useEffect(() => {
    const fetchProfile = async () => {
        if (!user) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('current_streak')
            .eq('id', user.id)
            .single()
        
        if (profile) {
            if (profile.current_streak) setStreak(profile.current_streak)
        }
    }
    fetchProfile()
  }, [user])

  // 4. THE SAVE LOGIC
  useEffect(() => {
    const saveScore = async () => {
      if (gameState !== 'finished' || isSaved || score <= 0) return

      const todayISO = getGameDate() 
      let saveSuccessful = false

      if (user) {
         const localGuestId = localStorage.getItem('s2s_guest_id')
         if (localGuestId) {
             const { data } = await supabase
                .from('daily_results')
                .update({ user_id: user.id })
                .eq('guest_id', localGuestId)
                .eq('game_date', todayISO)
                .is('user_id', null) 
                .select()
             
             if (data && data.length > 0) saveSuccessful = true
         }
      }

      if (!saveSuccessful) {
        let upsertPayload: any = {
            score: score,
            game_date: todayISO,
        }
        
        let conflictTarget = ''
        
        if (user) {
            upsertPayload.user_id = user.id
            conflictTarget = 'user_id, game_date'
        } else {
            const guestId = getGuestId()
            upsertPayload.guest_id = guestId
            conflictTarget = 'guest_id, game_date'
        }

        const { error: scoreError } = await supabase.from('daily_results').upsert(
            upsertPayload, 
            { onConflict: conflictTarget }
        )

        if (!scoreError) saveSuccessful = true
      }

      if (saveSuccessful && user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('current_streak, last_played_date')
                .eq('id', user.id)
                .single()

            if (profile) {
                const offset = 6 * 60 * 60 * 1000
                const yesterdayDate = new Date(Date.now() - offset - 24 * 60 * 60 * 1000)
                const yesterdayISO = yesterdayDate.toISOString().split('T')[0]
                
                let newStreak = 1 
                if (profile.last_played_date === todayISO) {
                    newStreak = profile.current_streak || 1
                } else if (profile.last_played_date === yesterdayISO) {
                    newStreak = (profile.current_streak || 0) + 1
                }
                
                await supabase
                    .from('profiles')
                    .update({ 
                        current_streak: newStreak,
                        last_played_date: todayISO 
                    })
                    .eq('id', user.id)
                
                setStreak(newStreak)
            }
      }
      
      if (saveSuccessful) setIsSaved(true)
    }
    saveScore()
  }, [gameState, user, score, isSaved])

  // 5. RANK & AVERAGE FETCH LOGIC
  useEffect(() => {
    const fetchRankAndStats = async () => {
        if (gameState === 'finished' && score > 0 && isSaved) {
            const todayISO = getGameDate()

            const { count: total } = await supabase
                .from('daily_results')
                .select('*', { count: 'exact', head: true })
                .eq('game_date', todayISO)

            const { count: betterPlayers } = await supabase
                .from('daily_results')
                .select('*', { count: 'exact', head: true })
                .eq('game_date', todayISO)
                .gt('score', score)
            
            const { data: avg } = await supabase.rpc('get_average_score', { check_date: todayISO })

            setTotalPlayers(total || 0)
            setMyRank((betterPlayers || 0) + 1)
            if (avg) setAverageScore(avg)
        }
    }

    fetchRankAndStats()
  }, [gameState, score, isSaved])

  const handleStartGame = () => {
      setGameState('playing')
  }

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (gameState !== 'playing' || showResult || !isImageReady) return

    let decayInterval: any
    const startTimer = setTimeout(() => {
        decayInterval = setInterval(() => {
            setPotentialPoints((prev) => (prev <= 10 ? 10 : prev - 5))
        }, 500)
    }, 1000)

    return () => {
        clearTimeout(startTimer)
        if (decayInterval) clearInterval(decayInterval)
    }
  }, [gameState, showResult, isImageReady])

  const handleGuess = (option: string) => {
    if (showResult) return

    setSelectedOption(option)
    const currentQ = questions[currentIndex]
    const isCorrect = option === currentQ.correct_answer
    
    let newScore = score
    if (isCorrect) {
        const multiplier = getMultiplier(currentQ.tier || 1)
        const pointsAwarded = Math.round(potentialPoints * multiplier)
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
        localStorage.setItem('s2s_today_score', newScore.toString())
        localStorage.setItem('s2s_last_played_date', getGameDate())
        localStorage.setItem('s2s_daily_results', JSON.stringify(newResults))
        setGameState('finished')
      }
    }, 1500)
  }

  const handleShare = async () => {
    const squares = results.map(r => r === 'correct' ? '🟩' : '🟥').join('')
    const dateObj = new Date(Date.now() - 6 * 60 * 60 * 1000)
    const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const streakText = streak > 1 ? ` | 🔥 ${streak}` : ''
    
    const domain = 'https://www.playsaturdaytosunday.com'
    const challengeUrl = `${domain}?s=${score}` 

    const text = `Saturday to Sunday (${shortDate})
Score: ${score.toLocaleString()}/1,350${streakText}

${squares}

Can you beat my score? Challenge me here: 👇
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

  // --- SHARED PROFILE BUTTON COMPONENT ---
  const ProfileHeaderButton = () => (
    <div className="flex items-center">
        {user ? (
            <Link href="/profile">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-700 hover:border-[#00ff80] relative transition-colors shadow-lg">
                {user.user_metadata?.avatar_url ? (
                    <Image 
                        src={user.user_metadata.avatar_url} 
                        alt="Profile" 
                        fill 
                        className="object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-neutral-400" />
                    </div>
                )}
            </div>
            </Link>
        ) : (
            <button onClick={() => alert("Log in to track your career stats!")}>
                <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900 flex items-center justify-center text-neutral-500 hover:text-white hover:border-neutral-600 transition-colors">
                    <User className="w-4 h-4" />
                </div>
            </button>
        )}
    </div>
  )

  // --- RENDER LOGIC ---

  if (gameState === 'loading') return <div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading...</div>
  
  if (gameState === 'intro') {
      return (
        <div className="h-[100dvh] bg-neutral-950 overflow-y-auto overflow-x-hidden">
             <IntroScreen onStart={handleStartGame} challengerScore={challengerScore} />
        </div>
      )
  }

  // --- GAME OVER SCREEN ---
  if (gameState === 'finished') {
    return (
      <div className="min-h-[100dvh] bg-neutral-950 text-white flex flex-col items-center justify-center p-4 space-y-4 animate-in fade-in duration-500 relative">
        
        <div className="absolute top-4 left-4 z-20">
            <Link href="/">
                <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full">
                    <Home className="w-6 h-6" />
                </Button>
            </Link>
        </div>

        <div className="absolute top-4 right-4 z-20">
            <ProfileHeaderButton />
        </div>

        <div className="text-center space-y-2 mb-2">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto animate-bounce mb-2" />
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Daily Complete</h1>
            <p className="text-neutral-400 text-sm">Come back tomorrow for new players.</p>
        </div>
        
        <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 shadow-2xl relative overflow-hidden">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6 relative">
                
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex flex-col items-center">
                        <span className="text-neutral-500 text-xs uppercase tracking-widest font-bold mb-1">Final Score</span>
                        <div className="text-6xl font-black text-[#00ff80] font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(0,255,128,0.3)] leading-none">
                            {score}<span className="text-2xl text-neutral-600">/1350</span>
                        </div>
                    </div>

                    {/* NEW: Challenger Victory Badge */}
                    {challengerScore && score > parseInt(challengerScore) && (
                        <div className="animate-in zoom-in duration-500 delay-300">
                             <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                                <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-bounce" />
                                <span className="text-xs font-black text-yellow-400 uppercase tracking-widest">
                                    You Beat The Challenger!
                                </span>
                             </div>
                        </div>
                    )}

                    {/* Global Average Comparison */}
                    {averageScore > 0 && (
                        <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${score >= averageScore ? 'bg-[#00ff80]/10 border-[#00ff80]/30 text-[#00ff80]' : 'bg-red-500/10 border-red-500/30 text-red-500' } flex items-center gap-1`}>
                            {score >= averageScore ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {score >= averageScore ? 'Above Average' : 'Below Average'} ({averageScore})
                        </div>
                    )}

                    {isSaved && (
                         <div className="flex items-center gap-2 mt-2 animate-in zoom-in duration-500 delay-200">
                             <div className="bg-neutral-800/80 border border-neutral-700 px-3 py-1.5 rounded-md flex items-center gap-2 h-9">
                                <Hash className="w-3.5 h-3.5 text-blue-400" />
                                <div className="flex items-baseline gap-1 leading-none">
                                    <span className="text-sm font-black text-neutral-200">
                                        {myRank ? myRank : '-'}
                                    </span>
                                    <span className="text-xs font-bold text-neutral-500">
                                        / {totalPlayers}
                                    </span>
                                </div>
                             </div>
                             {streak > 0 && (
                                <div className={`px-3 py-1.5 rounded-md flex items-center gap-2 border h-9 ${streak > 1 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-neutral-800/80 border-neutral-700'}`}>
                                    <span className="text-sm">🔥</span>
                                    <div className="flex items-baseline gap-1 leading-none">
                                        <span className={`text-sm font-black ${streak > 1 ? 'text-orange-400' : 'text-neutral-200'}`}>
                                            {streak}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-neutral-500">Day Streak</span>
                                    </div>
                                </div>
                             )}
                         </div>
                    )}
                </div>

                <div className="flex justify-center gap-1">
                    {results.map((r, i) => (
                        <div key={i} className={`w-6 h-6 rounded-sm ${r === 'correct' ? 'bg-[#00ff80]' : r === 'wrong' ? 'bg-red-500' : 'bg-neutral-800'}`} />
                    ))}
                </div>

                <div className="pt-2 w-full animate-in slide-in-from-bottom-2 fade-in">
                    <Button onClick={handleShare} className="w-full h-12 text-lg font-bold bg-[#00ff80] hover:bg-[#05ff84] text-black transition-all shadow-lg shadow-[#00ff80]/20">
                        <Share2 className="mr-2 w-5 h-5" /> Share Result
                    </Button>
                </div>

                {!user && (
                    <div className="mt-2 bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50 w-full flex flex-col items-center gap-3">
                        <AuthButton />
                        <div className="flex flex-col gap-1 items-center">
                            <div className="text-[#00ff80] text-[10px] sm:text-xs uppercase tracking-widest font-black text-center flex items-center justify-center gap-2 leading-tight">
                                <span>Make it official. Log in to save this score and start your daily streak.</span>
                                <Flame className="w-5 h-5 text-orange-500 fill-orange-500 shrink-0" />
                            </div>
                        </div>
                    </div>
                )}

            </CardContent>
        </Card>

        <div className="w-full max-w-md space-y-4 animate-in slide-in-from-bottom-4 duration-500 pb-8">
            <div className="w-full empty:hidden">
                <PushNotificationManager hideOnSubscribed={true} />
            </div>
            <div className="flex justify-center">
                <InstallPWA />
            </div>
            <Leaderboard 
                currentUserId={user?.id} 
                key={isSaved ? `saved-${user?.id}` : 'unsaved'} 
            />
        </div>
      </div>
    )
  }

  // ... [Keep playing/render logic] ...
  const q = questions[currentIndex]

  if (!q && gameState === 'playing') {
      return (
        <div className="min-h-[100dvh] bg-neutral-950 flex flex-col items-center justify-center text-white p-4 text-center">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#00ff80]" />
            <p>Loading Game Data...</p>
            <p className="text-xs text-neutral-500 mt-2">If this persists, refresh the page.</p>
        </div>
      )
  }
  
  const tier = q ? (q.tier || 1) : 1
  const multiplier = getMultiplier(tier)
  const currentPotential = Math.round(potentialPoints * multiplier)

  return (
    <div className="h-[100dvh] bg-neutral-950 text-white flex flex-col font-sans overflow-hidden">
        <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-50 shrink-0">
         <div className="flex items-center gap-2">
             <Link href="/">
                <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-[#00ff80] hover:bg-neutral-800 -ml-2">
                    <Home className="w-5 h-5" />
                </Button>
             </Link>
             <div className="text-xs font-mono text-neutral-500 border-l border-neutral-700 pl-2">SCORE: <span className="text-[#00ff80] font-black text-sm">{score}</span></div>
         </div>
         <div className="flex items-center gap-3">
             <div className="text-xs font-mono text-neutral-400">{currentIndex + 1}/10</div>
         </div>
        </header>
        
        <Progress value={((currentIndex) / 10) * 100} className="h-1 bg-neutral-800 shrink-0" />

        <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 relative bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shadow-2xl min-h-0">
               
               <div className="absolute top-3 left-3 z-30 flex flex-col gap-1 items-start">
                  <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg border border-black/20 flex items-center gap-1
                    ${tier === 1 ? 'bg-[#00ff80] text-black' : 
                      tier === 2 ? 'bg-yellow-400 text-black' : 
                      'bg-red-500 text-white animate-pulse'}`}>
                      {tier === 1 && <Star className="w-3 h-3 fill-current" />}
                      {tier === 2 && <Shield className="w-3 h-3 fill-current" />}
                      {tier === 3 && <Flame className="w-3 h-3 fill-current" />}
                      {tier === 1 ? 'EASY' : tier === 2 ? 'MED' : 'HARD'}
                  </div>
                  {tier > 1 && (
                    <div className="bg-[#00ff80] text-black px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/10 flex items-center gap-1 animate-in slide-in-from-left-2 fade-in duration-300">
                       <Zap className="w-3 h-3 fill-current" />
                       {tier === 2 ? '1.5x' : '2.0x'} BOOST
                    </div>
                  )}
               </div>

               {q.image_url ? (
                 <Image src={q.image_url} alt="Player" fill className={`object-cover transition-opacity duration-500 ${isImageReady ? 'opacity-100' : 'opacity-0'}`} onLoadingComplete={() => setIsImageReady(true)} priority={true} />
               ) : ( <div className="flex items-center justify-center h-full text-neutral-600"><AlertCircle /> No Image</div> )}
               {!isImageReady && ( <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-50"><Loader2 className="w-8 h-8 text-neutral-500 animate-spin" /></div> )}
                
                <div className={`transition-opacity duration-500 ${isImageReady ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1 z-20">
                        <div className={`px-3 py-1 rounded-full font-black text-sm md:text-lg shadow-xl border border-black/10 transition-all ${ showResult ? (selectedOption === q.correct_answer ? 'bg-[#00ff80] text-black' : 'bg-red-500 text-white') : 'bg-yellow-400 text-black' }`}>
                            {showResult ? (selectedOption === q.correct_answer ? `+${currentPotential}` : '+0') : `${currentPotential}`}
                        </div>
                        {showResult && ( <div className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-xl border border-black/10 ${ selectedOption === q.correct_answer ? 'bg-white text-green-700' : 'bg-white text-red-600' }`}> {selectedOption === q.correct_answer ? 'CORRECT' : 'WRONG'} </div> )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-16 z-10">
                        <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter shadow-black drop-shadow-lg leading-none">{q.name}</h2>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:gap-3 shrink-0 h-32 md:h-40">
                {q.options.map((opt: string) => {
                    let btnClass = "bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-[#00ff80]/50"
                    if (showResult) {
                        if (opt === q.correct_answer) btnClass = "bg-[#00ff80] text-black border-[#00ff80] ring-2 ring-[#00ff80]/50"
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