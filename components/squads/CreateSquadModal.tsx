'use client'

import { useState } from 'react'
import { createSquad } from '@/app/squads/actions'
import { Loader2, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CreateSquadModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function CreateSquadModal({ isOpen, onClose }: CreateSquadModalProps) {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        setError('')

        try {
            await createSquad(name)
            setName('')
            onClose()
            router.refresh()
        } catch (err) {
            setError('Failed to create squad. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 flex items-center gap-2">
                    <Plus className="w-6 h-6 text-[#00ff80]" /> Create Squad
                </h2>
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-6">Start a new group to compete with friends.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-500 mb-2 tracking-widest">
                            Squad Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. THE OFFICE, GRIDIRON GANG"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#00ff80]/50 font-bold uppercase tracking-tight"
                            maxLength={30}
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-[10px] font-bold uppercase tracking-tight">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="w-full bg-[#00ff80] hover:bg-[#00cc66] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase tracking-tighter py-3 rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Squad'}
                    </button>
                </form>
            </div>
        </div>
    )
}
