'use client'

import { useState, useEffect, useMemo } from 'react'
import { updateImageAuditReportStatus, updatePlayerImage, updatePlayerImageStatus, verifyPlayerImage } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Save, Check, Filter, AlertTriangle, Eye, ImageOff, X } from 'lucide-react'
import Image from 'next/image'

type Player = {
    id: string
    name: string
    college: string
    image_url: string | null
    sport: string
    is_image_verified?: boolean
    image_status?: 'unreviewed' | 'approved' | 'spoiler' | 'wrong_person' | 'missing'
    image_context?: 'unknown' | 'pro' | 'college' | 'headshot'
    image_notes?: string | null
}

type ImageAuditReport = {
    id: string
    player_id: number | string | null
    reporter_user_id?: string | null
    guest_id?: string | null
    game_date?: string | null
    sport: string
    game_mode: 'daily' | 'survival'
    player_name: string
    image_url?: string | null
    issue_type: 'bad_photo' | 'wrong_person' | 'college_spoiler' | 'broken_image' | 'other'
    notes?: string | null
    status: 'open' | 'reviewing' | 'fixed' | 'ignored'
    created_at: string
}

type ReportSummary = {
    playerName: string
    sport: string
    gameMode: ImageAuditReport['game_mode']
    representativeReport: ImageAuditReport
    reportIds: string[]
    issueTypes: ImageAuditReport['issue_type'][]
    gameDates: string[]
    latestAt: string
    openCount: number
    reviewingCount: number
}

const issueLabels: Record<ImageAuditReport['issue_type'], string> = {
    bad_photo: 'Bad photo',
    wrong_person: 'Wrong photo',
    college_spoiler: 'College spoiler',
    broken_image: 'Broken image',
    other: 'Other',
}

function normalizeKey(value: string | null | undefined) {
    return (value || '').trim().toLowerCase()
}

function reportPlayerKey(report: ImageAuditReport) {
    return `${normalizeKey(report.player_name)}|${normalizeKey(report.sport)}|${report.game_mode}`
}

function playerReportKeys(player: Player) {
    return [
        `${normalizeKey(player.name)}|${normalizeKey(player.sport)}|daily`,
        `${normalizeKey(player.name)}|${normalizeKey(player.sport)}|survival`,
    ]
}

export default function ImageAuditClient({
    initialPlayers,
    initialReports = [],
}: {
    initialPlayers: Player[]
    initialReports?: ImageAuditReport[]
}) {
    const [players, setPlayers] = useState(initialPlayers)
    const [reports, setReports] = useState(initialReports)
    const [filter, setFilter] = useState('')
    const [page, setPage] = useState(1)
    const [showReportedOnly, setShowReportedOnly] = useState(initialReports.length > 0)

    // FILTERS
    const [sportFilter, setSportFilter] = useState<'all' | 'football' | 'basketball'>('all')
    const [verifyFilter, setVerifyFilter] = useState<'all' | 'approved' | 'needs_review' | 'blocked'>(initialReports.length > 0 ? 'all' : 'needs_review')

    const ITEMS_PER_PAGE = 50

    const reportQueue = useMemo(() => {
        const byKey = new Map<string, ReportSummary>()

        reports.forEach((report) => {
            const key = reportPlayerKey(report)
            const current = byKey.get(key)
            const gameDates = report.game_date ? [report.game_date] : []

            if (!current) {
                byKey.set(key, {
                    playerName: report.player_name,
                    sport: report.sport,
                    gameMode: report.game_mode,
                    representativeReport: report,
                    reportIds: [report.id],
                    issueTypes: [report.issue_type],
                    gameDates,
                    latestAt: report.created_at,
                    openCount: report.status === 'open' ? 1 : 0,
                    reviewingCount: report.status === 'reviewing' ? 1 : 0,
                })
                return
            }

            current.reportIds.push(report.id)
            if (!current.issueTypes.includes(report.issue_type)) {
                current.issueTypes.push(report.issue_type)
            }
            if (report.game_date && !current.gameDates.includes(report.game_date)) {
                current.gameDates.push(report.game_date)
            }
            if (new Date(report.created_at).getTime() > new Date(current.latestAt).getTime()) {
                current.latestAt = report.created_at
                current.representativeReport = report
            }
            if (report.status === 'open') current.openCount += 1
            if (report.status === 'reviewing') current.reviewingCount += 1
        })

        return byKey
    }, [reports])

    const reportedOnlyActive = showReportedOnly && reportQueue.size > 0

    const getReportSummary = (player: Player) => {
        for (const key of playerReportKeys(player)) {
            const summary = reportQueue.get(key)
            if (summary) return summary
        }

        return undefined
    }

    // COUNTS
    const totalPlayers = players.length
    const countFB = players.filter(p => (p.sport || '').toLowerCase() === 'football').length
    const countBB = players.filter(p => (p.sport || '').toLowerCase() === 'basketball').length

    const filteredPlayers = players.filter(p => {
        const reportSummary = getReportSummary(p)
        const matchesReportQueue = !reportedOnlyActive || Boolean(reportSummary)
        const matchesText = p.name.toLowerCase().includes(filter.toLowerCase()) ||
            (p.college || '').toLowerCase().includes(filter.toLowerCase())

        const playerSport = (p.sport || '').toLowerCase() // Normalize
        const matchesSport = sportFilter === 'all' ||
            (sportFilter === 'football' && playerSport === 'football') ||
            (sportFilter === 'basketball' && playerSport === 'basketball')

        const status = p.image_status || (p.is_image_verified ? 'approved' : 'unreviewed')
        const matchesVerify = verifyFilter === 'all' ||
            (verifyFilter === 'approved' && status === 'approved') ||
            (verifyFilter === 'needs_review' && status === 'unreviewed') ||
            (verifyFilter === 'blocked' && ['spoiler', 'wrong_person', 'missing'].includes(status))

        return matchesReportQueue && matchesText && matchesSport && matchesVerify
    }).sort((a, b) => {
        if (!reportedOnlyActive) return a.name.localeCompare(b.name)

        const aReport = getReportSummary(a)
        const bReport = getReportSummary(b)
        const aTime = aReport ? new Date(aReport.latestAt).getTime() : 0
        const bTime = bReport ? new Date(bReport.latestAt).getTime() : 0

        if (aTime !== bTime) return bTime - aTime
        return a.name.localeCompare(b.name)
    })

    const filteredReportKeys = useMemo(() => {
        const keys = new Set<string>()
        filteredPlayers.forEach(player => {
            playerReportKeys(player).forEach(key => keys.add(key))
        })
        return keys
    }, [filteredPlayers])

    const visibleReports = reportedOnlyActive
        ? reports.filter(report => filteredReportKeys.has(reportPlayerKey(report)))
        : reports
    const visibleReportGroupCount = useMemo(
        () => buildReportQueue(visibleReports).length,
        [visibleReports]
    )

    const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE)
    const displayTotalPages = Math.max(1, totalPages)
    const currentPlayers = filteredPlayers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

    const handleUpdate = (updatedPlayer: Player) => {
        // If unverified filter is on, and we verify it, it should disappear (or just update state)
        setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p))
    }

    const handleReportsFixed = (reportIds: string[]) => {
        setReports(prev => prev.filter(report => !reportIds.includes(report.id)))
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
                            <p className="text-neutral-400 text-sm">
                                Found {reportedOnlyActive ? visibleReportGroupCount : filteredPlayers.length} players
                                {reportedOnlyActive ? ` of ${reportQueue.size} in the reported-player queue` : ` (Total DB: ${totalPlayers})`}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                                <button
                                    onClick={() => { setShowReportedOnly(true); setVerifyFilter('all'); setPage(1) }}
                                    disabled={reportQueue.size === 0}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed ${reportedOnlyActive ? 'bg-amber-500 text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    Reported ({reportQueue.size})
                                </button>
                                <button
                                    onClick={() => { setShowReportedOnly(false); setPage(1) }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!reportedOnlyActive ? 'bg-white text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    All Players
                                </button>
                            </div>

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
                                    onClick={() => { setVerifyFilter('needs_review'); setPage(1) }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${verifyFilter === 'needs_review' ? 'bg-amber-500 text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    Review
                                </button>
                                <button
                                    onClick={() => { setVerifyFilter('approved'); setPage(1) }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${verifyFilter === 'approved' ? 'bg-[#00ff80] text-black shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    Done
                                </button>
                                <button
                                    onClick={() => { setVerifyFilter('blocked'); setPage(1) }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${verifyFilter === 'blocked' ? 'bg-red-500 text-white shadow-lg' : 'text-neutral-400 hover:text-white'}`}
                                >
                                    Bad
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

                        {!reportedOnlyActive && (
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
                                    {page} / {displayTotalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(displayTotalPages, p + 1))}
                                    disabled={page >= displayTotalPages}
                                    className="text-black bg-white hover:bg-neutral-200"
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {reportedOnlyActive ? (
                    <UserImageReportsPanel
                        reports={visibleReports}
                        players={players}
                        onPlayerUpdate={handleUpdate}
                        onStatusChange={(reportIds, status) => {
                            setReports(prev => status === 'fixed' || status === 'ignored'
                                ? prev.filter(report => !reportIds.includes(report.id))
                                : prev.map(report => reportIds.includes(report.id) ? { ...report, status } : report)
                            )
                        }}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {currentPlayers.map(player => (
                            <PlayerCard
                                key={player.id}
                                player={player}
                                reportSummary={getReportSummary(player)}
                                onUpdate={handleUpdate}
                                onReportsFixed={handleReportsFixed}
                            />
                        ))}
                    </div>
                )}

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

function UserImageReportsPanel({
    reports,
    players,
    onPlayerUpdate,
    onStatusChange,
}: {
    reports: ImageAuditReport[]
    players: Player[]
    onPlayerUpdate: (player: Player) => void
    onStatusChange: (reportIds: string[], status: ImageAuditReport['status']) => void
}) {
    const [updatingId, setUpdatingId] = useState<string | null>(null)
    const openCount = reports.filter(report => report.status === 'open').length
    const reviewingCount = reports.filter(report => report.status === 'reviewing').length
    const groupedReports = useMemo(() => buildReportQueue(reports), [reports])

    const updateStatus = async (summary: ReportSummary, status: ImageAuditReport['status']) => {
        setUpdatingId(summary.reportIds.join('|'))
        try {
            await Promise.all(summary.reportIds.map(reportId => updateImageAuditReportStatus(reportId, status)))
            onStatusChange(summary.reportIds, status)
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to update report')
        } finally {
            setUpdatingId(null)
        }
    }

    if (reports.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-neutral-950 p-4">
                <div className="flex items-center gap-2 text-neutral-400">
                    <Check className="h-4 w-4 text-[#00ff80]" />
                    <p className="text-sm font-black uppercase tracking-widest">No open user image reports</p>
                </div>
            </div>
        )
    }

    return (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">User Reports</p>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white">Image Fix Queue</h2>
                    <p className="text-sm text-neutral-400">
                        {groupedReports.length} players, {openCount} open, {reviewingCount} reviewing
                    </p>
                </div>
                <div className="text-xs font-bold text-neutral-500">
                    Duplicate reports are grouped by player.
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {groupedReports.slice(0, 18).map((summary) => {
                    const report = summary.representativeReport
                    const player = findPlayerForReport(report, players)

                    return (
                        <ImageReportCard
                            key={`${summary.playerName}-${summary.sport}-${summary.gameMode}`}
                            summary={summary}
                            player={player}
                            isUpdating={updatingId === summary.reportIds.join('|')}
                            onStatusChange={updateStatus}
                            onPlayerUpdate={onPlayerUpdate}
                        />
                    )
                })}
            </div>
        </section>
    )
}

function buildReportQueue(reports: ImageAuditReport[]) {
    const byKey = new Map<string, ReportSummary>()

    reports.forEach((report) => {
        const key = reportPlayerKey(report)
        const current = byKey.get(key)
        const gameDates = report.game_date ? [report.game_date] : []

        if (!current) {
            byKey.set(key, {
                playerName: report.player_name,
                sport: report.sport,
                gameMode: report.game_mode,
                representativeReport: report,
                reportIds: [report.id],
                issueTypes: [report.issue_type],
                gameDates,
                latestAt: report.created_at,
                openCount: report.status === 'open' ? 1 : 0,
                reviewingCount: report.status === 'reviewing' ? 1 : 0,
            })
            return
        }

        current.reportIds.push(report.id)
        if (!current.issueTypes.includes(report.issue_type)) {
            current.issueTypes.push(report.issue_type)
        }
        if (report.game_date && !current.gameDates.includes(report.game_date)) {
            current.gameDates.push(report.game_date)
        }
        if (new Date(report.created_at).getTime() > new Date(current.latestAt).getTime()) {
            current.latestAt = report.created_at
            current.representativeReport = report
        }
        if (report.status === 'open') current.openCount += 1
        if (report.status === 'reviewing') current.reviewingCount += 1
    })

    return Array.from(byKey.values()).sort((a, b) => {
        const aTime = new Date(a.latestAt).getTime()
        const bTime = new Date(b.latestAt).getTime()

        if (aTime !== bTime) return bTime - aTime
        return a.playerName.localeCompare(b.playerName)
    })
}

function findPlayerForReport(report: ImageAuditReport, players: Player[]) {
    if (report.player_id !== null && report.player_id !== undefined) {
        const idMatch = players.find(player => String(player.id) === String(report.player_id))
        if (idMatch) return idMatch
    }

    return players.find(player => (
        normalizeKey(player.name) === normalizeKey(report.player_name) &&
        normalizeKey(player.sport) === normalizeKey(report.sport)
    ))
}

function ImageReportCard({
    summary,
    player,
    isUpdating,
    onStatusChange,
    onPlayerUpdate,
}: {
    summary: ReportSummary
    player?: Player
    isUpdating: boolean
    onStatusChange: (summary: ReportSummary, status: ImageAuditReport['status']) => Promise<void>
    onPlayerUpdate: (player: Player) => void
}) {
    const report = summary.representativeReport
    const [imageUrl, setImageUrl] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const canSave = Boolean(player && imageUrl.trim() && !saving && !isUpdating)
    const searchQuery = encodeURIComponent(`${report.player_name} ${report.sport} pro headshot`)

    const saveImageAndFixReport = async () => {
        const cleanUrl = imageUrl.trim()
        if (!player || !cleanUrl) return

        setSaving(true)
        try {
            await updatePlayerImage(player.id, cleanUrl)
            onPlayerUpdate({
                ...player,
                image_url: cleanUrl,
                is_image_verified: true,
                image_status: 'approved',
                image_context: 'pro',
            })
            await onStatusChange(summary, 'fixed')
            setImageUrl('')
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch {
            alert('Failed to update photo')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
            <div className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-900">
                    {report.image_url ? (
                        <Image
                            src={report.image_url}
                            alt={report.player_name}
                            fill
                            sizes="64px"
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <ImageOff className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-neutral-700" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">{report.player_name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                                {report.sport} / {report.game_mode}
                            </p>
                        </div>
                        <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase ${
                            report.status === 'reviewing' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-black'
                        }`}>
                            {summary.reportIds.length} report{summary.reportIds.length === 1 ? '' : 's'}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-300">
                        {report.issue_type === 'bad_photo' && <AlertTriangle className="h-3 w-3" />}
                        {report.issue_type === 'wrong_person' && <X className="h-3 w-3" />}
                        {report.issue_type === 'college_spoiler' && <Eye className="h-3 w-3" />}
                        {report.issue_type === 'broken_image' && <ImageOff className="h-3 w-3" />}
                        {report.issue_type === 'other' && <AlertTriangle className="h-3 w-3" />}
                        <span>{summary.issueTypes.map(issue => issueLabels[issue]).join(', ')}</span>
                    </div>
                    {report.notes && (
                        <p className="mt-1 line-clamp-2 text-xs text-neutral-400">{report.notes}</p>
                    )}
                    <p className="mt-1 text-[10px] text-neutral-600">
                        {summary.gameDates.length ? summary.gameDates.sort().join(', ') : 'No date'} · Latest {new Date(summary.latestAt).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <div className="mt-3 space-y-2">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                        New Photo URL
                    </label>
                    <div className="flex gap-2">
                        <Button asChild type="button" size="sm" className="h-9 shrink-0 bg-neutral-800 px-3 text-[10px] font-black text-white hover:bg-neutral-700">
                            <a href={`https://www.google.com/search?tbm=isch&q=${searchQuery}`} target="_blank" rel="noopener noreferrer">
                                <Search className="mr-1 h-3 w-3" /> Find
                            </a>
                        </Button>
                        <Input
                            value={imageUrl}
                            onChange={(event) => setImageUrl(event.target.value)}
                            placeholder={player ? 'Paste the correct image URL...' : 'No player match'}
                            disabled={!player || saving || isUpdating}
                            className="h-9 min-w-0 bg-black/60 text-xs text-white border-neutral-700 focus:ring-[#00ff80]"
                        />
                    </div>
                </div>
                <Button
                    type="button"
                    disabled={!canSave}
                    onClick={saveImageAndFixReport}
                    className={`h-9 w-full text-[10px] font-black uppercase tracking-widest ${saved ? 'bg-green-500 text-black hover:bg-green-500' : 'bg-white text-black hover:bg-neutral-200'}`}
                >
                    {saving ? <span className="animate-spin">⏳</span> : saved ? <Check className="mr-1 h-4 w-4" /> : <Save className="mr-1 h-4 w-4" />}
                    {saved ? 'Saved' : 'Save Photo + Close Report'}
                </Button>
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        type="button"
                        size="sm"
                        disabled={isUpdating || saving}
                        onClick={() => onStatusChange(summary, 'reviewing')}
                        className="h-8 bg-blue-600 text-[10px] font-black text-white hover:bg-blue-500"
                    >
                        Review
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={isUpdating || saving}
                        onClick={() => onStatusChange(summary, 'fixed')}
                        className="h-8 bg-[#00ff80] text-[10px] font-black text-black hover:bg-[#00e676]"
                    >
                        Fixed
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={isUpdating || saving}
                        onClick={() => onStatusChange(summary, 'ignored')}
                        className="h-8 bg-neutral-800 text-[10px] font-black text-neutral-300 hover:bg-neutral-700"
                    >
                        Ignore
                    </Button>
                </div>
            </div>
        </div>
    )
}

function PlayerCard({
    player,
    reportSummary,
    onUpdate,
    onReportsFixed,
}: {
    player: Player
    reportSummary?: ReportSummary
    onUpdate: (p: Player) => void
    onReportsFixed?: (reportIds: string[]) => void
}) {
    const [newUrl, setNewUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [fixingReports, setFixingReports] = useState(false)
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
            onUpdate({ ...player, image_url: newUrl, is_image_verified: true, image_status: 'approved', image_context: 'pro' })
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
            setNewUrl('')
        } catch {
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
        } catch {
            alert('Failed to verify')
        } finally {
            setVerifying(false)
        }
    }

    const handleStatus = async (
        status: 'approved' | 'spoiler' | 'wrong_person' | 'missing',
        context: 'pro' | 'college' | 'unknown' = 'unknown',
    ) => {
        setVerifying(true)
        try {
            await updatePlayerImageStatus(player.id, status, context)
            onUpdate({ ...player, image_status: status, image_context: context, is_image_verified: status === 'approved' })
        } catch {
            alert('Failed to update image status')
        } finally {
            setVerifying(false)
        }
    }

    const handleMarkReportsFixed = async () => {
        if (!reportSummary) return
        setFixingReports(true)
        try {
            await Promise.all(reportSummary.reportIds.map((reportId) => updateImageAuditReportStatus(reportId, 'fixed')))
            onReportsFixed?.(reportSummary.reportIds)
        } catch {
            alert('Failed to mark reports fixed')
        } finally {
            setFixingReports(false)
        }
    }

    // Google Search Query: Player Name + "High School Football" (or Basketball)
    const searchQuery = encodeURIComponent(`${player.name} high school ${player.sport === 'basketball' ? 'basketball' : 'football'} stats`)

    return (
        <Card className={`bg-neutral-900 border-neutral-800 overflow-hidden flex flex-col relative group ${player.image_status === 'approved' || player.is_image_verified ? 'opacity-60 hover:opacity-100 transition-opacity' : ''}`}>
            {reportSummary && (
                <div className="absolute left-2 top-2 z-10 rounded bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-lg">
                    {reportSummary.reportIds.length} report{reportSummary.reportIds.length === 1 ? '' : 's'}
                </div>
            )}
            {(player.image_status === 'approved' || player.is_image_verified) && (
                <div className="absolute top-2 right-2 z-10 bg-[#00ff80] text-black text-[10px] font-black px-2 py-0.5 rounded shadow-lg flex items-center gap-1">
                    <Check className="w-3 h-3" /> APPROVED
                </div>
            )}
            {player.image_status && player.image_status !== 'approved' && player.image_status !== 'unreviewed' && (
                <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg uppercase">
                    {player.image_status.replace('_', ' ')}
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
                {reportSummary && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Reported Player</p>
                                <p className="mt-1 text-xs font-bold text-neutral-300">
                                    {reportSummary.openCount} open, {reportSummary.reviewingCount} reviewing
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                disabled={fixingReports}
                                onClick={handleMarkReportsFixed}
                                className="h-8 shrink-0 bg-[#00ff80] text-[10px] font-black text-black hover:bg-[#00e676]"
                            >
                                {fixingReports ? '...' : 'Mark Fixed'}
                            </Button>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs font-bold text-amber-200">
                            {reportSummary.issueTypes.map(issue => issueLabels[issue]).join(', ')}
                        </p>
                        {reportSummary.gameDates.length > 0 && (
                            <p className="mt-1 text-[10px] text-neutral-500">
                                Seen on {reportSummary.gameDates.sort().join(', ')}
                            </p>
                        )}
                    </div>
                )}

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

                <div className="grid grid-cols-2 gap-2">
                    <Button
                        onClick={() => handleStatus('approved', 'pro')}
                        disabled={verifying}
                        size="sm"
                        className="h-8 text-[10px] font-black bg-[#00ff80] text-black hover:bg-[#00e676]"
                    >
                        Good Pro
                    </Button>
                    <Button
                        onClick={() => handleStatus('spoiler', 'college')}
                        disabled={verifying}
                        size="sm"
                        className="h-8 text-[10px] font-black bg-amber-500 text-black hover:bg-amber-400"
                    >
                        College Spoiler
                    </Button>
                    <Button
                        onClick={() => handleStatus('wrong_person', 'unknown')}
                        disabled={verifying}
                        size="sm"
                        className="h-8 text-[10px] font-black bg-red-600 text-white hover:bg-red-500"
                    >
                        Wrong Person
                    </Button>
                    <Button
                        onClick={() => handleStatus('missing', 'unknown')}
                        disabled={verifying}
                        size="sm"
                        className="h-8 text-[10px] font-black bg-neutral-700 text-white hover:bg-neutral-600"
                    >
                        Missing
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
