'use client'

import { useState } from 'react'
import { submitAnswer } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Trophy } from 'lucide-react'
import Image from 'next/image'

type GameViewProps = {
  initialRoom: any
  player: any
}

export default function GameView({ initialRoom, player }: GameViewProps) {
  // THIS LINE WAS LIKELY MISSING OR NAMED WRONG BEFORE:
  const [gameState, setGameState] = useState(initialRoom.game_state) 
  
  const [score, setScore] = useState(initialRoom.score)
  const [round, setRound] = useState(initialRoom.current_round)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null)

  const handleGuess = async (college: string) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    const result = await submitAnswer(initialRoom.id, college)
    
    setLastResult(result.isCorrect ? 'correct' : 'wrong')
    
    if (result.isCorrect) {
      setScore((prev: number) => prev + 1)
    }

    setTimeout(() => {
      setLastResult(null)
      setIsSubmitting(false)
      
      if (result.gameOver) {
        setGameState('finished')
      } else {
        setRound((prev: number) => prev + 1)
      }
    }, 1000)
  }

  // --- GAME OVER SCREEN ---
  if (gameState === 'finished') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in zoom-in duration-300">
        
        <div className="text-center space-y-2">
          <h2 className="text-5xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 drop-shadow-sm">
            Game Over
          </h2>
          <div className="flex items-center justify-center gap-2 text-3xl font-bold text-slate-800">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <span>{score} / 10</span>
          </div>
        </div>

        <div className="flex flex-col w-full max-w-xs gap-3">
          {/* Play Again */}
          <Button 
            onClick={() => window.location.href = '/'} 
            size="lg" 
            className="w-full text-xl font-black italic uppercase bg-blue-600 hover:bg-blue-700 shadow-xl transition-transform hover:-translate-y-1"
          >
            Play Again 🔄
          </Button>

          {/* Main Menu */}
          <Button 
            onClick={() => window.location.href = '/'} 
            variant="outline"
            size="lg" 
            className="w-full text-lg font-bold uppercase tracking-wider border-2 border-slate-300 text-slate-600 hover:bg-slate-100"
          >
            Main Menu 🏠
          </Button>
        </div>
      </div>
    )
  }

  // --- ACTIVE GAME SCREEN ---
  return (
    <div className="max-w-md mx-auto w-full space-y-6">
      <div className="flex items-center justify-between px-4 py-3 bg-white rounded-full shadow-sm border border-slate-100">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-bold text-slate-700 text-lg">{score}</span>
        </div>
        <div className="font-mono font-bold text-slate-400">
          ROUND {round} / 10
        </div>
      </div>

      <Progress value={(round / 10) * 100} className="h-2 bg-slate-100" />

      <Card className="overflow-hidden border-2 border-slate-100 shadow-xl bg-white relative">
        <div className="aspect-square relative bg-slate-50">
           {player.image_url ? (
             <Image 
               src={player.image_url} 
               alt="Player" 
               fill 
               className="object-cover object-top"
               priority
             />
           ) : (
             <div className="flex items-center justify-center h-full text-slate-300">
               No Image
             </div>
           )}
        </div>
        
        <div className="p-4 text-center bg-white border-t border-slate-100">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">
            {player.name}
          </h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            {player.position} • {player.team}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {initialRoom.options.map((option: string) => {
          let btnClass = "bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700"
          
          if (lastResult) {
            if (option === initialRoom.correct_answer) {
               btnClass = "bg-green-500 border-green-600 text-white"
            } else if (lastResult === 'wrong') {
               btnClass = "bg-red-500 border-red-600 text-white opacity-50"
            }
          }

          return (
            <Button
              key={option}
              onClick={() => handleGuess(option)}
              disabled={isSubmitting}
              className={`h-14 text-lg font-bold uppercase tracking-wide shadow-sm transition-all ${btnClass}`}
            >
              {option}
            </Button>
          )
        })}
      </div>
    </div>
  )
}