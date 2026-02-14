import { createClient } from '@/utils/supabase/server'
import SurvivalSignup from '@/components/SurvivalSignup'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function SurvivalPage() {
    const supabase = await createClient()

    // 1. Get User
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        // Optional: Redirect to login or show different view
        // For now, let's assume public page but signup requires auth (handled by action mostly, but better to show login link here if not authed)
    }

    // 2. Get Active Tournament (or upcoming)
    // We want the one that is currently "active" or starting soon.
    // For now, we take the one with is_active = true, or if none, the latest one?
    // Requirements said "active events".
    const { data: tournaments } = await supabase
        .from('survival_tournaments')
        .select('*')
        .eq('is_active', true)

    // If no active tournament, handle gracefully
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

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
            <div className="max-w-3xl mx-auto space-y-12">

                {/* Header */}
                <div className="space-y-4 text-center">
                    <Link href="/" className="inline-block text-gray-500 hover:text-white mb-4 transition-colors">
                        ← Back to Home
                    </Link>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">
                        SURVIVAL MODE
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-400 font-medium">
                        10 Days. One Survivor. No Mercy.
                    </p>
                </div>

                {/* Main Action Area */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>

                    {!tournament ? (
                        <div className="text-center py-12">
                            <h3 className="text-2xl text-gray-400">No active tournament found.</h3>
                            <p className="text-gray-500 mt-2">Check back later for the next event!</p>
                        </div>
                    ) : (
                        <div className="relative z-10 space-y-8 text-center">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-white">{tournament.name}</h2>
                                <p className="text-orange-400 font-semibold tracking-wide uppercase text-sm">
                                    Starts Thursday
                                </p>
                            </div>

                            {user ? (
                                <SurvivalSignup tournamentId={tournament.id} isJoined={isJoined} />
                            ) : (
                                <div className="p-6 bg-neutral-800 rounded-xl">
                                    <p className="mb-4 text-gray-300">Log in to join the tournament.</p>
                                    <Link href="/login" className="inline-block px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors">
                                        Log In / Sign Up
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Rules Section */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mb-4 text-red-500 text-xl font-bold">
                            1
                        </div>
                        <h3 className="text-xl font-bold mb-2">Daily Elimination</h3>
                        <p className="text-gray-400">
                            Every day at midnight, the bottom <span className="text-white font-bold">25%</span> of players are permanently eliminated. Even one bad day can end your run.
                        </p>
                    </div>

                    <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 text-blue-500 text-xl font-bold">
                            2
                        </div>
                        <h3 className="text-xl font-bold mb-2">Tie-Breaker Rule</h3>
                        <p className="text-gray-400">
                            Tied scores are broken by <span className="text-white font-bold">submission time</span>. The earlier you submit your score, the safer you are. Late submissions are risky!
                        </p>
                    </div>

                    <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 text-green-500 text-xl font-bold">
                            3
                        </div>
                        <h3 className="text-xl font-bold mb-2">10 Day Gauntlet</h3>
                        <p className="text-gray-400">
                            The tournament lasts exactly 10 days. The field shrinks every single night until only the champions remain.
                        </p>
                    </div>

                    <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
                        <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4 text-yellow-500 text-xl font-bold">
                            4
                        </div>
                        <h3 className="text-xl font-bold mb-2">How to Win</h3>
                        <p className="text-gray-400">
                            Post consistent high scores in the daily games. Survival is about consistency, not just one high peak.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    )
}
