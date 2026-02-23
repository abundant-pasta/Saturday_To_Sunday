'use client'

import { useState } from 'react'
import { fixPlayerPhoto } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, RefreshCcw, Image as ImageIcon, AlertTriangle, ExternalLink } from 'lucide-react'

interface Player {
    id: string
    name: string
    image_url: string
    sport: string
    date: string
}

interface AdminFixClientProps {
    initialPlayers: Player[]
}

export default function AdminFixClient({ initialPlayers }: AdminFixClientProps) {
    const [players, setPlayers] = useState(initialPlayers)
    const [updating, setUpdating] = useState<string | null>(null)
    const [newUrls, setNewUrls] = useState<Record<string, string>>({})
    const [status, setStatus] = useState<Record<string, 'idle' | 'success' | 'error'>>({})

    const handleUpdate = async (player: Player) => {
        const newUrl = newUrls[player.id]
        if (!newUrl || newUrl === player.image_url) return

        setUpdating(player.id)
        setStatus(prev => ({ ...prev, [player.id]: 'idle' }))

        try {
            await fixPlayerPhoto(player.id, newUrl, player.date)
            setStatus(prev => ({ ...prev, [player.id]: 'success' }))

            // Update local state
            setPlayers(prev => prev.map(p =>
                p.id === player.id ? { ...p, image_url: newUrl } : p
            ))

            // Clear success after 3 seconds
            setTimeout(() => {
                setStatus(prev => ({ ...prev, [player.id]: 'idle' }))
            }, 3000)
        } catch (error) {
            console.error(error)
            setStatus(prev => ({ ...prev, [player.id]: 'error' }))
        } finally {
            setUpdating(null)
        }
    }

    // Group by sport
    const sports = Array.from(new Set(players.map(p => p.sport)))

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
            <div className="space-y-4 text-center">
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
                    Photo Correction Tool
                </h1>
                <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest">
                    Reviewing Most Recently Generated Games
                </p>
            </div>

            {sports.map(sport => {
                const sportPlayers = players.filter(p => p.sport === sport);
                const sportDate = sportPlayers[0]?.date || 'No Date';

                return (
                    <div key={sport} className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-neutral-800" />
                            <div className="text-center px-4">
                                <h2 className="text-xl font-black uppercase italic text-red-500 tracking-tight">
                                    {sport.replace('_', ' ')}
                                </h2>
                                <div className="text-[10px] text-neutral-600 font-black uppercase tracking-[0.2em] mt-1">
                                    Game Date: {sportDate || 'Unknown'}
                                </div>
                            </div>
                            <div className="h-px flex-1 bg-neutral-800" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {players.filter(p => p.sport === sport).map(player => (
                                <Card key={player.id + '-' + player.date} className="bg-neutral-900 border-neutral-800 overflow-hidden group hover:border-red-500/50 transition-all duration-300">
                                    <CardContent className="p-0">
                                        {/* Image Preview */}
                                        <div className="aspect-square relative overflow-hidden bg-neutral-950 flex items-center justify-center">
                                            {player.image_url ? (
                                                <img
                                                    src={player.image_url}
                                                    alt={player.name || 'Player'}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-neutral-700">
                                                    <ImageIcon className="w-12 h-12" />
                                                    <span className="text-[10px] uppercase font-black">No Image</span>
                                                </div>
                                            )}

                                            {/* Status Overlays */}
                                            {updating === player.id && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                                    <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                                                </div>
                                            )}

                                            {status[player.id] === 'success' && (
                                                <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-sm flex items-center justify-center">
                                                    <CheckCircle className="w-12 h-12 text-emerald-400 animate-bounce" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Player Info */}
                                        <div className="p-4 space-y-4">
                                            <div className="space-y-1">
                                                <h3 className="font-black uppercase italic text-white truncate">
                                                    {player.name || 'Unknown Player'}
                                                </h3>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
                                                        ID: {player.id ? player.id.slice(0, 8) : 'N/A'}
                                                    </span>
                                                    <a
                                                        href={`https://www.google.com/search?q=${encodeURIComponent((player.name || '') + ' ' + player.sport + ' athlete')}&tbm=isch`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-red-500 hover:text-red-400 flex items-center gap-1 text-[10px] font-black uppercase"
                                                    >
                                                        Find Image <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="New Photo URL..."
                                                        className="bg-black border-neutral-800 text-xs text-neutral-300 focus:border-red-500 transition-colors"
                                                        value={newUrls[player.id] !== undefined ? newUrls[player.id] : (player.image_url || '')}
                                                        onChange={(e) => setNewUrls(prev => ({ ...prev, [player.id]: e.target.value }))}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        disabled={updating !== null || (newUrls[player.id] || player.image_url || '') === (player.image_url || '')}
                                                        onClick={() => handleUpdate(player)}
                                                        className="bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px]"
                                                    >
                                                        {updating === player.id ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCcw className="w-4 h-4" />}
                                                    </Button>
                                                </div>

                                                {status[player.id] === 'error' && (
                                                    <div className="flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase animate-pulse">
                                                        <AlertTriangle className="w-3 h-3" /> Failed to update
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            })}

            {players.length === 0 && (
                <div className="text-center py-24 bg-neutral-900/50 border border-neutral-800 rounded-3xl space-y-4">
                    <ImageIcon className="w-16 h-16 text-neutral-800 mx-auto" />
                    <div>
                        <h3 className="text-xl font-black uppercase italic text-neutral-500">No Players Found</h3>
                        <p className="text-xs text-neutral-700 font-bold uppercase tracking-widest">The games for tomorrow might not be generated yet.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
