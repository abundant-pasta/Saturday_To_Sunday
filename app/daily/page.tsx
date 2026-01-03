'use client'

import { useState, useEffect } from 'react'
import { getDailyGame } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Home, Share2, Loader2, Trophy, AlertCircle, Timer } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function DailyGame() {
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'finished'>('loading')
  const [results, setResults] = useState<('correct' | 'wrong' | 'pending')[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  
  // Logic: Points drop from 100
  const [potentialPoints, setPotentialPoints] = useState(100)
  const [isImageReady, setIsImageReady] = useState(false)

  // Load Game
  useEffect(() => {
    const load = async () => {
      const data = await getDailyGame()
      if (data) {
        setQuestions(data)
        setResults(new Array(data.length).fill('pending'))
        setGameState('playing')
      }
    }
    load()
  }, [])

  // Timer: Drops 5 points every 0.5s
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
    
    // SCORING
    if (isCorrect) {
        setScore(s => s + potentialPoints)
    }
    
    const newResults = [...results]
    newResults[currentIndex] = isCorrect ? 'correct' : 'wrong'
    setResults(newResults)

    setShowResult(true)

    // Auto Advance logic
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setSelectedOption(null)
        setShowResult(false)
        setPotentialPoints(100)
        setIsImageReady(false) 
      } else {
        setGameState('finished')
      }
    }, 1500)
  }

  const handleShare = async () => {
    const squares = results.map(r => r === 'correct' ? '🟩' : '🟥').join('')
    const text = `Saturday to Sunday Daily\n${new Date().toLocaleDateString()}\nScore: ${score}/1000\n\n${squares}\n\nhttps://www.playsaturdaytosunday.com/daily`
    
    try {
      await navigator.clipboard.writeText(text)
      alert('Result copied! Paste in group chat.')
    } catch (err) {
      console.error(err)
    }
  }

  if (gameState === 'loading') return <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading Daily Challenge...</div>

  // --- GAME OVER SCREEN ---
  if (gameState === 'finished') {
    return (
      <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-4 space-y-8">
        <Trophy className="w-20 h-20 text-yellow-400 animate-bounce" />
        <div className="text-center space-y-2">
            <h1 className="text-4xl font-black italic uppercase">Daily Complete</h1>
            <p className="text-slate-400">Come back tomorrow for new players.</p>
        </div>
        
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
            <CardContent className="pt-6 text-center space-y-4">
                <div className="flex flex-col items-center justify-center">
                    <span className="text-slate-400 text-xs uppercase tracking-widest font-bold">Final Score</span>
                    <div className="text-6xl font-black text-white tracking-tighter">{score}<span className="text-2xl text-slate-500">/1000</span></div>
                </div>
                <div className="flex justify-center gap-1 pt-2">
                    {results.map((r, i) => (
                        <div key={i} className={`w-6 h-6 rounded-sm ${r === 'correct' ? 'bg-green-500' : 'bg-red-500'}`} />
                    ))}
                </div>
            </CardContent>
        </Card>

        <Button onClick={handleShare} className="w-full max-w-md h-14 text-xl font-bold bg-indigo-600 hover:bg-indigo-500 transition-all hover:scale-105 shadow-lg">
            <Share2 className="mr-2" /> Share Result
        </Button>
        
        <Link href="/" className="text-slate-500 hover:text-white flex items-center gap-2">
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
             <div className="text-xs font-mono text-slate-500 border-l border-slate-700 pl-2 ml-2">SCORE: <span className="text-white font-bold">{score}</span></div>
         </div>
         <div className="flex items-center gap-3">
             <div className="text-xs font-bold text-white flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                <Timer className="w-3 h-3 text-slate-400" />
                <span className={`${potentialPoints <= 30 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>{potentialPoints}</span>
             </div>
             <div className="text-xs font-mono text-slate-400">{currentIndex + 1}/10</div>
         </div>
      </header>
      
      {/* Progress Bar */}
      <Progress value={((currentIndex) / 10) * 100} className="h-1 bg-slate-800 shrink-0" />

      {/* Main Container: Flex Col to fill space */}
      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col gap-4 overflow-hidden">
        
        {/* IMAGE CARD - FLEX 1 to take remaining space */}
        <div className="flex-1 relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl min-h-0">
           
           {/* THE IMAGE - Object Contain to ensure full visibility without overflow */}
           {q.image_url ? (
             <Image 
                src={q.image_url} 
                alt="Player" 
                fill 
                className={`object-cover transition-opacity duration-300 ${isImageReady ? 'opacity-100' : 'opacity-0'}`}
                onLoadingComplete={() => setIsImageReady(true)}
                priority={true}
             />
           ) : (
             <div className="flex items-center justify-center h-full text-slate-600"><AlertCircle /> No Image</div>
           )}
           
           {!isImageReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                </div>
           )}

            {/* --- THE DOUBLE PILL UI --- */}
            <div className="absolute top-3 right-3 flex flex-col items-end gap-1 z-20">
                {/* 1. POINTS PILL */}
                <div className={`px-3 py-1 rounded-full font-black text-sm md:text-lg shadow-xl border border-black/10 transition-all ${
                    showResult 
                        ? (isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white')
                        : 'bg-yellow-400 text-black'
                }`}>
                    {showResult ? (isCorrect ? `+${potentialPoints}` : '+0') : `${potentialPoints}`}
                </div>

                {/* 2. STATUS PILL */}
                {showResult && (
                    <div className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-xl border border-black/10 ${
                        isCorrect ? 'bg-white text-green-700' : 'bg-white text-red-600'
                    }`}>
                        {isCorrect ? 'CORRECT' : 'WRONG'}
                    </div>
                )}
            </div>

           {/* Player Name Overlay */}
           <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-16 z-10">
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter shadow-black drop-shadow-lg leading-none">{q.name}</h2>
           </div>
        </div>

        {/* OPTIONS GRID - Fixed height at bottom */}
        <div className="grid grid-cols-2 gap-2 md:gap-3 shrink-0 h-32 md:h-40">
            {q.options.map((opt: string) => {
                let btnClass = "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                if (showResult) {
                    if (opt === q.correct_answer) btnClass = "bg-green-600 text-white border-green-500 ring-2 ring-green-400"
                    else if (opt === selectedOption) btnClass = "bg-red-600 text-white border-red-500"
                    else btnClass = "bg-slate-900 text-slate-600 opacity-30"
                }

                return (
                    <Button 
                        key={opt} 
                        onClick={() => handleGuess(opt)} 
                        disabled={showResult || !isImageReady} 
                        className={`h-full text-xs md:text-sm font-bold uppercase whitespace-normal leading-tight shadow-lg transition-all ${btnClass}`}
                    >
                        {opt}
                    </Button>
                )
            })}
        </div>
      </main>
    </div>
  )
}