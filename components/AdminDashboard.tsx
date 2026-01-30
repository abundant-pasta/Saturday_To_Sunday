'use client'

import { useState } from 'react'
import AdminCard from '@/components/AdminCard'
import { Search, Filter } from 'lucide-react'

export default function AdminDashboard({ initialPlayers }: { initialPlayers: any[] }) {
  const [sportFilter, setSportFilter] = useState<'football' | 'basketball'>('basketball')
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')

  // Filter Logic
  const filteredPlayers = initialPlayers.filter(player => {
    const matchesSport = player.sport === sportFilter
    const matchesTier = tierFilter === 'all' ? true : player.tier === tierFilter
    const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase())
    return matchesSport && matchesTier && matchesSearch
  })

  // Count stats for the header
  const totalCount = filteredPlayers.length
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
              Showing <strong>{totalCount}</strong> players. 
              {missingImages > 0 && <span className="text-red-400 ml-2 font-bold">({missingImages} missing images)</span>}
            </p>
          </div>
          
          {/* SEARCH */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search player name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            />
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          
          {/* Sport Toggle */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            {['football', 'basketball'].map((s) => (
              <button
                key={s}
                onClick={() => setSportFilter(s as any)}
                className={`px-6 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  sportFilter === s 
                    ? s === 'football' ? 'bg-[#00ff80] text-black shadow-lg' : 'bg-amber-500 text-black shadow-lg'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Tier Toggle */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 uppercase px-2"><Filter className="w-3 h-3 inline mr-1"/> Tier:</span>
            {[1, 2, 3, 'all'].map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                  tierFilter === t
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-700'
                }`}
              >
                {t === 'all' ? 'ALL' : `Tier ${t}`}
              </button>
            ))}
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => (
            <AdminCard key={player.id} player={player} />
          ))}
        </div>
        
        {filteredPlayers.length === 0 && (
            <div className="text-center py-20 text-slate-500">
                No players found matching these filters.
            </div>
        )}
      </div>
    </div>
  )
}