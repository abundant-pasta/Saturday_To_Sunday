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

                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-indigo-500" /> Create Squad
                </h2>
                <p className="text-sm text-neutral-400 mb-6">Start a new group to compete with friends.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-neutral-500 mb-1.5">
                            Squad Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. The Office, Family League"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            maxLength={30}
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !name.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Squad'}
                    </button>
                </form>
            </div>
        </div>
    )
}
