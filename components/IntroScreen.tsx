import { ClockIcon, TrophyIcon, PlayIcon } from '@heroicons/react/24/outline';

interface IntroScreenProps {
  onStart: () => void;
}

export default function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800 ring-1 ring-white/5">
        
        {/* Hero Header - Neon Green Gradient */}
        <div className="relative bg-slate-900 p-8 text-center border-b border-slate-800">
          <div className="absolute inset-0 bg-green-500/10 blur-3xl opacity-50 pointer-events-none" />
          <h1 className="relative text-4xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
            Daily <span className="text-green-400">Challenge</span>
          </h1>
          <p className="relative text-slate-400 font-mono text-sm mt-2 uppercase tracking-widest">
            10 Players. Speed counts.
          </p>
        </div>

        {/* Rules Body */}
        <div className="p-6 space-y-8">
            
            {/* Rule 1 */}
            <div className="flex items-start gap-5 group">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-green-400 font-black text-xl group-hover:border-green-500/50 group-hover:text-green-300 transition-colors shadow-lg">1</div>
                <div>
                    <h3 className="font-bold text-white text-lg uppercase tracking-tight">Test Your Knowledge</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mt-1">
                        A player will appear. There will be 4 colleges displayed. Select the correct college as quickly as possible for maximum points.
                    </p>
                </div>
            </div>

            {/* Rule 2 */}
            <div className="flex items-start gap-5 group">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-green-400 group-hover:border-green-500/50 group-hover:text-green-300 transition-colors shadow-lg">
                    <ClockIcon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg uppercase tracking-tight">Speed = Points</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mt-1">
                        Points drop from <span className="font-bold text-green-400">100</span> to <span className="font-bold text-red-500">10</span> based on time. 
                    </p>
                    {/* Visual Bar */}
                    <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full w-3/4 bg-gradient-to-r from-green-500 to-green-900 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    </div>
                </div>
            </div>

            {/* Rule 3 */}
            <div className="flex items-start gap-5 group">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-green-400 group-hover:border-green-500/50 group-hover:text-green-300 transition-colors shadow-lg">
                    <TrophyIcon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-white text-lg uppercase tracking-tight">Perfect Score: 1000</h3>
                    <p className="text-sm text-slate-400 leading-relaxed mt-1">
                        Compete against the global leaderboard. One mistake breaks your perfect streak.
                    </p>
                </div>
            </div>

        </div>

        {/* Footer Action */}
        <div className="p-6 pt-2 bg-slate-900 border-t border-slate-800/50">
          <button 
            onClick={onStart}
            className="w-full group relative flex items-center justify-center gap-3 rounded-xl bg-green-500 hover:bg-green-400 py-4 text-lg font-black text-slate-950 shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <span>START GAME</span>
            <PlayIcon className="w-6 h-6 stroke-2 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="mt-4 text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">
            New Players Daily at 1:00 AM ET
          </p>
        </div>
      </div>
    </div>
  );
}