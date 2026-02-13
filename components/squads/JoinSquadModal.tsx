'use client'

import { useState } from 'react'
import { joinSquad } from '@/app/squads/actions'
import { Loader2, Users, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface JoinSquadModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function JoinSquadModal({ isOpen, onClose }: JoinSquadModalProps) {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!code.trim()) return

        setLoading(true)
        setError('')

        try {
            await joinSquad(code)
            setCode('')
            onClose()
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Failed to join squad. Check the code.')
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
                    <Users className="w-5 h-5 text-indigo-500" /> Join Squad
                </h2>
                <p className="text-sm text-neutral-400 mb-6">Enter an invite code to join a group.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-neutral-500 mb-1.5">
                            Invite Code
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="e.g. ABCD12"
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase tracking-widest font-mono"
                            maxLength={6}
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !code.trim()}
                        className="w-full bg-white hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Squad'}
                    </button>
                </form>
            </div>
        </div>
    )
}
