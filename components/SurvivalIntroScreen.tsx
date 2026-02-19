'use client'

import { ClockIcon, PlayIcon, TrophyIcon } from '@heroicons/react/24/outline'
import { GraduationCap, Skull, Sword, Zap } from 'lucide-react'

interface SurvivalIntroScreenProps {
  onStart: () => void
  startsInFuture: boolean
}

export default function SurvivalIntroScreen({ onStart, startsInFuture }: SurvivalIntroScreenProps) {
  return (
    <div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center p-4 animate-in fade-in duration-500 font-sans">
      <div className="w-full max-w-lg bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden border border-neutral-800 ring-1 ring-white/5">
        <div className="relative bg-neutral-900 p-8 text-center border-b border-neutral-800">
          <div className="absolute inset-0 bg-red-500/10 blur-3xl opacity-40 pointer-events-none" />

          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-neutral-800 border border-neutral-700 text-red-500">
              <Skull className="w-8 h-8" />
            </div>
          </div>

          <h1 className="relative text-4xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]">
            The <span className="text-red-500">Gauntlet</span>
          </h1>
          <p className="relative text-neutral-400 font-mono text-xs md:text-sm mt-2 uppercase tracking-widest font-bold">
            10 Players. <span className="text-white">5-Day Survival</span> starts now.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4 group">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-red-500 shadow-lg group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg uppercase tracking-tight">The Assignment</h3>
              <p className="text-sm text-neutral-400 leading-relaxed mt-1">
                Guess where each NBA player played in college. One wrong guess can cost survival points.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 group">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-yellow-400 shadow-lg group-hover:scale-105 transition-transform group-hover:border-yellow-400/50">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg uppercase tracking-tight">Difficulty Multipliers</h3>
              <p className="text-sm text-neutral-400 leading-relaxed mt-1 mb-2">
                Harder players pay more. Fast and accurate wins the day.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 rounded-md text-[10px] font-black bg-neutral-950 text-neutral-400 border border-neutral-800">EASY (1x)</span>
                <span className="px-2 py-1 rounded-md text-[10px] font-black bg-yellow-900/20 text-yellow-500 border border-yellow-500/30">MED (1.5x)</span>
                <span className="px-2 py-1 rounded-md text-[10px] font-black bg-red-900/20 text-red-500 border border-red-500/30">HARD (1.75x)</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 group">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-blue-400 shadow-lg group-hover:scale-105 transition-transform group-hover:border-blue-400/50">
              <ClockIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg uppercase tracking-tight">Same Speed Rules</h3>
              <p className="text-sm text-neutral-400 leading-relaxed mt-1">
                You get a 1-second huddle, then points drain every half second just like normal mode.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 group">
            <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-red-500 shadow-lg group-hover:scale-105 transition-transform">
              <TrophyIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg uppercase tracking-tight">Daily Cut</h3>
              <p className="text-sm text-neutral-400 leading-relaxed mt-1">
                Bottom players are eliminated nightly. Survive all cuts to win the tournament.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-2 bg-neutral-900 border-t border-neutral-800/50">
          <button
            onClick={onStart}
            disabled={startsInFuture}
            className={`w-full group relative flex items-center justify-center gap-3 rounded-xl py-4 text-lg font-black shadow-lg transition-all duration-200 ${
              startsInFuture
                ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed opacity-70'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <span>{startsInFuture ? 'STARTS THURSDAY' : 'ENTER THE GAUNTLET'}</span>
            {!startsInFuture && <PlayIcon className="w-6 h-6 stroke-2 group-hover:translate-x-1 transition-transform fill-current" />}
            {startsInFuture && <Sword className="w-5 h-5" />}
          </button>
          <p className="mt-4 text-center text-[10px] text-neutral-500 uppercase tracking-widest font-bold font-mono">
            One Entry Per Day • Elimination Nightly
          </p>
        </div>
      </div>
    </div>
  )
}
