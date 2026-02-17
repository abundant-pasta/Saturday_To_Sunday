'use client'

import React from 'react'
import { Trophy, Dribbble, Star } from 'lucide-react'

interface ShareCardProps {
    score: number
    rankTitle: string
    sport: 'football' | 'basketball'
    gameDate: string
}

const ShareCard = React.forwardRef<HTMLDivElement, ShareCardProps>(({ score, rankTitle, sport, gameDate }, ref) => {
    const isFootball = sport === 'football'

    return (
        <div
            ref={ref}
            className="fixed -left-[2000px] top-0 w-[1080px] h-[1920px] bg-neutral-950 flex flex-col items-center justify-between p-20 font-sans overflow-hidden"
            style={{
                backgroundImage: `radial-gradient(circle at 50% 30%, ${isFootball ? 'rgba(0, 255, 128, 0.15)' : 'rgba(245, 158, 11, 0.15)'} 0%, transparent 70%)`
            }}
        >
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

            {/* Top Logo Section */}
            <div className="flex flex-col items-center gap-6 mt-10">
                <Trophy className={`w-36 h-36 ${isFootball ? 'text-[#00ff80]' : 'text-amber-500'} drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]`} />
                <h1 className="text-8xl font-black italic uppercase tracking-tighter text-white text-center leading-none">
                    Saturday<br />To Sunday
                </h1>
            </div>

            {/* Main Score Content */}
            <div className="w-full flex flex-col items-center gap-12">
                <div className="flex flex-col items-center">
                    <span className="text-3xl font-black uppercase tracking-[0.4em] text-neutral-500 mb-4">
                        Daily Challenge Result
                    </span>
                    <div className="h-1 w-32 bg-neutral-800 rounded-full" />
                </div>

                <div className="relative group">
                    <div className={`absolute -inset-10 blur-3xl opacity-30 ${isFootball ? 'bg-[#00ff80]' : 'bg-amber-500'}`} />
                    <div className="relative text-[280px] font-black italic uppercase tracking-tighter text-white leading-none">
                        {score.toLocaleString()}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className={`px-10 py-5 rounded-2xl border-4 ${isFootball ? 'border-[#00ff80] bg-emerald-950/30' : 'border-amber-500 bg-amber-950/30'}`}>
                        <div className={`text-6xl font-black italic uppercase tracking-tight ${isFootball ? 'text-[#00ff80]' : 'text-amber-400'}`}>
                            {rankTitle}
                        </div>
                    </div>
                    <div className="text-4xl font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-4">
                        {isFootball ? <Star className="w-10 h-10 fill-current" /> : <Dribbble className="w-10 h-10" />}
                        {sport} Mode • {gameDate}
                    </div>
                </div>
            </div>

            {/* Footer / Call to Action */}
            <div className="w-full bg-neutral-900/50 backdrop-blur-md rounded-[50px] border border-neutral-800 p-16 flex flex-col items-center gap-8 mb-10">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl font-black uppercase tracking-widest text-white">Can you beat my score?</span>
                    <span className="text-2xl font-bold text-neutral-400">Play daily at playsaturdaytosunday.com</span>
                </div>

                {/* Visual Accent */}
                <div className="flex gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full ${isFootball ? 'bg-[#00ff80]' : 'bg-amber-500'} opacity-${(i + 1) * 20}`} />
                    ))}
                </div>
            </div>
        </div>
    )
})

ShareCard.displayName = 'ShareCard'

export default ShareCard
