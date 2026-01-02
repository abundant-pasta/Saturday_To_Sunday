'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, User, Clock, Check } from 'lucide-react'

// This component handles its own loading state.
// When the parent changes the 'key', this entire component is destroyed and rebuilt.
export default function PlayerCard({ 
    player, 
    hasAnswered, 
    result, 
    potentialPoints 
}: { 
    player: any, 
    hasAnswered: boolean, 
    result: 'correct' | 'wrong' | null, 
    potentialPoints: number 
}) {
  // Always start as NOT ready when this component is first mounted
  const [isReady, setIsReady] = useState(false)

  return (
    <Card className="w-full bg-white text-slate-900 overflow-hidden shadow-2xl relative border-0 h-[260px] flex flex-col justify-center animate-in fade-in duration-500">
      
      {/* --- HUD (Points / Result) --- */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-10">
        {/* POINTS BADGE */}
        <div className={`text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm transition-all duration-300
            ${hasAnswered
                ? (result === 'correct' ? 'bg-green-600 text-white' : 'bg-red-600 text-white')
                : 'bg-slate-900 text-yellow-400'
            }`}>
            {hasAnswered ? (
                <span className="text-sm">
                    {result === 'correct' ? `+${potentialPoints} PTS` : '+0 PTS'}
                </span>
            ) : (
                <>
                    <Clock className="w-3 h-3" />
                    <span>{potentialPoints} PTS</span>
                </>
            )}
        </div>

        {/* RESULT LABEL */}
        {hasAnswered && (
            <div className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded animate-in zoom-in
                ${result === 'correct' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
                {result === 'correct' ? 'CORRECT' : 'WRONG'}
            </div>
        )}
      </div>

      <CardContent className="flex flex-col items-center p-6 space-y-3 h-full justify-center">
         
         {/* 1. IMAGE AREA */}
         <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner bg-slate-50 shrink-0">
           {player.image_url ? (
             <>
               {/* STRATEGY: We render the image with opacity-0 initially.
                  We ONLY switch to opacity-100 when onLoad fires.
                  Because the parent destroys this component on player change,
                  we don't need complex useEffect resets.
               */}
               <Image 
                  src={player.image_url} 
                  alt={player.name} 
                  fill 
                  className={`object-cover transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}
                  priority 
                  onLoad={() => setIsReady(true)}
                  onError={() => setIsReady(true)} // Fallback to show text if image fails
               />
               
               {/* LOADING SPINNER (Visible until isReady is true) */}
               <div className={`absolute inset-0 bg-slate-200 flex items-center justify-center transition-opacity duration-500 ${isReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
               </div>
             </>
           ) : (
             <div className="w-full h-full flex items-center justify-center text-slate-300"><User /></div>
           )}
         </div>

         {/* 2. TEXT AREA (Syncs with Image) */}
         {/* We hide the text too until the image is ready, so it pops in together cleanly */}
         <div className={`text-center space-y-0.5 transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
           <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">{player.name}</h2>
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{player.team} • {player.position}</p>
         </div>
      </CardContent>
    </Card>
  )
}