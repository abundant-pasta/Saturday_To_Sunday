import { createClient } from '@/utils/supabase/server'
import SurvivalRankDisplay from '@/components/SurvivalRankDisplay'
import SurvivalSignup from '@/components/SurvivalSignup'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Trophy, Users, Clock, Skull, Flame, Swords, BarChart3, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FLOW_RATIOS = [0.625, 0.375, 0.25, 0.125] as const

function getDayTarget(base: number, day: number) {
    if (day >= 5) return 1
    return Math.max(1, Math.ceil(base * FLOW_RATIOS[day - 1]))
}

export default async function SurvivalPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedSearchParams = await searchParams
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { data: tournaments } = await supabase
        .from('survival_tournaments')
        .select('*')
        .eq('is_active', true)

    const tournament = tournaments && tournaments.length > 0 ? tournaments[0] : null

    let isJoined = false
    if (tournament && user) {
        const { data: participant } = await supabase
            .from('survival_participants')
            .select('id')
            .eq('tournament_id', tournament.id)
            .eq('user_id', user.id)
            .single()
        if (participant) isJoined = true
    }

    const shouldAutoJoin = resolvedSearchParams?.autojoin === '1'
    if (shouldAutoJoin && tournament && user && !isJoined) {
        const { error: joinError } = await supabase
            .from('survival_participants')
            .insert({
                user_id: user.id,
                tournament_id: tournament.id,
                status: 'active'
            })

        // Ignore duplicate join; this can happen if user opens multiple tabs.
        if (!joinError || joinError.code === '23505') {
            redirect('/survival')
        }
    }

    const hasStarted = !!(tournament && new Date(tournament.start_date).getTime() <= Date.now())

    // Fetch total participant count
    let participantCount = 0
    if (tournament) {
        const { count } = await supabase
            .from('survival_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id)
        participantCount = count || 0
    }

    const baseFieldSize = Math.max(1, participantCount)
    const eliminationPlan = [] as Array<{ day: number; start: number; eliminated: number; remaining: number; pct: number }>
    let startOfDay = baseFieldSize
    for (let day = 1; day <= 5; day++) {
        const targetRemaining = getDayTarget(baseFieldSize, day)
        const eliminated = day === 5
            ? Math.max(0, startOfDay - 1)
            : Math.max(0, Math.min(startOfDay - 1, startOfDay - targetRemaining))
        const remaining = Math.max(1, startOfDay - eliminated)
        const pct = startOfDay > 0 ? Math.round((eliminated / startOfDay) * 100) : 0
        eliminationPlan.push({ day, start: startOfDay, eliminated, remaining, pct })
        startOfDay = remaining
    }

    return (
        <div className="min-h-[100dvh] bg-neutral-950 text-white font-sans selection:bg-red-500/30 pt-16">

            <div className="max-w-md mx-auto px-4 pb-12 space-y-8">

                {/* HERO HEADER */}
                <div className="text-center space-y-2 pt-4">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                            <Skull className="w-12 h-12 text-red-500" />
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-neutral-500 drop-shadow-sm">
                        Survival Mode
                    </h1>
                    <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest">
                        5 Days. One Survivor. No Mercy.
                    </p>

                    {/* CURRENT RANK DISPLAY */}
                    {tournament && user && isJoined && (
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-full shadow-xl">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs md:text-sm font-bold text-neutral-300">
                                Current Rank: <span className="text-white font-black"><SurvivalRankDisplay tournamentId={tournament.id} userId={user.id} /></span>
                            </span>
                        </div>
                    )}
                </div>

                {/* MAIN CARD */}
                <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 opacity-50" />

                    {!tournament ? (
                        <div className="text-center py-12 relative z-10">
                            <h3 className="text-xl font-black uppercase text-neutral-400">No Active Event</h3>
                            <p className="text-xs text-neutral-600 font-bold uppercase tracking-widest mt-2">Check back soon</p>
                        </div>
                    ) : (
                        <div className="relative z-10 space-y-6 text-center">
                            <div className="space-y-1">
                                <div className="inline-block px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest mb-2 animate-pulse">
                                    Live Event
                                </div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">{tournament.name}</h2>
                                <p className="text-neutral-400 text-xs font-bold uppercase tracking-wide">
                                    Starts Thursday • <span className="text-red-400">{participantCount} Survivors Joined</span>
                                </p>
                            </div>

                            <Button asChild variant="outline" className="w-full h-10 text-[11px] font-black uppercase tracking-widest border-red-500/40 text-red-300 bg-red-500/5 hover:bg-red-500/10 hover:text-red-200">
                                <Link href="/survival/leaderboard" className="flex items-center justify-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    View Survival Leaderboard
                                </Link>
                            </Button>

                            {user ? (
                                isJoined && hasStarted ? (
                                    <div className="w-full p-6 bg-red-500/10 border border-red-500/30 rounded-3xl flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-500">
                                        <div className="p-3 bg-red-500/20 rounded-full mb-1">
                                            <Swords className="w-8 h-8 text-red-400" />
                                        </div>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-red-400">You Are Registered</h3>
                                        <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">Tournament Started</p>
                                        <Button asChild className="w-full h-12 text-sm font-black uppercase tracking-widest bg-gradient-to-r from-red-700 to-orange-600 hover:from-red-600 hover:to-orange-500 text-white border border-red-400/40">
                                            <Link href="/survival/play">Enter The Gauntlet</Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <SurvivalSignup tournamentId={tournament.id} isJoined={isJoined} />
                                )
                            ) : (
                                <div className="p-6 bg-black/40 rounded-2xl border border-neutral-800">
                                    <p className="mb-4 text-neutral-400 text-xs font-bold uppercase tracking-wide">Login Required</p>
                                    <Link href="/">
                                        <Button className="w-full bg-white text-black font-black uppercase tracking-widest hover:bg-neutral-200 h-10">
                                            Sign In First
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FLOW + RULES */}
                <div className="bg-neutral-900/60 p-5 rounded-3xl border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <TrendingDown className="w-5 h-5 text-red-400" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-red-300">5-Day Elimination Flow</h3>
                    </div>

                    <div className="space-y-2">
                        {eliminationPlan.map((step) => (
                            <div key={step.day} className="bg-black/40 rounded-xl border border-neutral-800 px-3 py-2 flex items-center justify-between">
                                <div className="text-left">
                                    <div className="text-[11px] font-black uppercase tracking-wider text-white">Day {step.day}</div>
                                    <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                                        Start {step.start} • Remain {step.remaining}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-red-400">-{step.eliminated}</div>
                                    <div className="text-[10px] text-red-300 font-bold uppercase tracking-widest">-{step.pct}%</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-black/30 p-3 rounded-xl border border-neutral-800 text-center">
                            <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">Speed Kills</p>
                            <p className="text-[10px] text-neutral-500 font-bold mt-1">Earlier submit wins ties</p>
                        </div>
                        <div className="bg-black/30 p-3 rounded-xl border border-neutral-800 text-center">
                            <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">One Winner</p>
                            <p className="text-[10px] text-neutral-500 font-bold mt-1">Day 5 final survivor</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
