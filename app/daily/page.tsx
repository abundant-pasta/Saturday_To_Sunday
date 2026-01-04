'use client'

import { useState, useEffect } from 'react'
import { getDailyGame } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Home, Share2, Loader2, Trophy, AlertCircle, CheckCircle2, Pencil } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import IntroScreen from '@/components/IntroScreen'
import AuthButton from '@/components/AuthButton'
import { createBrowserClient } from '@supabase/ssr'
import Leaderboard from '@/components/Leaderboard'

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
                .select('show_avatar, username')
                .eq('id', currentUser.id)
                .single()
            
            if (profile) {
                if (profile.show_avatar !== null) setShowAvatar(profile.show_avatar)
                if (profile.username) setNewUsername(profile.username)
            }
        }

        const savedScore = localStorage.getItem('s2s_today_score')
        const savedDate = localStorage.getItem('s2s_last_played_date')
        const savedResults = localStorage.getItem('s2s_daily_results') 
        
        // Use adjusted date
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

  // 2. THE SAVE LOGIC
  useEffect(() => {
    const saveScore = async () => {
      if (gameState === 'finished' && user && !isSaved && score > 0) {
        // Use adjusted date
        const todayISO = getGameDate() 
        const { error } = await supabase.from('daily_results').upsert({
            user_id: user.id,
            score: score,
            game_date: todayISO,
        }, { onConflict: 'user_id, game_date' })

        if (!error) setIsSaved(true)
      }
    }
    saveScore()
  }, [gameState, user, score, isSaved])

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

  // Timer Logic
  useEffect(() => {
    if (gameState !== 'playing' || showResult || !isImageReady) return
    const timer = setInterval(() => {
      setPotentialPoints((prev) => (prev <= 10 ? 10 : prev - 5))
    }, 500)
    return () => clearInterval(timer)
  }, [gameState, showResult, isImageReady])

  // Guess Logic
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
        // Use adjusted date for storage
        localStorage.setItem('s2s_today_score', newScore.toString())
        localStorage.setItem('s2s_last_played_date', getGameDate())
        localStorage.setItem('s2s_daily_results', JSON.stringify(newResults))
        setGameState('finished')
      }
    }, 1500)
  }

  const handleShare = async () => {
    const squares = results.map(r => r === 'correct' ? '🟩' : '🟥').join('')
    const text = `Saturday to Sunday Daily\n${new Date().toLocaleDateString()}\nScore: ${score}/1000\n\n${squares}\n\nhttps://www.playsaturdaytosunday.com/daily`
    try { await navigator.clipboard.writeText(text); alert('Result copied!'); } catch (err) { console.error(err) }
  }

  if (gameState === 'loading') return <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading...</div>
  if (gameState === 'intro') return <IntroScreen onStart={handleStartGame} />

  // --- GAME OVER SCREEN ---
  if (gameState === 'finished') {
    return (
      <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-4 space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-2">
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto animate-bounce mb-4" />
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Daily Complete</h1>
            <p className="text-slate-400">Come back tomorrow for new players.</p>
        </div>
        
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
        <CardContent className="pt-8 text-center space-y-6">
                
                {/* Score Big Display */}
                <div className="flex flex-col items-center justify-center">
                    <span className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-1">Final Score</span>
                    <div className="text-6xl font-black text-green-400 font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                        {score}<span className="text-2xl text-slate-600">/1000</span>
                    </div>
                </div>

                {/* Visual Squares */}
                <div className="flex justify-center gap-1">
                    {results.map((r, i) => (
                        <div key={i} className={`w-6 h-6 rounded-sm ${r === 'correct' ? 'bg-green-500' : r === 'wrong' ? 'bg-red-500' : 'bg-slate-800'}`} />
                    ))}
                </div>

                {/* --- CLEANER AUTH/SAVE SECTION --- */}
                <div className="mt-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex flex-col items-center gap-3">
                    
                    {isSaved ? (
                        <div className="flex flex-col items-center animate-in zoom-in duration-300 w-full space-y-4">
                             <div className="bg-green-500/10 text-green-400 border border-green-500/20 px-4 py-2 rounded-full flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs font-black uppercase tracking-widest">Score Saved</span>
                             </div>

                             {/* --- USERNAME EDIT SECTION --- */}
                             <div className="w-full p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col gap-2">
                                {!isEditingName ? (
                                     <Button 
                                        variant="outline" 
                                        onClick={() => setIsEditingName(true)}
                                        // UPDATED CLASSNAME: Added bg-transparent and text-slate-300 to fix white box issue
                                        className="w-full h-9 text-xs font-bold border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white uppercase tracking-wider"
                                     >
                                        <Pencil className="w-3 h-3 mr-2" /> Change Display Name
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

                                {/* --- PHOTO TOGGLE --- */}
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Show Photo on Leaderboard</span>
                                    <button 
                                        onClick={toggleAvatar}
                                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${showAvatar ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${showAvatar ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                             </div>
                             
                             {/* Logout */}
                             <div className="scale-90 opacity-60 hover:opacity-100 transition-opacity">
                                <AuthButton />
                             </div>
                        </div>
                    ) : (
                        /* 2. If Not Saved: Show Login Button */
                    <>
                    <AuthButton />
                    <div className="flex flex-col gap-2 items-center">
                        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                            {user ? (
                                <span className="flex items-center gap-2 justify-center">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                                </span>
                            ) : (
                                "Sign in to save this score"
                            )}
                        </p>
                        
                        {/* --- THE TRUST NOTE --- */}
                        {!user && (
                            <p className="text-[10px] text-slate-500 leading-tight max-w-[300px] border-t border-slate-800 pt-2 italic">
                                Note: The login screen shows a generic "supabase.co" URL. This is 100% safe — custom domains just cost $35/mo! 😅
                            </p>
                        )}
                    </div>
                </>
                    )}
                </div>

            </CardContent>
        </Card>

        <Button onClick={handleShare} className="w-full max-w-md h-14 text-xl font-bold bg-indigo-600 hover:bg-indigo-500 transition-all hover:scale-105 shadow-lg">
            <Share2 className="mr-2" /> Share Result
        </Button>

        <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-backwards">
            <Leaderboard currentUserId={user?.id} />
        </div>
        
        <Link href="/" className="text-slate-500 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
            <Home className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    )
  }

  // --- PLAYING SCREEN ---
  const q = questions[currentIndex]
  const isCorrect = selectedOption === q.correct_answer
  
  return (
    <div className="h-[100dvh] bg-slate-950 text-white flex flex-col font-sans overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50 shrink-0">
         <div className="flex items-center gap-2">
             <Link href="/" className="font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 text-lg">S2S</Link>
             <div className="text-xs font-mono text-slate-500 border-l border-slate-700 pl-2 ml-2">SCORE: <span className="text-green-400 font-black text-sm">{score}</span></div>
         </div>
         <div className="text-xs font-mono text-slate-400">{currentIndex + 1}/10</div>
        </header>
        
        <Progress value={((currentIndex) / 10) * 100} className="h-1 bg-slate-800 shrink-0" />

        <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl min-h-0">
               {q.image_url ? (
                 <Image src={q.image_url} alt="Player" fill className={`object-cover transition-opacity duration-500 ${isImageReady ? 'opacity-100' : 'opacity-0'}`} onLoadingComplete={() => setIsImageReady(true)} priority={true} />
               ) : ( <div className="flex items-center justify-center h-full text-slate-600"><AlertCircle /> No Image</div> )}
               {!isImageReady && ( <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-50"><Loader2 className="w-8 h-8 text-slate-500 animate-spin" /></div> )}
                <div className={`transition-opacity duration-500 ${isImageReady ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1 z-20">
                        <div className={`px-3 py-1 rounded-full font-black text-sm md:text-lg shadow-xl border border-black/10 transition-all ${ showResult ? (selectedOption === q.correct_answer ? 'bg-green-600 text-white' : 'bg-red-600 text-white') : 'bg-yellow-400 text-black' }`}>
                            {showResult ? (selectedOption === q.correct_answer ? `+${potentialPoints}` : '+0') : `${potentialPoints}`}
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
                    let btnClass = "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    if (showResult) {
                        if (opt === q.correct_answer) btnClass = "bg-green-600 text-white border-green-500 ring-2 ring-green-400"
                        else if (opt === selectedOption) btnClass = "bg-red-600 text-white border-red-500"
                        else btnClass = "bg-slate-900 text-slate-600 opacity-30"
                    }
                    return ( <Button key={opt} onClick={() => handleGuess(opt)} disabled={showResult || !isImageReady} className={`h-full text-xs md:text-sm font-bold uppercase whitespace-normal leading-tight shadow-lg transition-all ${btnClass}`}> {opt} </Button> )
                })}
            </div>
        </main>
    </div>
  )
}