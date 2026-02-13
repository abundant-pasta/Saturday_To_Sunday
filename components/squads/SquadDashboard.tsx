'use client'

import { useState } from 'react'
import { Plus, Users, Share2, Copy, Check, LogOut, Trash2 } from 'lucide-react'
import { SquadDetails, leaveSquad } from '@/app/squads/actions'
import CreateSquadModal from './CreateSquadModal'
import JoinSquadModal from './JoinSquadModal'
import { useRouter } from 'next/navigation'

import InviteUserModal from './InviteUserModal'

interface SquadDashboardProps {
    squads: SquadDetails[]
    onSelectSquad?: (squadId: string) => void
    selectedSquadId?: string | null
}

export default function SquadDashboard({ squads, onSelectSquad, selectedSquadId }: SquadDashboardProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isJoinOpen, setIsJoinOpen] = useState(false)
    const [inviteSquad, setInviteSquad] = useState<{ id: string, name: string } | null>(null)
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
                    className="flex flex-col items-center justify-center gap-1 bg-neutral-900 hover:bg-neutral-800 text-white p-4 rounded-2xl transition-all border border-neutral-800 shadow-xl group active:scale-95"
                >
                    <Plus className="w-6 h-6 text-[#00ff80] group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Create</span>
                </button>
                <button
                    onClick={() => setIsJoinOpen(true)}
                    className="flex flex-col items-center justify-center gap-1 bg-neutral-900 hover:bg-neutral-800 text-white p-4 rounded-2xl transition-all border border-neutral-800 shadow-xl group active:scale-95"
                >
                    <Users className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Join</span>
                </button>
            </div>

            {/* SQUADS LIST */}
            <div className="space-y-3">
                {squads.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-neutral-950 rounded-2xl border border-neutral-900 border-dashed">
                        <Users className="w-10 h-10 text-neutral-800 mx-auto mb-3" />
                        <h3 className="text-neutral-500 font-black uppercase italic tracking-tighter text-sm">No Squads Yet</h3>
                        <p className="text-neutral-700 text-[10px] font-bold uppercase tracking-widest mt-1">Join or create a squad to compete.</p>
                    </div>
                ) : (
                    squads.map(squad => (
                        <div
                            key={squad.id}
                            className={`bg-neutral-900 border rounded-2xl p-5 transition-all relative overflow-hidden group shadow-lg ${selectedSquadId === squad.id ? 'border-[#00ff80] ring-1 ring-[#00ff80]/30' : 'border-neutral-800 hover:border-neutral-700'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div
                                    className="cursor-pointer flex-1"
                                    onClick={() => onSelectSquad?.(squad.id)}
                                >
                                    <h3 className="text-white font-black italic uppercase tracking-tighter text-xl leading-none">{squad.name}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] text-[#00ff80] font-black uppercase tracking-widest bg-[#00ff80]/10 px-2 py-0.5 rounded-full border border-[#00ff80]/20">
                                            {squad.member_count} Member{squad.member_count !== 1 ? 's' : ''}
                                        </span>
                                        {squad.role === 'owner' && (
                                            <span className="text-[10px] uppercase font-black tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Owner</span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => copyCode(squad.invite_code)}
                                    className="text-[10px] font-black uppercase tracking-widest bg-neutral-950 hover:bg-black text-neutral-500 hover:text-white px-3 py-1.5 rounded-full border border-neutral-800 transition-all flex items-center gap-2 active:scale-95 shadow-inner"
                                >
                                    {copiedId === squad.invite_code ? <Check className="w-3 h-3 text-[#00ff80]" /> : <Share2 className="w-3 h-3" />}
                                    {squad.invite_code}
                                </button>
                            </div>

                            <div className="flex items-center justify-between mt-5 pt-4 border-t border-neutral-800/50">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => onSelectSquad?.(squad.id)}
                                        className="text-xs font-black uppercase italic tracking-tighter text-[#00ff80] hover:text-[#00cc66] transition-colors"
                                    >
                                        View Leaderboard
                                    </button>
                                    <button
                                        onClick={() => setInviteSquad({ id: squad.id, name: squad.name })}
                                        className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3 h-3" /> Invite
                                    </button>
                                </div>

                                {squad.role !== 'owner' && (
                                    <button
                                        onClick={() => handleLeave(squad.id)}
                                        disabled={loadingLeave === squad.id}
                                        className="text-[10px] font-black uppercase tracking-widest text-neutral-600 hover:text-red-500 transition-colors flex items-center gap-1"
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
            {inviteSquad && (
                <InviteUserModal
                    isOpen={!!inviteSquad}
                    onClose={() => setInviteSquad(null)}
                    squadId={inviteSquad.id}
                    squadName={inviteSquad.name}
                />
            )}
        </div>
    )
}
