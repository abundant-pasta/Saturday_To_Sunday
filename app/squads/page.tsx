import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SquadDashboard from '@/components/squads/SquadDashboard'
import SquadInvites from '@/components/squads/SquadInvites'
import Leaderboard from '@/components/Leaderboard'
import { getMySquads, getPendingInvites } from './actions'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SquadsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedSearchParams = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    const [squads, invites] = await Promise.all([
        getMySquads(),
        getPendingInvites()
    ])

    const squadId = resolvedSearchParams?.id as string | undefined
    const selectedSquad = squads.find(s => s.id === squadId)

    // Verify access to selected squad (if ID is provided but not in list, user might not be member)
    // If user is not member, maybe they are trying to view a public squad?
    // valuable V2 feature. For now, if not in list, ignore or show empty.
    // But wait, getMySquads only returns joined squads.

    const showLeaderboard = !!selectedSquad

    return (
        <main className="min-h-screen bg-black text-white pb-20 pt-16 font-sans">
            {/* HEADER */}
            <div className="border-b border-neutral-900 px-4 py-4 mb-4 flex items-center justify-center">
                <h1 className="text-2xl font-black italic uppercase tracking-tighter">My Squads</h1>
            </div>

            <div className="p-4 max-w-md mx-auto space-y-10">

                <SquadInvites invites={invites} />

                <SquadDashboard
                    squads={squads}
                    selectedSquadId={squadId}
                    onSelectSquad={async (id) => {
                        'use server'
                        redirect(`/squads?id=${id}`)
                    }}
                />

                {showLeaderboard && (
                    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <div className="flex items-center gap-3 mb-4 px-1">
                            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-neutral-900 to-transparent"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600 whitespace-nowrap">
                                Leaderboard : <span className="text-[#00ff80] italic">{selectedSquad.name}</span>
                            </span>
                            <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-neutral-900 to-transparent"></div>
                        </div>
                        <Leaderboard
                            currentUserId={user.id}
                            squadId={squadId}
                            defaultSport="football"
                        />
                    </div>
                )}
            </div>
        </main>
    )
}
