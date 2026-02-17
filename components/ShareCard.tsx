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
            className="w-[1080px] h-[1920px] flex flex-col items-center justify-between p-20 overflow-hidden relative"
            style={{
                backgroundColor: '#000000',
                border: `20px solid ${isFootball ? '#00ff80' : '#f59e0b'}`,
                color: '#ffffff',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}
        >
            {/* Background Glow (Simpler than radial-gradient for capture) */}
            <div
                className={`absolute top-0 left-0 w-full h-[800px] opacity-20 blur-[120px]`}
                style={{ backgroundColor: isFootball ? '#00ff80' : '#f59e0b' }}
            />

            {/* Top Logo Section */}
            <div className="flex flex-col items-center gap-6 mt-10 relative z-10 text-center">
                <Trophy
                    className="w-36 h-36"
                    style={{ color: isFootball ? '#00ff80' : '#f59e0b' }}
                />
                <h1
                    className="text-8xl font-black italic uppercase tracking-tighter leading-none"
                    style={{ color: '#ffffff' }}
                >
                    Saturday<br />To Sunday
                </h1>
            </div>

            {/* Main Score Content */}
            <div className="w-full flex flex-col items-center gap-12 relative z-10">
                <div className="flex flex-col items-center">
                    <span
                        className="text-3xl font-black uppercase tracking-[0.4em] mb-4"
                        style={{ color: '#737373' }}
                    >
                        Daily Challenge Result
                    </span>
                    <div
                        className="h-1 w-32 rounded-full"
                        style={{ backgroundColor: '#262626' }}
                    />
                </div>

                <div className="relative">
                    <div
                        className={`absolute -inset-10 blur-3xl opacity-30`}
                        style={{ backgroundColor: isFootball ? '#00ff80' : '#f59e0b' }}
                    />
                    <div
                        className="relative text-[280px] font-black italic uppercase tracking-tighter leading-none"
                        style={{ color: '#ffffff' }}
                    >
                        {score.toLocaleString()}
                    </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div
                        className={`px-10 py-5 rounded-2xl border-4`}
                        style={{
                            borderColor: isFootball ? '#00ff80' : '#f59e0b',
                            backgroundColor: isFootball ? 'rgba(6, 78, 59, 0.3)' : 'rgba(120, 53, 15, 0.3)'
                        }}
                    >
                        <div
                            className={`text-6xl font-black italic uppercase tracking-tight`}
                            style={{ color: isFootball ? '#00ff80' : '#fbbf24' }} // amber-400
                        >
                            {rankTitle}
                        </div>
                    </div>
                    <div
                        className="text-4xl font-bold uppercase tracking-widest flex items-center gap-4"
                        style={{ color: '#a3a3a3' }}
                    >
                        {isFootball ? <Star className="w-10 h-10 fill-current" /> : <Dribbble className="w-10 h-10" />}
                        {sport} Mode • {gameDate}
                    </div>
                </div>
            </div>

            {/* Footer / Call to Action */}
            <div
                className="w-full rounded-[50px] border p-16 flex flex-col items-center gap-8 mb-10 relative z-10"
                style={{
                    backgroundColor: 'rgba(23, 23, 23, 0.5)',
                    borderColor: '#262626'
                }}
            >
                <div className="flex flex-col items-center gap-2">
                    <span
                        className="text-4xl font-black uppercase tracking-widest"
                        style={{ color: '#ffffff' }}
                    >
                        Can you beat my score?
                    </span>
                    <span
                        className="text-2xl font-bold"
                        style={{ color: '#a3a3a3' }}
                    >
                        Play daily at playsaturdaytosunday.com
                    </span>
                </div>

                {/* Visual Accent */}
                <div className="flex gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-3 h-3 rounded-full`}
                            style={{
                                backgroundColor: isFootball ? '#00ff80' : '#f59e0b',
                                opacity: (i + 1) * 0.2
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
})

ShareCard.displayName = 'ShareCard'

export default ShareCard
