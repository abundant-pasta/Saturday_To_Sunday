'use client'

import { useState, useEffect } from 'react'
import { getDailyGame } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Home, Share2, Loader2, Trophy, AlertCircle, Pencil, Settings, X, Hash, Star, Shield, Flame, Zap } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import IntroScreen from '@/components/IntroScreen'
import AuthButton from '@/components/AuthButton'
import { createBrowserClient } from '@supabase/ssr'
import Leaderboard from '@/components/Leaderboard'
import InstallPWA from '@/components/InstallPWA'

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

export default function DailyGame() {
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  
  // --- STATE: Stats ---
  const [streak, setStreak] = useState(0)
  const [myRank, setMyRank] = useState<number | null>(null)
  const [totalPlayers, setTotalPlayers] = useState(0)

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
  
  // Profile Editing State
  const [newUsername, setNewUsername] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [showAvatar, setShowAvatar] = useState(true)
  
  // --- STATE: UI Toggles ---
  const [showProfileSettings, setShowProfileSettings] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. INITIAL LOAD: Fetch Game Data & Verify Save Status
  useEffect(() => {
    const loadGame = async () => {
      const data = await getDailyGame()
      // FIX: Check if data actually exists to prevent crash
      if (data && data.length > 0) {
        setQuestions(data)
        
        const savedScore = localStorage.getItem('s2s_today_score')
        const savedDate = localStorage.getItem('s2s_last_played_date')
        const savedResults = localStorage.getItem('s2s_daily_results') 
        
        const today = getGameDate()
        const hasSeenIntro = localStorage.getItem('s2s_has_seen_intro')

        if (savedScore && savedDate === today) {
            setScore(parseInt(savedScore))
            if (savedResults) {
                setResults(JSON.parse(savedResults))
            } else {
                setResults(new Array(data.length).fill('pending'))
            }
            setGameState('finished')

            // --- VERIFY WITH DATABASE ---
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
            } else {
                console.log("Local score found, but DB empty. Retrying save...")
                setIsSaved(false)
            }

        } else {
            setResults(new Array(data.length).fill('pending'))
            if (!hasSeenIntro) {
                setGameState('intro')
            } else {
                setGameState('playing')
            }
        }
      } else {
          // If no data comes back (e.g. RLS blocked it), we log it but don't crash
          console.error("No daily game data found.")
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
            .select('show_avatar, username, current_streak')
            .eq('id', user.id)
            .single()
        
        if (profile) {
            if (profile.show_avatar !== null) setShowAvatar(profile.show_avatar)
            if (profile.username) setNewUsername(profile.username)
            if (profile.current_streak) setStreak(profile.current_streak)
        }
    }
    fetchProfile()
  }, [user])

  // 4. THE SAVE LOGIC (Merged + Create)
  useEffect(() => {
    const saveScore = async () => {
      if (gameState !== 'finished' || isSaved || score <= 0) return

      const todayISO = getGameDate() 
      let saveSuccessful = false

      // --- A. MERGE ATTEMPT ---
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
             
             if (data && data.length > 0) {
                 console.log("Merged guest score into user account")
                 saveSuccessful = true
             }
         }
      }

      // --- B. STANDARD SAVE ---
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
        else console.error("Error saving score", scoreError)
      }

      // --- C. PROFILE UPDATE ---
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
      
      // --- D. FINALIZE ---
      if (saveSuccessful) {
          setIsSaved(true)
      }
    }
    saveScore()
  }, [gameState, user, score, isSaved])

  // 5. RANK FETCH LOGIC
  useEffect(() => {
    const fetchRank = async () => {
        if (gameState === 'finished' && score > 0) {
            const todayISO = getGameDate()

            const { count: total } = await supabase
                .from('daily_results')
                .select('*', { count: 'exact', head: true })
                .eq('game_date', todayISO)
                .not('user_id', 'is', null) 

            const { count: betterPlayers } = await supabase
                .from('daily_results')
                .select('*', { count: 'exact', head: true })
                .eq('game_date', todayISO)
                .gt('score', score)
                .not('user_id', 'is', null)
            
            setTotalPlayers(total || 0)
            setMyRank((betterPlayers || 0) + 1)
        }
    }

    if (gameState === 'finished') {
        fetchRank()
    }
  }, [gameState, score])

  const handleUpdateName = async () => {
    if (!user || !newUsername.trim()) return
    const { error } = await supabase.from('profiles').update({ username: newUsername.trim() }).eq('id', user.id)
    if (!error) {
        setIsEditingName(false)
        window.location.reload()
    }
  }

  const toggleAvatar = async () => {
      if (!user) return
      const newValue = !showAvatar
      setShowAvatar(newValue)
      
      await supabase.from('profiles').update({ show_avatar: newValue }).eq('id', user.id)
  }

  const handleStartGame = () => {
      localStorage.setItem('s2s_has_seen_intro', 'true')
      setGameState('playing')
  }

  // --- TIMER LOGIC (With 1s Delay) ---
  useEffect(() => {
    if (gameState !== 'playing' || showResult || !isImageReady) return

    let decayInterval: any
    
    // 1. Wait 1000ms (1 second) before starting the countdown
    const startTimer = setTimeout(() => {
        // 2. Start decrementing 5 points every 500ms
        decayInterval = setInterval(() => {
            setPotentialPoints((prev) => (prev <= 10 ? 10 : prev - 5))
        }, 500)
    }, 1000)

    // Cleanup ensures we don't have rogue timers
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
    const dateStr = new Date(Date.now() - 6 * 60 * 60 * 1000).toLocaleDateString()
    
    const streakText = streak > 1 ? `🔥 ${streak}` : ''
    
    const text = `Saturday to Sunday Daily Challenge\n${dateStr}\nScore: ${score}/1350 ${streakText}\n\n${squares}\n\nCan you beat me? Try here:\nhttps://www.playsaturdaytosunday.com/daily`
  
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Saturday to Sunday', text })
        return
      } catch (err) {
        console.log('Share cancelled')
      }
    }
  
    try { 
      await navigator.clipboard.writeText(text)
      alert('Result copied!') 
    } catch (err) { 
      console.error(err) 
    }
  }

  if (gameState === 'loading') return <div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading...</div>
  if (gameState === 'intro') return <IntroScreen onStart={handleStartGame} />

  // --- GAME OVER SCREEN ---
  if (gameState === 'finished') {
    return (
      <div className="min-h-[100dvh] bg-neutral-950 text-white flex flex-col items-center justify-center p-4 space-y-4 animate-in fade-in duration-500 relative">
        
        {/* --- TOP LEFT HOME BUTTON --- */}
        <div className="absolute top-4 left-4 z-20">
            <Link href="/">
                <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full">
                    <Home className="w-6 h-6" />
                </Button>
            </Link>
        </div>

        <div className="text-center space-y-2 mb-2">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto animate-bounce mb-2" />
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Daily Complete</h1>
            <p className="text-neutral-400 text-sm">Come back tomorrow for new players.</p>
        </div>
        
        {/* --- MAIN SCORE CARD --- */}
        <Card className="w-full max-w-md bg-neutral-900 border-neutral-800 shadow-2xl relative overflow-hidden">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6 relative">
                
                {/* SETTINGS TOGGLE */}
                {user && (
                  <div className="absolute top-3 right-3 z-10">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowProfileSettings(!showProfileSettings)}
                      className="text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full h-8 w-8"
                    >
                      {showProfileSettings ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                    </Button>
                  </div>
                )}

                {/* --- SCORE + STATS ROW --- */}
                <div className="flex flex-col items-center justify-center gap-2">
                    {/* Main Score */}
                    <div className="flex flex-col items-center">
                        <span className="text-neutral-500 text-xs uppercase tracking-widest font-bold mb-1">Final Score</span>
                        <div className="text-6xl font-black text-[#00ff80] font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(0,255,128,0.3)] leading-none">
                            {score}<span className="text-2xl text-neutral-600">/1350</span>
                        </div>
                    </div>

                    {/* STATS ROW */}
                    {isSaved && (
                         <div className="flex items-center gap-2 mt-2 animate-in zoom-in duration-500 delay-200">
                             
                             {/* RANK BADGE */}
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

                             {/* STREAK BADGE */}
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

                {/* Visual Squares */}
                <div className="flex justify-center gap-1">
                    {results.map((r, i) => (
                        <div key={i} className={`w-6 h-6 rounded-sm ${r === 'correct' ? 'bg-[#00ff80]' : r === 'wrong' ? 'bg-red-500' : 'bg-neutral-800'}`} />
                    ))}
                </div>

                {/* --- PROFILE / LOGIN SECTION --- */}
                <div className="flex flex-col items-center gap-3 w-full">
                    {isSaved && user && (
                        <>
                           {showProfileSettings && (
                             <div className="w-full mt-2 p-4 bg-neutral-950/50 rounded-xl border border-neutral-800 animate-in slide-in-from-top-2 fade-in">
                                 <div className="flex flex-col gap-3">
                                    <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Profile Settings</h3>
                                    {!isEditingName ? (
                                         <Button 
                                            variant="outline" 
                                            onClick={() => setIsEditingName(true)}
                                            className="w-full h-9 text-xs font-bold border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white uppercase tracking-wider justify-between"
                                         >
                                            <span>Display Name</span>
                                            <div className="flex items-center gap-2 text-neutral-500">
                                              <span>{newUsername || user.email?.split('@')[0]}</span>
                                              <Pencil className="w-3 h-3" />
                                            </div>
                                         </Button>
                                    ) : (
                                         <div className="flex items-center gap-2 w-full">
                                            <input 
                                                type="text" 
                                                placeholder="Enter username"
                                                className="bg-neutral-800 border border-neutral-700 text-sm text-white px-3 py-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-[#00ff80]"
                                                value={newUsername}
                                                onChange={(e) => setNewUsername(e.target.value)}
                                            />
                                            <Button onClick={handleUpdateName} size="sm" className="h-9 px-4 font-bold bg-[#00ff80] hover:bg-[#05ff84] text-black">
                                                Save
                                            </Button>
                                         </div>
                                    )}
                                    <div className="flex items-center justify-between px-3 py-2 bg-neutral-900 rounded border border-neutral-700">
                                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Show Photo</span>
                                        <button 
                                            onClick={toggleAvatar}
                                            className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${showAvatar ? 'bg-[#00ff80]' : 'bg-neutral-700'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${showAvatar ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <AuthButton />
                                 </div>
                             </div>
                           )}
                        </>
                    )}

                    {!user && (
                    <div className="mt-2 bg-neutral-800/50 rounded-xl p-4 border border-neutral-700/50 w-full flex flex-col items-center gap-3">
                        <AuthButton />
                        <div className="flex flex-col gap-1 items-center">
                            <p className="text-neutral-400 text-[10px] uppercase tracking-wider font-bold">
                                {isSaved ? (
                                    "Sign in to claim this score"
                                ) : (
                                    "Sign in to save this score"
                                )}
                            </p>
                        </div>
                    </div>
                    )}
                </div>

                {!showProfileSettings && (
                  <div className="pt-2 w-full animate-in slide-in-from-bottom-2 fade-in">
                    <Button onClick={handleShare} className="w-full h-12 text-lg font-bold bg-[#00ff80] hover:bg-[#05ff84] text-black transition-all shadow-lg shadow-[#00ff80]/20">
                        <Share2 className="mr-2 w-5 h-5" /> Share Result
                    </Button>
                  </div>
                )}

            </CardContent>
        </Card>

        {!showProfileSettings && (
          <div className="w-full max-w-md space-y-4 animate-in slide-in-from-bottom-4 duration-500 pb-8">
            <div className="flex justify-center">
                <InstallPWA />
            </div>

            <Leaderboard 
                currentUserId={user?.id} 
                key={isSaved ? `saved-${user?.id}` : 'unsaved'} 
            />
          </div>
        )}
      </div>
    )
  }

  // FIX: This Safety Guard protects against the "White Screen" if data fetch fails.
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
  
  // Calculate potential points based on multiplier for display
  const tier = q ? (q.tier || 1) : 1
  const multiplier = getMultiplier(tier)
  const currentPotential = Math.round(potentialPoints * multiplier)

  return (
    <div className="h-[100dvh] bg-neutral-950 text-white flex flex-col font-sans overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-950/50 backdrop-blur-md sticky top-0 z-50 shrink-0">
         <div className="flex items-center gap-2">
             <Link href="/">
                <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-[#00ff80] hover:bg-neutral-800 -ml-2">
                    <Home className="w-5 h-5" />
                </Button>
             </Link>
             <div className="text-xs font-mono text-neutral-500 border-l border-neutral-700 pl-2">SCORE: <span className="text-[#00ff80] font-black text-sm">{score}</span></div>
         </div>
         <div className="text-xs font-mono text-neutral-400">{currentIndex + 1}/10</div>
        </header>
        
        <Progress value={((currentIndex) / 10) * 100} className="h-1 bg-neutral-800 shrink-0" />

        <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 relative bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shadow-2xl min-h-0">
               
               {/* DIFFICULTY & MULTIPLIER BADGES */}
               <div className="absolute top-3 left-3 z-30 flex flex-col gap-1 items-start">
                  
                  {/* TIER BADGE */}
                  <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg border border-black/20 flex items-center gap-1
                    ${tier === 1 ? 'bg-[#00ff80] text-black' : 
                      tier === 2 ? 'bg-yellow-400 text-black' : 
                      'bg-red-500 text-white animate-pulse'}`}>
                      {tier === 1 && <Star className="w-3 h-3 fill-current" />}
                      {tier === 2 && <Shield className="w-3 h-3 fill-current" />}
                      {tier === 3 && <Flame className="w-3 h-3 fill-current" />}
                      {tier === 1 ? 'EASY' : tier === 2 ? 'MED' : 'HARD'}
                  </div>

                  {/* MULTIPLIER CALLOUT (Only for Med/Hard) */}
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