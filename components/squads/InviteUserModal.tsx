'use client'

import { useState, useEffect } from 'react'
import { searchUsers, sendInvite } from '@/app/squads/actions'
import { Loader2, Search, Send, User, X, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

interface InviteUserModalProps {
    isOpen: boolean
    onClose: () => void
    squadId: string
    squadName: string
}

export default function InviteUserModal({ isOpen, onClose, squadId, squadName }: InviteUserModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [invitingId, setInvitingId] = useState<string | null>(null)
    const [sentIds, setSentIds] = useState<string[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 2) {
                setResults([])
                return
            }
            setLoading(true)
            const users = await searchUsers(query)
            setResults(users)
            setLoading(false)
        }

        const timer = setTimeout(fetchResults, 300)
        return () => clearTimeout(timer)
    }, [query])

    if (!isOpen) return null

    const handleInvite = async (userId: string) => {
        setInvitingId(userId)
        setError('')
        try {
            await sendInvite(squadId, userId)
            setSentIds(prev => [...prev, userId])
        } catch (err: any) {
            setError(err.message || 'Failed to send invite')
        } finally {
            setInvitingId(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 flex items-center gap-2">
                    <Send className="w-6 h-6 text-[#00ff80]" /> Invite
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-6 px-1">
                    Squad: <span className="text-[#00ff80] italic">{squadName}</span>
                </p>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="SEARCH BY USERNAME..."
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#00ff80]/50 font-black uppercase tracking-widest text-xs"
                        />
                        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-neutral-600" />}
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-neutral-800">
                        {results.length === 0 && query.length >= 2 && !loading && (
                            <p className="text-center py-4 text-[10px] font-black uppercase tracking-widest text-neutral-700">No users found</p>
                        )}

                        {results.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-900 shadow-inner">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 overflow-hidden relative flex items-center justify-center">
                                        {user.avatar_url ? (
                                            <Image src={user.avatar_url} alt={user.username || ''} fill className="object-cover" />
                                        ) : (
                                            <User className="w-4 h-4 text-neutral-600" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-tight text-white">{user.username || 'ANONYMOUS'}</span>
                                        <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">{user.full_name || ''}</span>
                                    </div>
                                </div>

                                {sentIds.includes(user.id) ? (
                                    <div className="bg-neutral-900 text-[#00ff80] px-3 py-1.5 rounded-full flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Sent</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleInvite(user.id)}
                                        disabled={invitingId === user.id}
                                        className="bg-[#00ff80]/10 hover:bg-[#00ff80]/20 text-[#00ff80] px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-[#00ff80]/30 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {invitingId === user.id ? '...' : 'Invite'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {error && (
                        <p className="text-red-500 text-[10px] font-black uppercase tracking-tight text-center">{error}</p>
                    )}
                </div>
            </div>
        </div>
    )
}
