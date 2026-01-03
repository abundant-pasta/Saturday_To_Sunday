'use client'

import { useState, useEffect } from 'react'
import { submitAnswer, startGame, advanceRound } from '@/app/actions'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { User, Home, Loader2, Play, ArrowRight, Trophy, Frown, Medal, Coffee, Twitter, Share2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

// --- HELPER: Decode Text ---
const decodeText = (text: string) => {
  if (!text) return ''
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const txt = document.createElement("textarea")
      txt.innerHTML = text
      return txt.value
  }
  return text
}

// --- HELPER: Font Sizing ---
const getFontSize = (text: string) => {
  if (text.length > 20) return "text-xs"
  if (text.length > 15) return "text-sm"
  return "text-base"
}

type GameViewProps = {
  initialRoom: any
  player: any
  initialParticipant: any
}

export default function GameView({ initialRoom, player, initialParticipant }: GameViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams() 
  const supabase = createClient()
  
  const playerId = searchParams.get('playerId') || initialParticipant?.id

  const [gameState, setGameState] = useState(initialRoom.game_state) 
  const [round, setRound] = useState(initialRoom.current_round)
  const [roomData, setRoomData] = useState(initialRoom)
  const [participants, setParticipants] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null)
  const [potentialPoints, setPotentialPoints] = useState(100)
  const [hasAnswered, setHasAnswered] = useState(false)
  
  const [isImageReady, setIsImageReady] = useState(false)

  // Determine Host Status
  const myself = participants.find(p => p.id === playerId)
  const isHost = myself?.is_host || initialParticipant?.is_host

  // Reset ready state when player changes
  useEffect(() => {
    setIsImageReady(false)
  }, [player.id])

  // --- POLLING ---
  useEffect(() => {
    const fetchGameData = async () => {
        const { data: r } = await supabase.from('rooms').select('*').eq('id', initialRoom.id).single()
        if (r) {
            if (r.current_round !== round) {
                // Round Changed!
                setRound(r.current_round)
                setRoomData(r)
                setHasAnswered(false)
                setSelectedOption(null)
                setResult(null)
                setPotentialPoints(100)
                setIsSubmitting(false)
                setSubmissions([]) 
                router.refresh() 
            } else {
                setGameState(r.game_state)
                setRoomData(r)
            }
        }
        const { data: p } = await supabase.from('room_participants').select('*').eq('room_id', initialRoom.id).order('score', { ascending: false })
        if (p) setParticipants(p)
        const currentRoundNum = r ? r.current_round : round
        const { data: s } = await supabase.from('round_submissions').select('*').eq('room_id', initialRoom.id).eq('round_number', currentRoundNum)
        if (s) setSubmissions(s)
    }
    const interval = setInterval(fetchGameData, 2000)
    return () => clearInterval(interval)
  }, [round, initialRoom.id, router])

  // --- TIMER ---
  useEffect(() => {
    if (gameState !== 'playing' || selectedOption || hasAnswered || !isImageReady) return 
    const timer = setInterval(() => {
      setPotentialPoints((prev) => (prev <= 10 ? 10 : prev - 5))
    }, 500)
    return () => clearInterval(timer)
  }, [selectedOption, gameState, hasAnswered, isImageReady])

  // --- HANDLERS ---
  const handleGuess = async (college: string) => {
    if (isSubmitting || selectedOption || hasAnswered) return 
    setIsSubmitting(true)
    setSelectedOption(college)
    const isCorrect = college === roomData.correct_answer
    setResult(isCorrect ? 'correct' : 'wrong')
    setHasAnswered(true) 
    await submitAnswer(initialRoom.code, playerId, college, potentialPoints)
    setIsSubmitting(false)
  }

  const handleNextRound = async () => {
    setIsSubmitting(true)
    await advanceRound(initialRoom.code)
    setIsSubmitting(false)
  }

  const handleShare = async () => {
    const myScore = participants.find(p => p.id === playerId)?.score || 0
    const text = `Saturday to Sunday 🏈\nI scored ${myScore} pts.\n\nCan you beat me?\nhttps://www.playsaturdaytosunday.com/`
    try {
      await navigator.clipboard.writeText(text)
      alert('Score copied to clipboard!')
    } catch (err) {
      console.error(err)
    }
  }

  const allAnswered = participants.length > 0 && submissions.length >= participants.length

  // 1. LOBBY
  if (gameState === 'waiting') {
    return (
      <div className="flex flex-col items-center min-h-[100dvh] bg-slate-950 text-white p-4 space-y-8 pt-20">
         <Link href="/" className="absolute top-4 left-4 text-slate-500 hover:text-white"><Home /></Link>
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Lobby</h1>
          <p className="text-slate-400">Share Code: <span className="font-mono text-white font-bold">{initialRoom.code}</span></p>
        </div>
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
            <CardHeader><CardTitle className="text-slate-500 text-xs uppercase">Players Joined</CardTitle></CardHeader>
            <CardContent className="space-y-2">
                {participants.length === 0 && <div className="text-slate-600 italic">Waiting...</div>}
                {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded bg-slate-800/50">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">{p.name[0]}</div>
                        <span className="font-bold">{p.name} {p.is_host && <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded ml-2">HOST</span>}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
        
        {isHost ? (
             <Button size="lg" className="w-full max-w-md h-16 text-xl font-bold uppercase bg-green-600 hover:bg-green-700" onClick={async () => { await startGame(initialRoom.code) }}>
             <Play className="w-6 h-6 mr-2 fill-current" /> Start Game
           </Button>
        ) : (
            <div className="flex items-center gap-2 text-slate-500 animate-pulse"><Loader2 className="w-4 h-4 animate-spin" /> Waiting for host to start...</div>
        )}
      </div>
    )
  }

  // 2. GAME OVER
  if (gameState === 'finished') {
    const myRankIndex = participants.findIndex(p => p.id === playerId)
    const myRank = myRankIndex + 1
    
    let endMessage = "Good Game!"
    let icon = <Medal className="w-16 h-16 text-slate-400" />
    let titleColor = "text-slate-200"

    if (myRank === 1) {
        endMessage = "CHAMPION!"
        icon = <Trophy className="w-20 h-20 text-yellow-400 animate-bounce" />
        titleColor = "text-yellow-400"
    } else if (myRank === participants.length && participants.length > 1) {
        endMessage = "Better Luck Next Time"
        icon = <Frown className="w-20 h-20 text-red-500" />
        titleColor = "text-red-500"
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-950 text-white space-y-6 p-4">
        <div className="text-center space-y-4 animate-in zoom-in duration-500">
            <div className="flex justify-center mb-2">{icon}</div>
            <h1 className={`text-4xl md:text-5xl font-black italic uppercase tracking-tighter ${titleColor}`}>{endMessage}</h1>
        </div>
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
            <CardHeader className="text-center border-b border-slate-800">
                <CardTitle className="text-slate-500 text-xs uppercase tracking-widest">Final Standings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {participants.map((p, i) => (
                    <div key={p.id} className={`flex justify-between items-center p-3 md:p-4 border-b border-slate-800 last:border-0 ${p.id === playerId ? 'bg-blue-900/20' : ''}`}>
                        <div className="flex items-center gap-3">
                            <span className={`font-black text-xl w-6 ${i === 0 ? 'text-yellow-400' : 'text-slate-500'}`}>#{i+1}</span>
                            <span className={`font-bold ${p.id === playerId ? 'text-white' : 'text-slate-300'}`}>{p.name} {p.id === playerId && '(You)'}</span>
                        </div>
                        <span className="font-mono font-bold text-yellow-400">{p.score} pts</span>
                    </div>
                ))}
            </CardContent>
        </Card>

        <Button onClick={handleShare} className="w-full max-w-md h-14 md:h-16 text-lg md:text-xl font-black uppercase bg-indigo-600 hover:bg-indigo-500">
            <Share2 className="w-5 h-5 md:w-6 md:h-6 mr-2" /> Share Score
        </Button>

        <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-3">
            <a href="https://buymeacoffee.com/247highlighter" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-12 md:h-14 bg-[#FFDD00] hover:bg-[#FFEA00] text-slate-900 font-black uppercase rounded-lg shadow-lg">
                <Coffee className="w-4 h-4 md:w-5 md:h-5" /> Buy me a Coffee
            </a>
            <a href="https://x.com/ClutchBrowser" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-12 md:h-14 bg-black hover:bg-slate-900 text-white border border-slate-800 font-black uppercase rounded-lg shadow-lg">
                <Twitter className="w-4 h-4 md:w-5 md:h-5 fill-white" /> Follow on X
            </a>
        </div>
        
        {/* Chrome Extensions Cross-Sell */}
        <div className="w-full max-w-md pt-6 border-t border-slate-800/50">
            <p className="text-center text-slate-500 text-[10px] uppercase tracking-widest mb-3 font-bold">More by ClutchBrowser</p>
            <div className="grid grid-cols-2 gap-3">
                <a href="https://chromewebstore.google.com/detail/247sports-highlighter/mddcidpppapjmbhjhpenalkoedbobano" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors group">
                    <span className="text-green-400 font-black text-xs md:text-sm group-hover:underline">247 Highlighter</span>
                    <span className="text-slate-500 text-[10px]">Chrome Extension</span>
                </a>
                <a href="https://chromewebstore.google.com/detail/score-shield-espn-blocker/lcldoddeckephdndinmdneblghpfeaih" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors group">
                    <span className="text-red-400 font-black text-xs md:text-sm group-hover:underline">Score Shield</span>
                    <span className="text-slate-500 text-[10px]">Chrome Extension</span>
                </a>
            </div>
        </div>

        <Link href="/" className="text-slate-500 hover:text-white flex items-center gap-2"><Home className="w-4 h-4" /> Back to Home</Link>
      </div>
    )
  }

  // 3. PLAYING
  return (
    <div className="h-[100dvh] bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-500 hover:text-white"><Home className="w-4 h-4" /></Link>
            <div className="font-mono text-xs md:text-sm tracking-widest text-slate-400">ROOM: <span className="text-white font-bold">{initialRoom.code}</span></div>
        </div>
        <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] md:text-xs font-bold uppercase text-slate-400">R {round}/10</div>
        </div>
      </header>
      
      {/* Progress Bar */}
      <Progress value={(round / 10) * 100} className="h-1 bg-slate-800 [&>div]:bg-yellow-500 shrink-0" />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        
        {/* GAME AREA - Flex Column to fill space */}
        <div className="lg:col-span-3 flex flex-col h-full gap-4 max-w-md lg:max-w-none mx-auto w-full">

          {/* THE CARD - Flex 1 to take remaining space */}
          <div className="flex-1 relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-2xl min-h-0">
                {/* Image */}
                {player.image_url ? (
                    <Image 
                        src={player.image_url} 
                        alt="Player" 
                        fill 
                        className={`object-cover transition-opacity duration-300 ${isImageReady ? 'opacity-100' : 'opacity-0'}`}
                        onLoadingComplete={() => setIsImageReady(true)}
                        priority
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-600">No Image</div>
                )}

                {!isImageReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                    </div>
                )}

                {/* --- THE DOUBLE PILL UI --- */}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1 z-20">
                    {/* Points Pill */}
                    <div className={`px-3 py-1 rounded-full font-black text-sm md:text-lg shadow-xl border border-black/10 transition-all ${
                        hasAnswered 
                            ? (result === 'correct' ? 'bg-green-600 text-white' : 'bg-red-600 text-white')
                            : 'bg-yellow-400 text-black'
                    }`}>
                        {hasAnswered ? (result === 'correct' ? `+${potentialPoints}` : '+0') : `${potentialPoints}`}
                    </div>

                    {/* Result Pill */}
                    {hasAnswered && (
                        <div className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-widest shadow-xl border border-black/10 ${
                            result === 'correct' ? 'bg-white text-green-700' : 'bg-white text-red-600'
                        }`}>
                            {result === 'correct' ? 'CORRECT' : 'WRONG'}
                        </div>
                    )}
                </div>

                {/* Player Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-16 z-10">
                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter shadow-black drop-shadow-lg leading-none">{player.name}</h2>
                </div>
          </div>

          {/* OPTIONS GRID - Fixed height */}
          <div className="grid grid-cols-2 gap-2 md:gap-3 shrink-0 h-32 md:h-40">
            {roomData.options.map((option: string) => {
                const isSelected = selectedOption === option
                const isCorrectAnswer = option === roomData.correct_answer
                let btnClass = "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700" 
                if (hasAnswered) {
                    if (isSelected) btnClass = isCorrectAnswer ? "bg-green-600 text-white border-green-500 ring-2 ring-green-400" : "bg-red-600 text-white border-red-500 ring-2 ring-red-400"
                    else if (isCorrectAnswer) btnClass = "bg-green-600 text-white border-green-500 opacity-100"
                    else btnClass = "bg-slate-900 text-slate-600 border-slate-800 opacity-40"
                }
                return (
                  <Button key={option} onClick={() => handleGuess(option)} disabled={hasAnswered || isSubmitting || !isImageReady} className={`h-full text-xs md:text-sm font-bold uppercase tracking-wide shadow-lg transition-all whitespace-normal leading-tight px-1 ${btnClass} ${getFontSize(decodeText(option))}`}>
                    {decodeText(option)}
                  </Button>
                )
            })}
          </div>

            {/* Next Button (Host Only) */}
           {hasAnswered && isHost && (
                <div className="w-full shrink-0">
                    <Button onClick={handleNextRound} disabled={!allAnswered || isSubmitting} className="w-full h-12 md:h-14 text-base md:text-lg font-black uppercase bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                        {allAnswered ? <>Next Player <ArrowRight className="ml-2" /></> : `Waiting (${submissions.length}/${participants.length})...`}
                    </Button>
                </div>
            )}
             {hasAnswered && !isHost && (
                 <div className="w-full shrink-0 py-2 text-center text-slate-500 animate-pulse font-mono text-xs border border-slate-800 rounded-lg bg-slate-900/50">
                    Waiting for host...
                </div>
            )}
        </div>

        {/* SIDEBAR (Desktop Only) */}
        <div className="hidden lg:block w-full lg:col-span-1 h-full overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-full">
            <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><User className="w-3 h-3" /> Live Standings</h3>
            </div>
            <div className="p-2 space-y-1">
              {participants.map((p, i) => (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border ${p.id === playerId ? 'bg-blue-900/20 border-blue-900/50' : 'bg-slate-800/20 border-transparent'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-yellow-500">#{i+1}</span>
                      <span className={`text-sm font-bold ${p.id === playerId ? 'text-blue-200' : 'text-slate-300'}`}>{p.name}</span>
                    </div>
                    <span className="text-sm font-mono font-bold text-white">{p.score}</span>
                  </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}