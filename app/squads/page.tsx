import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SquadDashboard from '@/components/squads/SquadDashboard'
import Leaderboard from '@/components/Leaderboard'
import { getMySquads } from './actions'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SquadsPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/')
    }

    const squads = await getMySquads()

    // Handle selected squad from URL or default to first one if available?
    // Actually, let's keep it clean: no selection = show list. selection = show list + leaderboard.
    // Or better: Pass selected ID to Dashboard to highlight it.

    const squadId = searchParams?.id as string | undefined
    const selectedSquad = squads.find(s => s.id === squadId)

    // Verify access to selected squad (if ID is provided but not in list, user might not be member)
    // If user is not member, maybe they are trying to view a public squad?
    // valuable V2 feature. For now, if not in list, ignore or show empty.
    // But wait, getMySquads only returns joined squads.

    const showLeaderboard = !!selectedSquad

    return (
        <main className="min-h-screen bg-black text-white pb-20">
            {/* HEADER */}
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center gap-4">
                <Link href="/" className="p-2 -ml-2 hover:bg-neutral-800 rounded-lg transition-colors">
                    <ChevronLeft className="w-5 h-5 text-neutral-400" />
                </Link>
                <h1 className="text-lg font-bold">My Squads</h1>
            </div>

            <div className="p-4 max-w-md mx-auto space-y-8">

                <SquadDashboard
                    squads={squads}
                    selectedSquadId={squadId}
                    onSelectSquad={async (id) => {
                        'use server'
                        redirect(`/squads?id=${id}`)
                    }}
                />

                {showLeaderboard && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                                Leaderboard: <span className="text-white">{selectedSquad.name}</span>
                            </span>
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
