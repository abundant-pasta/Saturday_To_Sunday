'use client'

import { useState, useEffect } from 'react'
import { submitAnswer, startGame, advanceRound } from '@/app/actions'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { User, Home, Loader2, Play, ArrowRight, Trophy, Frown, Medal, Coffee, Twitter } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PlayerCard from './PlayerCard' // Import the new component

const decodeText = (text: string) => {
  if (!text) return ''
  const txt = document.createElement("textarea")
  txt.innerHTML = text
  return txt.value
}

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
  const supabase = createClient()
  
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
  
  // NOTE: We removed isImageReady and useEffects related to images. 
  // That is now handled 100% by <PlayerCard />

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
    if (gameState !== 'playing' || selectedOption || hasAnswered) return // Removed isImageReady check
    const timer = setInterval(() => {
      setPotentialPoints((prev) => (prev <= 10 ? 10 : prev - 5))
    }, 500)
    return () => clearInterval(timer)
  }, [selectedOption, gameState, hasAnswered])

  // --- HANDLERS ---
  const handleGuess = async (college: string) => {
    if (isSubmitting || selectedOption || hasAnswered) return 
    setIsSubmitting(true)
    setSelectedOption(college)
    const isCorrect = college === roomData.correct_answer
    setResult(isCorrect ? 'correct' : 'wrong')
    setHasAnswered(true) 
    await submitAnswer(initialRoom.code, initialParticipant?.id, college, potentialPoints)
    setIsSubmitting(false)
  }

  const handleNextRound = async () => {
    setIsSubmitting(true)
    await advanceRound(initialRoom.code)
    setIsSubmitting(false)
  }

  // 1. LOBBY
  if (gameState === 'waiting') {
    return (
      <div className="flex flex-col items-center min-h-screen bg-slate-950 text-white p-4 space-y-8 pt-20">
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
        {initialParticipant?.is_host ? (
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
    const myRankIndex = participants.findIndex(p => p.id === initialParticipant?.id)
    const myRank = myRankIndex + 1
    const totalPlayers = participants.length
    
    let endMessage = "Good Game!"
    let endSubMessage = "Thanks for playing."
    let icon = <Medal className="w-16 h-16 text-slate-400" />
    let titleColor = "text-slate-200"

    if (myRank === 1) {
        endMessage = "CHAMPION OF THE WORLD!"
        endSubMessage = "You know your ball. Respect."
        icon = <Trophy className="w-20 h-20 text-yellow-400 animate-bounce" />
        titleColor = "text-yellow-400"
    } else if (myRank === totalPlayers && totalPlayers >= 4) {
        endMessage = "DANG... DO YOU EVEN KNOW BALL?"
        endSubMessage = "Last place? Seriously? Go watch some tape."
        icon = <Frown className="w-20 h-20 text-red-500" />
        titleColor = "text-red-500"
    } else {
        endMessage = "Good Effort."
        endSubMessage = `You finished #${myRank}. Not bad, not great.`
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white space-y-8 p-4">
        <div className="text-center space-y-4 animate-in zoom-in duration-500">
            <div className="flex justify-center mb-4">{icon}</div>
            <h1 className={`text-4xl md:text-5xl font-black italic uppercase tracking-tighter ${titleColor}`}>{endMessage}</h1>
            <p className="text-xl text-slate-400 font-medium">{endSubMessage}</p>
        </div>
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 shadow-2xl">
            <CardHeader className="text-center border-b border-slate-800">
                <CardTitle className="text-slate-500 text-xs uppercase tracking-widest">Final Standings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {participants.map((p, i) => (
                    <div key={p.id} className={`flex justify-between items-center p-4 border-b border-slate-800 last:border-0 ${p.id === initialParticipant?.id ? 'bg-blue-900/20' : ''}`}>
                        <div className="flex items-center gap-3">
                            <span className={`font-black text-xl w-6 ${i === 0 ? 'text-yellow-400' : 'text-slate-500'}`}>#{i+1}</span>
                            <span className={`font-bold ${p.id === initialParticipant?.id ? 'text-white' : 'text-slate-300'}`}>{p.name} {p.id === initialParticipant?.id && '(You)'}</span>
                        </div>
                        <span className="font-mono font-bold text-yellow-400">{p.score} pts</span>
                    </div>
                ))}
            </CardContent>
        </Card>
        <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="https://buymeacoffee.com/247highlighter" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-14 bg-[#FFDD00] hover:bg-[#FFEA00] text-slate-900 font-black uppercase rounded-lg shadow-lg transition-all transform hover:scale-105">
                <Coffee className="w-5 h-5" /> Buy me a Coffee
            </a>
            <a href="https://x.com/ClutchBrowser" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-14 bg-black hover:bg-slate-900 text-white border border-slate-800 font-black uppercase rounded-lg shadow-lg transition-all transform hover:scale-105">
                <Twitter className="w-5 h-5 fill-white" /> Follow on X
            </a>
        </div>
        <Button onClick={() => window.location.href = '/'} className="w-full max-w-md h-20 text-2xl font-black italic uppercase bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-700 hover:border-slate-600 transition-all shadow-xl">
            <Home className="w-6 h-6 mr-3 mb-1" /> Back to Home Screen
        </Button>
      </div>
    )
  }

  // 3. PLAYING
  const allAnswered = participants.length > 0 && submissions.length >= participants.length
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="font-mono text-sm tracking-widest text-slate-400">ROOM: <span className="text-white font-bold">{initialRoom.code}</span></div>
        <div className="absolute left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold uppercase text-slate-400">Round {round} / 10</div>
        <Link href="/" className="text-xs font-bold text-slate-500 hover:text-white flex items-center gap-2"><Home className="w-4 h-4" /></Link>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 flex flex-col items-center space-y-4 max-w-xl mx-auto w-full">
          <Progress value={(round / 10) * 100} className="h-2 bg-slate-800 [&>div]:bg-yellow-500" />

          {/* KEY PROP STRATEGY: 
             We pass `key={player.id || round}`. 
             When this changes, React TRASHES the old PlayerCard and builds a new one.
             This forces the new card to start at "Loading: true" every single time.
             No hydration flickering possible.
          */}
          <PlayerCard 
            key={player.id || round} 
            player={player} 
            hasAnswered={hasAnswered} 
            result={result} 
            potentialPoints={potentialPoints} 
          />

          {/* QUAD BOX GRID */}
          <div className="w-full grid grid-cols-2 gap-3 h-40">
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
                  <Button key={option} onClick={() => handleGuess(option)} disabled={hasAnswered || isSubmitting} className={`w-full h-full font-bold uppercase tracking-wide shadow-lg transition-all whitespace-normal leading-tight px-1 ${btnClass} ${getFontSize(decodeText(option))}`}>
                    {decodeText(option)}
                  </Button>
                )
            })}
          </div>
          
          <div className="w-full py-2 min-h-[60px]">
            {hasAnswered ? (
                initialParticipant?.is_host ? (
                    <Button onClick={handleNextRound} disabled={!allAnswered || isSubmitting} className="w-full h-14 text-lg font-black uppercase bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                        {allAnswered ? <>Next Player <ArrowRight className="ml-2" /></> : `Waiting for players (${submissions.length}/${participants.length})...`}
                    </Button>
                ) : (
                    <div className="w-full py-4 text-center text-slate-500 animate-pulse font-mono text-sm border border-slate-800 rounded-lg bg-slate-900/50">
                        Waiting for host to advance round... ({submissions.length}/{participants.length} ready)
                    </div>
                )
            ) : null}
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="w-full lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden sticky top-24">
            <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><User className="w-3 h-3" /> Live Standings</h3>
            </div>
            <div className="p-2 space-y-1">
              {participants.map((p, i) => (
                  <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border ${p.id === initialParticipant?.id ? 'bg-blue-900/20 border-blue-900/50' : 'bg-slate-800/20 border-transparent'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-yellow-500">#{i+1}</span>
                      <span className={`text-sm font-bold ${p.id === initialParticipant?.id ? 'text-blue-200' : 'text-slate-300'}`}>{p.name}</span>
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