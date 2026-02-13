'use client'

import { useState } from 'react'
import { Plus, Users, Share2, Copy, Check, LogOut, Trash2 } from 'lucide-react'
import { SquadDetails, leaveSquad } from '@/app/squads/actions'
import CreateSquadModal from './CreateSquadModal'
import JoinSquadModal from './JoinSquadModal'
import { useRouter } from 'next/navigation'

interface SquadDashboardProps {
    squads: SquadDetails[]
    onSelectSquad?: (squadId: string) => void
    selectedSquadId?: string | null
}

export default function SquadDashboard({ squads, onSelectSquad, selectedSquadId }: SquadDashboardProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isJoinOpen, setIsJoinOpen] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [loadingLeave, setLoadingLeave] = useState<string | null>(null)
    const router = useRouter()

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        setCopiedId(code)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleLeave = async (squadId: string) => {
        if (!confirm('Are you sure you want to leave this squad?')) return
        setLoadingLeave(squadId)
        try {
            await leaveSquad(squadId)
            router.refresh()
        } catch (error) {
            console.error(error)
            alert('Failed to leave squad.')
        } finally {
            setLoadingLeave(null)
        }
    }

    return (
        <div className="w-full space-y-4">
            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white p-3 rounded-xl transition-all border border-neutral-700/50"
                >
                    <Plus className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold">Create Squad</span>
                </button>
                <button
                    onClick={() => setIsJoinOpen(true)}
                    className="flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white p-3 rounded-xl transition-all border border-neutral-700/50"
                >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold">Join Squad</span>
                </button>
            </div>

            {/* SQUADS LIST */}
            <div className="space-y-3">
                {squads.length === 0 ? (
                    <div className="text-center py-8 px-4 bg-neutral-900/50 rounded-xl border border-neutral-800 border-dashed">
                        <Users className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
                        <h3 className="text-neutral-400 font-bold text-sm">No Squads Yet</h3>
                        <p className="text-neutral-600 text-xs mt-1">Join or create a squad to compete with friends.</p>
                    </div>
                ) : (
                    squads.map(squad => (
                        <div
                            key={squad.id}
                            className={`bg-neutral-900 border rounded-xl p-4 transition-all relative overflow-hidden group ${selectedSquadId === squad.id ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-neutral-800 hover:border-neutral-700'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div
                                    className="cursor-pointer flex-1"
                                    onClick={() => onSelectSquad?.(squad.id)}
                                >
                                    <h3 className="text-white font-bold text-lg leading-tight">{squad.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-neutral-500 font-mono bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                                            {squad.member_count} Member{squad.member_count !== 1 ? 's' : ''}
                                        </span>
                                        {squad.role === 'owner' && (
                                            <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Owner</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => copyCode(squad.invite_code)}
                                    className="text-xs font-mono bg-neutral-950 hover:bg-black text-neutral-400 hover:text-white px-2 py-1 rounded border border-neutral-800 transition-colors flex items-center gap-1.5"
                                >
                                    {copiedId === squad.invite_code ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                    {squad.invite_code}
                                </button>
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-800/50">
                                <button
                                    onClick={() => onSelectSquad?.(squad.id)}
                                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wide"
                                >
                                    View Leaderboard
                                </button>

                                {squad.role !== 'owner' && (
                                    <button
                                        onClick={() => handleLeave(squad.id)}
                                        disabled={loadingLeave === squad.id}
                                        className="text-xs font-bold text-neutral-600 hover:text-red-500 uppercase tracking-wide flex items-center gap-1 transition-colors"
                                    >
                                        {loadingLeave === squad.id ? 'Leaving...' : 'Leave'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <CreateSquadModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
            <JoinSquadModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
        </div>
    )
}
