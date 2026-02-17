'use client'

import { useState, useEffect } from 'react'
import { updatePlayerImage, verifyPlayerImage } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, ExternalLink, Save, Check, Filter } from 'lucide-react'
import Image from 'next/image'

type Player = {
    id: string
    name: string
    college: string
    image_url: string | null
    sport: string
    is_image_verified?: boolean
}

export default function ImageAuditClient({ initialPlayers }: { initialPlayers: Player[] }) {
    const [players, setPlayers] = useState(initialPlayers)
    const [filter, setFilter] = useState('')
    const [page, setPage] = useState(1)

    // FILTERS
    const [sportFilter, setSportFilter] = useState<'all' | 'football' | 'basketball'>('all')
    const [verifyFilter, setVerifyFilter] = useState<'all' | 'verified' | 'unverified'>('unverified')

    const ITEMS_PER_PAGE = 50

    // COUNTS
    const totalPlayers = players.length
    const countFB = players.filter(p => (p.sport || '').toLowerCase() === 'football').length
    const countBB = players.filter(p => (p.sport || '').toLowerCase() === 'basketball').length
    const countOther = totalPlayers - countFB - countBB

    const filteredPlayers = players.filter(p => {
        const matchesText = p.name.toLowerCase().includes(filter.toLowerCase()) ||
            p.college.toLowerCase().includes(filter.toLowerCase())

        const playerSport = (p.sport || '').toLowerCase() // Normalize
        const matchesSport = sportFilter === 'all' ||
            (sportFilter === 'football' && playerSport === 'football') ||
            (sportFilter === 'basketball' && playerSport === 'basketball')

        const matchesVerify = verifyFilter === 'all' ||
            (verifyFilter === 'verified' && p.is_image_verified) ||
            (verifyFilter === 'unverified' && !p.is_image_verified)

        return matchesText && matchesSport && matchesVerify
    })

    const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE)
    const currentPlayers = filteredPlayers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

    const handleUpdate = (updatedPlayer: Player) => {
        // If unverified filter is on, and we verify it, it should disappear (or just update state)
        setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p))
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header & Controls */}
                <div className="flex flex-col gap-4 sticky top-0 bg-black/90 backdrop-blur z-20 py-4 border-b border-white/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                                Image Audit <span className="text-[#00ff80]">Tool</span>
                            </h1>
                            <p className="text-neutral-400 text-sm">Found {filteredPlayers.length} players (Total DB: {totalPlayers})</p>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Sport Filter */}
                            <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                                <button
                                    onClick={() => { setSportFilter('all'); setPage(1) }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${sportFilter === 'all' ? 'bg-white text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    All ({totalPlayers})
                                </button>
                                <button
                                    onClick={() => { setSportFilter('football'); setPage(1) }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${sportFilter === 'football' ? 'bg-white text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    FB ({countFB})
                                </button>
                                <button
                                    onClick={() => { setSportFilter('basketball'); setPage(1) }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${sportFilter === 'basketball' ? 'bg-white text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    BB ({countBB})
                                </button>
                            </div>

                            {/* Verify Filter */}
                            <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                                <button
                                    onClick={() => { setVerifyFilter('unverified'); setPage(1) }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${verifyFilter === 'unverified' ? 'bg-amber-500 text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    To To
                                </button>
                                <button
                                    onClick={() => { setVerifyFilter('verified'); setPage(1) }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${verifyFilter === 'verified' ? 'bg-[#00ff80] text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    Done
                                </button>
                                <button
                                    onClick={() => { setVerifyFilter('all'); setPage(1) }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${verifyFilter === 'all' ? 'bg-white text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    All
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                            <Input
                                placeholder="Search by name or college..."
                                value={filter}
                                onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                                className="pl-9 bg-neutral-900 border-neutral-800 text-white w-full md:w-80 focus:ring-[#00ff80]"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="text-black bg-white hover:bg-neutral-200"
                            >
                                Prev
                            </Button>
                            <span className="text-sm font-mono w-20 text-center">
                                {page} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="text-black bg-white hover:bg-neutral-200"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentPlayers.map(player => (
                        <PlayerCard key={player.id} player={player} onUpdate={handleUpdate} />
                    ))}
                </div>

                {filteredPlayers.length === 0 && (
                    <div className="text-center py-20 text-neutral-500">
                        <Filter className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        No players found matching your filters.
                    </div>
                )}

            </div>
        </div>
    )
}

function PlayerCard({ player, onUpdate }: { player: Player, onUpdate: (p: Player) => void }) {
    const [newUrl, setNewUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [isImageReady, setIsImageReady] = useState(false)
    const [imageError, setImageError] = useState(false)

    // Image load timeout
    useEffect(() => {
        if (player.image_url && !isImageReady && !imageError) {
            const timer = setTimeout(() => {
                console.log("Audit image load timeout hit")
                setIsImageReady(true)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [player.image_url, isImageReady, imageError])

    const handleSave = async () => {
        if (!newUrl) return
        setLoading(true)
        try {
            await updatePlayerImage(player.id, newUrl)
            onUpdate({ ...player, image_url: newUrl, is_image_verified: true })
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
            setNewUrl('')
        } catch (e) {
            alert('Failed to update image')
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        setVerifying(true)
        try {
            await verifyPlayerImage(player.id, !player.is_image_verified)
            onUpdate({ ...player, is_image_verified: !player.is_image_verified })
        } catch (e) {
            alert('Failed to verify')
        } finally {
            setVerifying(false)
        }
    }

    // Google Search Query: Player Name + "High School Football" (or Basketball)
    const searchQuery = encodeURIComponent(`${player.name} high school ${player.sport === 'basketball' ? 'basketball' : 'football'} stats`)

    return (
        <Card className={`bg-neutral-900 border-neutral-800 overflow-hidden flex flex-col relative group ${player.is_image_verified ? 'opacity-60 hover:opacity-100 transition-opacity' : ''}`}>
            {player.is_image_verified && (
                <div className="absolute top-2 right-2 z-10 bg-[#00ff80] text-black text-[10px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                    <Check className="w-3 h-3" /> VERIFIED
                </div>
            )}
            <div className="relative aspect-square w-full bg-black">
                {player.image_url ? (
                    <div className="relative w-full h-full">
                        <Image
                            src={player.image_url}
                            alt={player.name}
                            fill
                            className={`object-cover transition-opacity duration-500 ${isImageReady ? 'opacity-100' : 'opacity-0'}`}
                            unoptimized
                            onLoadingComplete={() => setIsImageReady(true)}
                            onError={() => {
                                setImageError(true)
                                setIsImageReady(true)
                            }}
                        />
                        {!isImageReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50">
                                <span className="animate-spin text-neutral-500">⏳</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-700 font-black uppercase text-4xl">
                        ?
                    </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-12">
                    <div className="text-white font-black text-lg leading-none">{player.name}</div>
                    <div className="text-[#00ff80] text-xs font-bold uppercase tracking-wider">{player.college}</div>
                </div>
            </div>

            <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-end">
                <div className="flex gap-2">
                    <Button asChild variant="secondary" size="sm" className="w-full text-xs h-8 bg-neutral-800 hover:bg-neutral-700 text-white border border-white/10">
                        <a href={`https://www.google.com/search?tbm=isch&q=${searchQuery}`} target="_blank" rel="noopener noreferrer">
                            <Search className="w-3 h-3 mr-1" /> Find Image
                        </a>
                    </Button>
                    <Button
                        onClick={handleVerify}
                        disabled={verifying}
                        variant={player.is_image_verified ? "outline" : "default"}
                        size="sm"
                        className={`w-full text-xs h-8 font-bold border ${player.is_image_verified ? 'bg-transparent text-neutral-500 border-neutral-700 hover:bg-neutral-800' : 'bg-[#00ff80] text-black hover:bg-[#00e676] border-transparent'}`}
                    >
                        {verifying ? '...' : player.is_image_verified ? 'Unverify' : 'Mark Good'}
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="Paste new image URL..."
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        className="h-9 text-xs bg-black/50 border-neutral-700 focus:ring-[#00ff80]"
                    />
                    <Button
                        onClick={handleSave}
                        disabled={!newUrl || loading}
                        size="icon"
                        className={`h-9 w-9 shrink-0 ${saved ? 'bg-green-500 hover:bg-green-600' : 'bg-white text-black hover:bg-neutral-200'}`}
                    >
                        {loading ? <span className="animate-spin">⏳</span> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
