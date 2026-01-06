'use client'

import { useState, useEffect } from 'react'
import { getDailyGame } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Home, Share2, Loader2, Trophy, AlertCircle, Pencil, Settings, X, Hash } from 'lucide-react'
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

  // 1. Load Game + Check User + Check Profile Settings
  useEffect(() => {
    const load = async () => {
      const data = await getDailyGame()
      if (data) {
        setQuestions(data)
        
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('show_avatar, username, current_streak')
                .eq('id', currentUser.id)
                .single()
            
            if (profile) {
                if (profile.show_avatar !== null) setShowAvatar(profile.show_avatar)
                if (profile.username) setNewUsername(profile.username)
                if (profile.current_streak) setStreak(profile.current_streak)
            }
        }

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
            setIsSaved(true) 
        } else {
            setResults(new Array(data.length).fill('pending'))
            if (!hasSeenIntro) {
                setGameState('intro')
            } else {
                setGameState('playing')
            }
        }
      }
    }
    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 2. THE SAVE LOGIC (Streak Update)
  useEffect(() => {
    const saveScore = async () => {
      if (gameState === 'finished' && user && !isSaved && score > 0) {
        const todayISO = getGameDate() 
        
        // A. Upsert Score
        const { error: scoreError } = await supabase.from('daily_results').upsert({
            user_id: user.id,
            score: score,
            game_date: todayISO,
        }, { onConflict: 'user_id, game_date' })

        if (scoreError) {
            console.error("Error saving score", scoreError)
            return
        }

        // B. Update Profile (Streak Logic)
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
        
        setIsSaved(true)
      }
    }
    saveScore()
  }, [gameState, user, score, isSaved])

  // 3. RANK FETCH LOGIC
  useEffect(() => {
    const fetchRank = async () => {
        if (gameState === 'finished' && score > 0) {
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

  useEffect(() => {
    if (gameState !== 'playing' || showResult || !isImageReady) return
    const timer = setInterval(() => {
      setPotentialPoints((prev) => (prev <= 10 ? 10 : prev - 5))
    }, 500)
    return () => clearInterval(timer)
  }, [gameState, showResult, isImageReady])

  const handleGuess = (option: string) => {
    if (showResult) return

    setSelectedOption(option)
    const currentQ = questions[currentIndex]
    const isCorrect = option === currentQ.correct_answer
    
    let newScore = score
    if (isCorrect) {
        newScore = score + potentialPoints
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
    // Formatted Date: 1/5/2026
    const dateStr = new Date(Date.now() - 6 * 60 * 60 * 1000).toLocaleDateString()
    
    const streakText = streak > 1 ? `🔥 ${streak}` : ''
    
    // --- UPDATED SHARE TEXT FORMAT ---
    const text = `Saturday to Sunday Daily Challenge\n${dateStr}\nScore: ${score}/1000 ${streakText}\n\n${squares}\n\nCan you beat me? Try here:\nhttps://www.playsaturdaytosunday.com/daily`
  
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

  if (gameState === 'loading') return <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading...</div>
  if (gameState === 'intro') return <IntroScreen onStart={handleStartGame} />

  // --- GAME OVER SCREEN ---
  if (gameState === 'finished') {
    return (
      <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-4 space-y-4 animate-in fade-in duration-500">
        
        <div className="text-center space-y-2 mb-2">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto animate-bounce mb-2" />
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Daily Complete</h1>
            <p className="text-slate-400 text-sm">Come back tomorrow for new players.</p>
        </div>
        
        {/* --- MAIN SCORE CARD --- */}
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl relative overflow-hidden">
        <CardContent className="pt-8 pb-6 px-6 text-center space-y-6 relative">
                
                {/* SETTINGS TOGGLE */}
                {user && (
                  <div className="absolute top-3 right-3 z-10">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowProfileSettings(!showProfileSettings)}
                      className="text-slate-500 hover:text-white hover:bg-slate-800 rounded-full h-8 w-8"
                    >
                      {showProfileSettings ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                    </Button>
                  </div>
                )}

                {/* --- SCORE + STATS ROW --- */}
                <div className="flex flex-col items-center justify-center gap-2">
                    {/* Main Score */}
                    <div className="flex flex-col items-center">
                        <span className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-1">Final Score</span>
                        <div className="text-6xl font-black text-green-400 font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(74,222,128,0.5)] leading-none">
                            {score}<span className="text-2xl text-slate-600">/1000</span>
                        </div>
                    </div>

                    {/* STATS ROW */}
                    {isSaved && (
                         <div className="flex items-center gap-2 mt-2 animate-in zoom-in duration-500 delay-200">
                             
                             {/* RANK BADGE */}
                             <div className="bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-md flex items-center gap-2 h-9">
                                <Hash className="w-3.5 h-3.5 text-blue-400" />
                                <div className="flex items-baseline gap-1 leading-none">
                                    <span className="text-sm font-black text-slate-200">
                                        {myRank ? myRank : '-'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500">
                                        / {totalPlayers}
                                    </span>
                                </div>
                             </div>

                             {/* STREAK BADGE */}
                             {streak > 0 && (
                                <div className={`px-3 py-1.5 rounded-md flex items-center gap-2 border h-9 ${streak > 1 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-slate-800/80 border-slate-700'}`}>
                                    <span className="text-sm">🔥</span>
                                    <div className="flex items-baseline gap-1 leading-none">
                                        <span className={`text-sm font-black ${streak > 1 ? 'text-orange-400' : 'text-slate-200'}`}>
                                            {streak}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase text-slate-500">Day Streak</span>
                                    </div>
                                </div>
                             )}
                         </div>
                    )}
                </div>

                {/* Visual Squares */}
                <div className="flex justify-center gap-1">
                    {results.map((r, i) => (
                        <div key={i} className={`w-6 h-6 rounded-sm ${r === 'correct' ? 'bg-green-500' : r === 'wrong' ? 'bg-red-500' : 'bg-slate-800'}`} />
                    ))}
                </div>

                {/* --- PROFILE / LOGIN SECTION --- */}
                <div className="flex flex-col items-center gap-3 w-full">
                    {isSaved ? (
                        <>
                           {showProfileSettings && (
                             <div className="w-full mt-2 p-4 bg-slate-950/50 rounded-xl border border-slate-800 animate-in slide-in-from-top-2 fade-in">
                                 <div className="flex flex-col gap-3">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Profile Settings</h3>
                                    {!isEditingName ? (
                                         <Button 
                                            variant="outline" 
                                            onClick={() => setIsEditingName(true)}
                                            className="w-full h-9 text-xs font-bold border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white uppercase tracking-wider justify-between"
                                         >
                                            <span>Display Name</span>
                                            <div className="flex items-center gap-2 text-slate-500">
                                              <span>{newUsername || user.email?.split('@')[0]}</span>
                                              <Pencil className="w-3 h-3" />
                                            </div>
                                         </Button>
                                    ) : (
                                         <div className="flex items-center gap-2 w-full">
                                            <input 
                                                type="text" 
                                                placeholder="Enter username"
                                                className="bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2 rounded w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                value={newUsername}
                                                onChange={(e) => setNewUsername(e.target.value)}
                                            />
                                            <Button onClick={handleUpdateName} size="sm" className="h-9 px-4 font-bold bg-indigo-600 hover:bg-indigo-500">
                                                Save
                                            </Button>
                                         </div>
                                    )}
                                    <div className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded border border-slate-700">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Show Photo</span>
                                        <button 
                                            onClick={toggleAvatar}
                                            className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${showAvatar ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${showAvatar ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                    <AuthButton />
                                 </div>
                             </div>
                           )}
                        </>
                    ) : (
                    <div className="mt-2 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 w-full flex flex-col items-center gap-3">
                        <AuthButton />
                        <div className="flex flex-col gap-1 items-center">
                            <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                                {user ? (
                                    <span className="flex items-center gap-2 justify-center">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                                    </span>
                                ) : (
                                    "Sign in to save this score"
                                )}
                            </p>
                        </div>
                    </div>
                    )}
                </div>

                {/* --- SHARE BUTTON (MOVED INSIDE CARD) --- */}
                {!showProfileSettings && (
                  <div className="pt-2 w-full animate-in slide-in-from-bottom-2 fade-in">
                    <Button onClick={handleShare} className="w-full h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/20">
                        <Share2 className="mr-2 w-5 h-5" /> Share Result
                    </Button>
                  </div>
                )}

            </CardContent>
        </Card>

        {/* --- BOTTOM ACTIONS --- */}
        {!showProfileSettings && (
          <div className="w-full max-w-md space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center">
                <InstallPWA />
            </div>

            <Leaderboard 
                currentUserId={user?.id} 
                key={isSaved ? `saved-${user?.id}` : 'unsaved'} 
            />
          </div>
        )}
        
        <Link href="/" className="text-slate-500 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-widest pt-4 pb-8">
            <Home className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    )
  }
}