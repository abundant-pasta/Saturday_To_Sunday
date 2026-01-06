import { ClockIcon, PlayIcon, StarIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { Zap, GraduationCap } from 'lucide-react';

interface IntroScreenProps {
  onStart: () => void;
}

export default function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center p-4 animate-in fade-in duration-500 font-sans">
      <div className="w-full max-w-lg bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden border border-neutral-800 ring-1 ring-white/5">
        
        {/* Hero Header */}
        <div className="relative bg-neutral-900 p-8 text-center border-b border-neutral-800">
          {/* Neon Glow */}
          <div className="absolute inset-0 bg-[#00ff80]/10 blur-3xl opacity-40 pointer-events-none" />
          
          <h1 className="relative text-4xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(0,255,128,0.4)]">
            Daily <span className="text-[#00ff80]">Challenge</span>
          </h1>
          <p className="relative text-neutral-400 font-mono text-xs md:text-sm mt-2 uppercase tracking-widest font-bold">
            10 Players. <span className="text-white">1350 Points</span> on the line.
          </p>
        </div>

        {/* Rules Body */}
        <div className="p-6 space-y-6">
            
            {/* Rule 1: The Concept */}
            <div className="flex items-start gap-4 group">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[#00ff80] shadow-lg group-hover:scale-105 transition-transform group-hover:border-[#00ff80]/50">
                    <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg uppercase tracking-tight">The Assignment</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed mt-1">
                        We show you an NFL player. You tell us where they played on Saturdays. Simple as that.
                    </p>
                </div>
            </div>

            {/* Rule 2: Multipliers */}
            <div className="flex items-start gap-4 group">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-yellow-400 shadow-lg group-hover:scale-105 transition-transform group-hover:border-yellow-400/50">
                    <Zap className="w-6 h-6 fill-current" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg uppercase tracking-tight">Big Plays = Big Points</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed mt-1 mb-2">
                        Stars are standard, but the obscure guys score double.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 rounded-md text-[10px] font-black bg-neutral-950 text-neutral-400 border border-neutral-800">EASY (1x)</span>
                        <span className="px-2 py-1 rounded-md text-[10px] font-black bg-yellow-900/20 text-yellow-500 border border-yellow-500/30">MED (1.5x)</span>
                        <span className="px-2 py-1 rounded-md text-[10px] font-black bg-red-900/20 text-red-500 border border-red-500/30">HARD (2.0x)</span>
                    </div>
                </div>
            </div>

            {/* Rule 3: Speed Logic */}
            <div className="flex items-start gap-4 group">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-blue-400 shadow-lg group-hover:scale-105 transition-transform group-hover:border-blue-400/50">
                    <ClockIcon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg uppercase tracking-tight">Beat the Blitz</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed mt-1">
                        You get a <span className="text-white font-bold">1-second "huddle"</span> to think, then points start draining fast. Don't let the clock run out!
                    </p>
                </div>
            </div>

            {/* Rule 4: Leaderboard (NEW) */}
            <div className="flex items-start gap-4 group">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-purple-400 shadow-lg group-hover:scale-105 transition-transform group-hover:border-purple-400/50">
                    <TrophyIcon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg uppercase tracking-tight">The Standings</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed mt-1">
                        See where you rank against the world. Top players earn their spot on the Daily Leaderboard.
                    </p>
                </div>
            </div>

        </div>

        {/* Footer Action */}
        <div className="p-6 pt-2 bg-neutral-900 border-t border-neutral-800/50">
          <button 
            onClick={onStart}
            className="w-full group relative flex items-center justify-center gap-3 rounded-xl bg-[#00ff80] hover:bg-[#05ff84] py-4 text-lg font-black text-black shadow-[0_0_20px_rgba(0,255,128,0.3)] hover:shadow-[0_0_30px_rgba(0,255,128,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <span>START GAME</span>
            <PlayIcon className="w-6 h-6 stroke-2 group-hover:translate-x-1 transition-transform fill-current" />
          </button>
          <p className="mt-4 text-center text-[10px] text-neutral-500 uppercase tracking-widest font-bold font-mono">
            Good Luck &bull; New Roster Daily
          </p>
        </div>
      </div>
    </div>
  );
}