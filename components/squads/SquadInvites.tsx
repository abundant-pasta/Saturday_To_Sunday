'use client'

import { useState } from 'react'
import { respondToInvite } from '@/app/squads/actions'
import { Check, X, Users, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SquadInvitesProps {
    invites: any[]
}

export default function SquadInvites({ invites }: SquadInvitesProps) {
    const [respondingId, setRespondingId] = useState<string | null>(null)
    const router = useRouter()

    const handleAction = async (inviteId: string, action: 'accept' | 'decline') => {
        setRespondingId(inviteId)
        try {
            await respondToInvite(inviteId, action)
            router.refresh()
        } catch (error) {
            console.error(error)
            alert('Failed to respond to invite')
        } finally {
            setRespondingId(null)
        }
    }

    if (invites.length === 0) return null

    return (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-2 px-1">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">PENDING INVITES ({invites.length})</span>
            </div>

            <div className="space-y-2">
                {invites.map(invite => (
                    <div key={invite.id} className="bg-neutral-900 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                        <div className="flex flex-col">
                            <h4 className="text-white font-black italic uppercase tracking-tighter text-sm uppercase">
                                {invite.squad.name}
                            </h4>
                            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">
                                FROM: <span className="text-emerald-500">{invite.inviter.username || invite.inviter.full_name}</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleAction(invite.id, 'decline')}
                                disabled={respondingId === invite.id}
                                className="p-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-500 hover:text-red-500 rounded-full border border-neutral-800 transition-all active:scale-90 disabled:opacity-50"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => handleAction(invite.id, 'accept')}
                                disabled={respondingId === invite.id}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {respondingId === invite.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Accept
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
