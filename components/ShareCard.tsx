'use client'

import React from 'react'
import { Trophy, Dribbble, Star, Skull, Users, BookOpen, Download, User, Home, ArrowRight, History } from 'lucide-react'

const ShareCard = React.forwardRef<HTMLDivElement, any>((_, ref) => {
    return (
        <div
            ref={ref}
            className="w-[1080px] h-[1920px] flex flex-col items-center p-12 overflow-hidden relative"
            style={{
                backgroundColor: '#0a0a0a',
                color: '#ffffff',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}
        >
            {/* Top Navigation Row Mockup */}
            <div className="w-full flex justify-between px-8 mt-12 mb-16 relative z-10">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(23, 23, 23, 0.8)', border: '2px solid #262626' }}>
                    <Home className="w-10 h-10" style={{ color: '#a3a3a3' }} />
                </div>
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(23, 23, 23, 0.8)', border: '2px solid #262626' }}>
                    <User className="w-10 h-10" style={{ color: '#a3a3a3' }} />
                </div>
            </div>

            {/* HEADER / LOGO SECTION */}
            <div className="flex flex-col items-center gap-6 mb-16 relative z-10 text-center">
                <Trophy
                    className="w-40 h-40"
                    style={{ color: '#fbbf24' }}
                />
                <div className="space-y-4 px-4">
                    <h1
                        className="text-[100px] font-black italic uppercase tracking-tighter leading-none whitespace-nowrap"
                        style={{ color: '#ffffff' }}
                    >
                        Saturday To Sunday
                    </h1>
                    <p className="text-3xl font-bold uppercase tracking-[0.2em]" style={{ color: '#737373' }}>
                        Guess the college. Beat your friends.
                    </p>
                </div>
            </div>

            {/* CONTENT STACK */}
            <div className="w-full max-w-[900px] flex flex-col gap-8 relative z-10">

                {/* SURVIVAL MODE CARD */}
                <div
                    className="w-full rounded-[50px] p-10 flex items-center justify-between border-4"
                    style={{
                        background: 'linear-gradient(90deg, rgba(127, 29, 29, 0.4), rgba(124, 45, 18, 0.4))',
                        borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                >
                    <div className="flex items-center gap-8">
                        <div
                            className="p-6 rounded-3xl border-4"
                            style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                borderColor: 'rgba(239, 68, 68, 0.3)'
                            }}
                        >
                            <Skull className="w-14 h-14" style={{ color: '#ef4444' }} />
                        </div>
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none" style={{ color: '#ffffff' }}>
                                    Survival Mode
                                </h2>
                                <span
                                    className="text-xl font-black px-4 py-1 rounded-lg uppercase"
                                    style={{ backgroundColor: 'rgba(127, 29, 29, 0.8)', color: '#ef4444', border: '1px solid #ef4444' }}
                                >
                                    Live
                                </span>
                            </div>
                            <p className="text-2xl font-bold uppercase tracking-widest" style={{ color: '#ef4444' }}>
                                5 Days. <span style={{ color: '#ffffff' }}>14 Registered.</span> Join Now.
                            </p>
                        </div>
                    </div>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white">
                        <ArrowRight className="w-10 h-10" style={{ color: '#000000' }} />
                    </div>
                </div>

                {/* DUAL MODE GRID */}
                <div className="grid grid-cols-2 gap-8 h-80">
                    {/* FOOTBALL */}
                    <div
                        className="rounded-[60px] p-1 flex flex-col"
                        style={{
                            background: 'linear-gradient(135deg, #052e16, #064e3b)',
                            border: '4px solid rgba(16, 185, 129, 0.3)'
                        }}
                    >
                        <div
                            className="rounded-[55px] p-8 flex flex-col items-center justify-center gap-4 text-center flex-1"
                            style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
                        >
                            <div
                                className="p-6 rounded-full border-4"
                                style={{
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    borderColor: 'rgba(16, 185, 129, 0.2)'
                                }}
                            >
                                <Star className="w-12 h-12" style={{ color: '#00ff80' }} />
                            </div>
                            <div>
                                <div className="text-2xl font-black uppercase tracking-widest mb-1" style={{ color: '#00ff80' }}>
                                    Play Daily
                                </div>
                                <div className="text-5xl font-black italic uppercase tracking-tighter" style={{ color: '#ffffff' }}>
                                    Football
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BASKETBALL */}
                    <div
                        className="rounded-[60px] p-1 flex flex-col"
                        style={{
                            background: 'linear-gradient(135deg, #451a03, #78350f)',
                            border: '4px solid rgba(245, 158, 11, 0.3)'
                        }}
                    >
                        <div
                            className="rounded-[55px] p-8 flex flex-col items-center justify-center gap-4 text-center flex-1"
                            style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)' }}
                        >
                            <div
                                className="p-6 rounded-full border-4"
                                style={{
                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                    borderColor: 'rgba(245, 158, 11, 0.2)'
                                }}
                            >
                                <Dribbble className="w-12 h-12" style={{ color: '#f59e0b' }} />
                            </div>
                            <div>
                                <div className="text-2xl font-black uppercase tracking-widest mb-1" style={{ color: '#f59e0b' }}>
                                    Play Daily
                                </div>
                                <div className="text-5xl font-black italic uppercase tracking-tighter" style={{ color: '#ffffff' }}>
                                    Basketball
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DAILY RECAP CARD */}
                <div
                    className="w-full rounded-[45px] p-10 flex items-center justify-between border-4"
                    style={{
                        background: 'linear-gradient(90deg, rgba(69, 26, 3, 0.3), rgba(120, 53, 15, 0.3))',
                        borderColor: 'rgba(245, 158, 11, 0.2)'
                    }}
                >
                    <div className="flex items-center gap-8">
                        <div
                            className="p-6 rounded-3xl border-4"
                            style={{
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                borderColor: 'rgba(245, 158, 11, 0.2)'
                            }}
                        >
                            <History className="w-12 h-12" style={{ color: '#fbbf24' }} />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-1" style={{ color: '#ffffff' }}>
                                Daily Recap
                            </h2>
                            <p className="text-xl font-bold uppercase tracking-widest" style={{ color: '#fbbf24' }}>
                                Yesterday's Legends
                            </p>
                        </div>
                    </div>
                    <div className="px-8 py-4 rounded-xl font-black uppercase tracking-tight text-xl" style={{ backgroundColor: '#fbbf24', color: '#000000' }}>
                        View
                    </div>
                </div>

                {/* BOTTOM TRIPLE GRID */}
                <div className="grid grid-cols-3 gap-6 h-64">
                    <div className="rounded-[45px] flex flex-col items-center justify-center gap-4 bg-neutral-900/50 border-4 border-neutral-800/50" style={{ backgroundColor: '#1c1917', borderColor: '#403d39' }}>
                        <Trophy className="w-16 h-16" style={{ color: '#facc15' }} />
                        <span className="text-2xl font-black uppercase tracking-widest" style={{ color: '#facc15' }}>Ranks</span>
                    </div>
                    <div className="rounded-[45px] flex flex-col items-center justify-center gap-4 bg-neutral-900/50 border-4 border-neutral-800/50" style={{ backgroundColor: '#0c4a6e', borderColor: '#0369a1' }}>
                        <Users className="w-16 h-16" style={{ color: '#38bdf8' }} />
                        <span className="text-2xl font-black uppercase tracking-widest" style={{ color: '#38bdf8' }}>Squads</span>
                    </div>
                    <div className="rounded-[45px] flex flex-col items-center justify-center gap-4 bg-neutral-900/50 border-4 border-neutral-800/50" style={{ backgroundColor: '#4c1d95', borderColor: '#6d28d9' }}>
                        <Trophy className="w-16 h-16" style={{ color: '#a855f7' }} />
                        <span className="text-2xl font-black uppercase tracking-widest" style={{ color: '#a855f7' }}>Awards</span>
                    </div>
                </div>

                {/* BOTTOM BUTTON BOXES */}
                <div className="flex flex-col gap-6 mt-4">
                    <div
                        className="w-full h-24 rounded-[30px] border-4 flex items-center justify-center gap-4"
                        style={{ backgroundColor: 'rgba(6, 78, 59, 0.2)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                    >
                        <BookOpen className="w-10 h-10" style={{ color: '#00ff80' }} />
                        <span className="text-3xl font-black uppercase tracking-widest" style={{ color: '#00ff80' }}>How to Play & Guides</span>
                    </div>
                    <div
                        className="w-full h-24 rounded-[30px] border-4 flex items-center justify-center gap-4"
                        style={{ backgroundColor: 'rgba(23, 23, 23, 0.5)', borderColor: 'rgba(64, 64, 64, 0.3)' }}
                    >
                        <Download className="w-10 h-10" style={{ color: '#a3a3a3' }} />
                        <span className="text-3xl font-black uppercase tracking-widest" style={{ color: '#a3a3a3' }}>Install App</span>
                    </div>
                </div>
            </div>

            {/* Subtle Footer branding */}
            <div className="absolute bottom-12 flex flex-col items-center gap-4">
                <p className="text-2xl font-bold uppercase tracking-widest" style={{ color: '#404040' }}>playsaturdaytosunday.com</p>
                <div className="flex gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: '#fbbf24', opacity: (i + 1) * 0.1 }} />
                    ))}
                </div>
            </div>
        </div>
    )
})

ShareCard.displayName = 'ShareCard'

export default ShareCard
