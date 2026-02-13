'use client'

import { useState } from 'react'
import { renameSquad, deleteSquad } from '@/app/squads/actions'
import { X, Loader2, Settings, Trash2, Edit2 } from 'lucide-react'

interface EditSquadModalProps {
    isOpen: boolean
    onClose: () => void
    squadId: string
    currentName: string
}

export default function EditSquadModal({ isOpen, onClose, squadId, currentName }: EditSquadModalProps) {
    const [name, setName] = useState(currentName)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    if (!isOpen) return null

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || name === currentName) return
        setLoading(true)
        setError('')
        try {
            await renameSquad(squadId, name.trim())
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to rename squad')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Type DELETE to confirm squad removal.')) return
        const confirmation = prompt('Type DELETE to confirm:')
        if (confirmation !== 'DELETE') return

        setLoading(true)
        setIsDeleting(true)
        setError('')
        try {
            await deleteSquad(squadId)
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to delete squad')
            setLoading(false)
            setIsDeleting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans">
            <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-neutral-400" /> Squad Settings
                </h2>
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-6">Manage your squad settings.</p>

                <form onSubmit={handleRename} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-500 mb-2 tracking-widest">
                            Rename Squad
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#00ff80]/50 font-bold uppercase tracking-tight"
                                maxLength={30}
                            />
                            <button
                                type="submit"
                                disabled={loading || !name.trim() || name === currentName}
                                className="bg-neutral-800 hover:bg-neutral-700 text-white p-3 rounded-xl border border-neutral-700 transition-all disabled:opacity-50"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-neutral-800">
                        <label className="block text-[10px] font-black uppercase text-red-500 mb-2 tracking-widest">
                            Danger Zone
                        </label>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-black uppercase tracking-tighter py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {loading && isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete Squad
                        </button>
                    </div>

                    {error && (
                        <p className="text-red-500 text-[10px] font-bold uppercase tracking-tight text-center">{error}</p>
                    )}
                </form>
            </div>
        </div>
    )
}
