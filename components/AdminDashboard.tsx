'use client'

import { useState, useEffect } from 'react'
import AdminCard from '@/components/AdminCard'
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AdminDashboard({ initialPlayers }: { initialPlayers: any[] }) {
  const [sportFilter, setSportFilter] = useState<'football' | 'basketball'>('basketball')
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  
  // PAGINATION
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  useEffect(() => {
    setCurrentPage(1)
  }, [sportFilter, tierFilter, search])

  // --- THE FIX FOR "MISSING PLAYERS" ---
  // We use strict matching for the filter logic, but we normalize the data first.
  const filteredPlayers = initialPlayers.filter(player => {
    // 1. Normalize Sport: Handle "Basketball", "basketball", "NBA", or null
    const playerSport = (player.sport || 'basketball').toLowerCase()
    const filterSport = sportFilter.toLowerCase()
    const matchesSport = playerSport.includes(filterSport) // 'includes' is safer for messy data

    // 2. Normalize Tier: Treat null as Tier 4
    const playerTier = player.tier || 4
    const matchesTier = tierFilter === 'all' ? true : playerTier === tierFilter

    // 3. Search
    const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase())

    return matchesSport && matchesTier && matchesSearch
  })

  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPlayers = filteredPlayers.slice(startIndex, startIndex + itemsPerPage)

  const missingImages = filteredPlayers.filter(p => !p.image_url).length

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
              Roster <span className="text-yellow-500">Audit</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Found <strong>{filteredPlayers.length}</strong> matches. 
              {missingImages > 0 && <span className="text-red-400 ml-2 font-bold">({missingImages} missing images)</span>}
            </p>
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            />
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800 justify-between items-center">
          <div className="flex gap-4">
            {/* Sport Toggle */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                {['football', 'basketball'].map((s) => (
                <button
                    key={s}
                    onClick={() => setSportFilter(s as any)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                    sportFilter === s 
                        ? s === 'football' ? 'bg-[#00ff80] text-black' : 'bg-amber-500 text-black'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                    {s}
                </button>
                ))}
            </div>

            {/* Tier Toggle (Now includes T4) */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase px-2 hidden md:inline"><Filter className="w-3 h-3 inline mr-1"/> Tier:</span>
                {[1, 2, 3, 4, 'all'].map((t) => (
                <button
                    key={t}
                    onClick={() => setTierFilter(t as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    tierFilter === t
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                >
                    {t === 'all' ? 'ALL' : `T${t}`}
                </button>
                ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
             <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 hover:bg-slate-800 rounded disabled:opacity-30"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold px-2">
                    {currentPage} / {totalPages}
                </span>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 hover:bg-slate-800 rounded disabled:opacity-30"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
             </div>
          )}
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
          {paginatedPlayers.map((player) => (
            <AdminCard key={player.id} player={player} />
          ))}
        </div>
      </div>
    </div>
  )
}