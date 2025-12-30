'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Loader2, Timer } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Player = {
  id: number
  name: string
  team: string
  position: string
  college: string
  image_url: string
}

export default function GameView({ 
  playerId, 
  onGuess 
}: { 
  playerId: number, 
  onGuess: (isCorrect: boolean, points: number) => void 
}) {
  const [player, setPlayer] = useState<Player | null>(null)
  const [options, setOptions] = useState<string[]>([])
  
  // Game State
  const [answered, setAnswered] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [potentialPoints, setPotentialPoints] = useState(100)

  // --- EFFECT 1: Fetch Data (Runs only when playerId changes) ---
  useEffect(() => {
    let isMounted = true

    async function fetchQuestion() {
      // 1. Reset State
      setAnswered(false)
      setSelected(null)
      setPlayer(null)
      setPotentialPoints(100) 

      // 2. Fetch the Target Player
      const { data: target } = await supabase.from('players').select('*').eq('id', playerId).single()
      if (!target || !isMounted) return

      // 3. Fetch Random Distractors (The Fix)
      // We pick a random "start point" (offset) between 0 and 1000
      // This ensures we get different colleges every time.
      const randomOffset = Math.floor(Math.random() * 1000)
      
      const { data: randomChunk } = await supabase
        .from('players')
        .select('college')
        .neq('college', target.college) // Don't pick the correct answer
        .range(randomOffset, randomOffset + 49) // Grab 50 players to ensure variety

      if (!randomChunk || !isMounted) return

      // Extract just the college names and remove duplicates
      const uniqueColleges = Array.from(new Set(randomChunk.map((p: any) => p.college)))
      
      // Shuffle them and take the first 3
      const distractors = uniqueColleges
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)

      // 4. Combine and Shuffle Options
      const allOptions = [target.college, ...distractors]
      setOptions(allOptions.sort(() => Math.random() - 0.5))
      setPlayer(target)
    }

    fetchQuestion()

    return () => { isMounted = false }
  }, [playerId])

  // --- EFFECT 2: The Timer ---
  useEffect(() => {
    if (!player || answered) return

    const timerId = setInterval(() => {
      setPotentialPoints((prev) => {
        if (prev <= 10) {
          clearInterval(timerId)
          return 10
        }
        return prev - 5
      })
    }, 1000)

    return () => clearInterval(timerId)
  }, [player, answered]) 

  if (!player) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-white" /></div>

  const handleGuess = (college: string) => {
    if (answered) return
    
    setAnswered(true)
    setSelected(college)
    
    const isCorrect = college === player.college
    onGuess(isCorrect, isCorrect ? potentialPoints : 0)
  }

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4">
      
      {/* Score Countdown Bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 mb-6 overflow-hidden relative">
        <div 
          className="h-full bg-yellow-500 transition-all duration-1000 ease-linear"
          style={{ width: `${potentialPoints}%` }}
        />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-2xl mb-6 w-full text-center text-slate-900 relative overflow-hidden">
        <div className="absolute top-2 right-2 bg-slate-900 text-yellow-500 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1">
          <Timer className="w-3 h-3" />
          {potentialPoints} pts
        </div>

        <img 
          src={player.image_url} 
          alt="Player" 
          className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-slate-100 mb-4 bg-slate-200"
        />
        <h2 className="text-2xl font-black uppercase">{player.name}</h2>
        <div className="flex justify-center gap-2 text-sm font-bold text-slate-500 mt-1">
          <span>{player.team}</span>
          <span>•</span>
          <span>{player.position}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full">
        {options.map((college) => {
          let btnColor = "bg-slate-800 hover:bg-slate-700 text-white"
          
          if (answered) {
            if (college === player.college) btnColor = "bg-green-500 text-white"
            else if (college === selected) btnColor = "bg-red-500 text-white"
            else btnColor = "bg-slate-800 opacity-50"
          }

          return (
            <button
              key={college}
              onClick={() => handleGuess(college)}
              disabled={answered}
              className={`p-4 rounded-lg font-bold text-lg transition-all transform active:scale-95 ${btnColor}`}
            >
              {college}
            </button>
          )
        })}
      </div>
    </div>
  )
}