'use client'

import React from 'react'
import { Trophy, Dribbble, Star, Skull } from 'lucide-react'

const ShareCard = React.forwardRef<HTMLDivElement, any>((_, ref) => {
    return (
        <div
            ref={ref}
            className="w-[1080px] h-[1920px] flex flex-col items-center p-20 overflow-hidden relative"
            style={{
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}
        >
            {/* Background Glow */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] blur-[150px]"
                style={{
                    backgroundColor: 'rgba(234, 179, 8, 0.15)',
                    opacity: 0.2
                }}
            />

            {/* HEADER / LOGO SECTION */}
            <div className="flex flex-col items-center gap-10 mt-20 mb-20 relative z-10 text-center">
                <Trophy
                    className="w-48 h-48"
                    style={{ color: '#fbbf24' }}
                />
                <div className="space-y-4">
                    <h1
                        className="text-[100px] font-black italic uppercase tracking-tighter leading-none"
                        style={{ color: '#ffffff' }}
                    >
                        Saturday<br />To Sunday
                    </h1>
                    <p className="text-4xl font-bold uppercase tracking-[0.2em]" style={{ color: '#737373' }}>
                        Guess the college. Beat your friends.
                    </p>
                </div>
            </div>

            {/* CONTENT STACK */}
            <div className="w-full max-w-[800px] flex flex-col gap-10 relative z-10 grow">

                {/* SURVIVAL MODE BANNER */}
                <div
                    className="w-full rounded-[40px] p-12 flex items-center justify-between border-4"
                    style={{
                        background: 'linear-gradient(90deg, rgba(127, 29, 29, 0.4), rgba(124, 45, 18, 0.4))',
                        borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                >
                    <div className="flex items-center gap-10">
                        <div
                            className="p-6 rounded-3xl border-4"
                            style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                borderColor: 'rgba(239, 68, 68, 0.3)'
                            }}
                        >
                            <Skull className="w-16 h-16" style={{ color: '#ef4444' }} />
                        </div>
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-none" style={{ color: '#ffffff' }}>
                                    Survival Mode
                                </h2>
                                <span
                                    className="text-2xl font-black px-4 py-1 rounded uppercase"
                                    style={{ backgroundColor: '#ef4444', color: '#000000' }}
                                >
                                    Live
                                </span>
                            </div>
                            <p className="text-3xl font-bold uppercase tracking-widest" style={{ color: '#a3a3a3' }}>
                                10 Days. One Survivor.
                            </p>
                        </div>
                    </div>
                </div>

                {/* DUAL MODE PREVIEWS */}
                <div className="grid grid-cols-2 gap-10 h-full max-h-[600px]">
                    {/* FOOTBALL */}
                    <div
                        className="rounded-[50px] p-2 flex flex-col"
                        style={{
                            background: 'linear-gradient(135deg, #171717, #064e3b)',
                            border: '4px solid rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        <div
                            className="rounded-[40px] p-10 flex flex-col items-center justify-center gap-6 text-center flex-1"
                            style={{ backgroundColor: 'rgba(23, 23, 23, 0.8)' }}
                        >
                            <div
                                className="p-8 rounded-full border-4"
                                style={{
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    borderColor: 'rgba(16, 185, 129, 0.2)'
                                }}
                            >
                                <Star className="w-16 h-16" style={{ color: '#00ff80' }} />
                            </div>
                            <div>
                                <div className="text-3xl font-black uppercase tracking-widest mb-2" style={{ color: '#00ff80' }}>
                                    Play Daily
                                </div>
                                <div className="text-6xl font-black italic uppercase tracking-tighter" style={{ color: '#ffffff' }}>
                                    Football
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BASKETBALL */}
                    <div
                        className="rounded-[50px] p-2 flex flex-col"
                        style={{
                            background: 'linear-gradient(135deg, #171717, #78350f)',
                            border: '4px solid rgba(245, 158, 11, 0.3)'
                        }}
                    >
                        <div
                            className="rounded-[40px] p-10 flex flex-col items-center justify-center gap-6 text-center flex-1"
                            style={{ backgroundColor: 'rgba(23, 23, 23, 0.8)' }}
                        >
                            <div
                                className="p-8 rounded-full border-4"
                                style={{
                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                    borderColor: 'rgba(245, 158, 11, 0.2)'
                                }}
                            >
                                <Dribbble className="w-16 h-16" style={{ color: '#f59e0b' }} />
                            </div>
                            <div>
                                <div className="text-3xl font-black uppercase tracking-widest mb-2" style={{ color: '#f59e0b' }}>
                                    Play Daily
                                </div>
                                <div className="text-6xl font-black italic uppercase tracking-tighter" style={{ color: '#ffffff' }}>
                                    Basketball
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CALL TO ACTION */}
            <div
                className="w-full rounded-[60px] border p-20 flex flex-col items-center gap-10 mb-20 relative z-10"
                style={{
                    backgroundColor: 'rgba(23, 23, 23, 0.5)',
                    borderColor: '#262626'
                }}
            >
                <div className="flex flex-col items-center gap-4">
                    <span className="text-6xl font-black uppercase tracking-tighter" style={{ color: '#ffffff' }}>
                        Sunday starts on Saturday.
                    </span>
                    <span className="text-4xl font-bold uppercase tracking-widest" style={{ color: '#a3a3a3' }}>
                        Play now at playsaturdaytosunday.com
                    </span>
                </div>

                <div className="flex gap-10 mt-4">
                    <span className="text-5xl">🏈</span>
                    <span className="text-5xl">🏀</span>
                    <span className="text-5xl">🏆</span>
                </div>
            </div>

            {/* Branding Accent */}
            <div className="absolute bottom-10 flex gap-4">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="w-6 h-6 rounded-full"
                        style={{
                            backgroundColor: '#fbbf24',
                            opacity: (i + 1) * 0.1
                        }}
                    />
                ))}
            </div>
        </div>
    )
})

ShareCard.displayName = 'ShareCard'

export default ShareCard
