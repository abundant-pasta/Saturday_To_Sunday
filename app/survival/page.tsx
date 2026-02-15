import { createClient } from '@/utils/supabase/server'
import SurvivalSignup from '@/components/SurvivalSignup'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Trophy, Users, Clock, AlertTriangle, ArrowLeft, Skull, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function SurvivalPage() {
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

    // Fetch total participant count
    let participantCount = 0
    if (tournament) {
        const { count } = await supabase
            .from('survival_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id)
        participantCount = count || 0
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
                    <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-neutral-500 drop-shadow-sm">
                        Survival<br /><span className="text-red-600 text-6xl md:text-7xl">Mode</span>
                    </h1>
                    <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest">
                        10 Days. One Survivor. No Mercy.
                    </p>
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

                            {user ? (
                                <SurvivalSignup tournamentId={tournament.id} isJoined={isJoined} />
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

                {/* RULES GRID */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Rule 1 */}
                    <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 flex flex-col items-center text-center gap-2 hover:bg-neutral-900 transition-colors group">
                        <Flame className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" />
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-white mb-1">The Purge</h3>
                            <p className="text-[10px] text-neutral-500 font-medium leading-tight">
                                Bottom <span className="text-orange-400 font-bold">25%</span> eliminated daily at midnight.
                            </p>
                        </div>
                    </div>

                    {/* Rule 2 */}
                    <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 flex flex-col items-center text-center gap-2 hover:bg-neutral-900 transition-colors group">
                        <Clock className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-white mb-1">Speed Kills</h3>
                            <p className="text-[10px] text-neutral-500 font-medium leading-tight">
                                Ties broken by <span className="text-blue-400 font-bold">time</span>. Submit early to survive.
                            </p>
                        </div>
                    </div>

                    {/* Rule 3 */}
                    <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 flex flex-col items-center text-center gap-2 hover:bg-neutral-900 transition-colors group">
                        <Users className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-white mb-1">The Gauntlet</h3>
                            <p className="text-[10px] text-neutral-500 font-medium leading-tight">
                                Lasts <span className="text-purple-400 font-bold">10 Days</span>. Field shrinks nightly.
                            </p>
                        </div>
                    </div>

                    {/* Rule 4 */}
                    <div className="bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 flex flex-col items-center text-center gap-2 hover:bg-neutral-900 transition-colors group">
                        <Trophy className="w-6 h-6 text-yellow-500 group-hover:scale-110 transition-transform" />
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-white mb-1">Glory</h3>
                            <p className="text-[10px] text-neutral-500 font-medium leading-tight">
                                Be the last one standing to claim the crown.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
