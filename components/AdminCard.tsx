'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Save, RefreshCw, ExternalLink, ImageOff } from 'lucide-react'

export default function AdminCard({ player }: { player: any }) {
  const [imageUrl, setImageUrl] = useState(player.image_url || '')
  const [tier, setTier] = useState(player.tier || 1)
  const [isDirty, setIsDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imgError, setImgError] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSave = async () => {
    setSaving(true)
    // Update BOTH image and tier in the DB
    const { error } = await supabase
      .from('players')
      .update({ 
        image_url: imageUrl,
        tier: tier
      })
      .eq('id', player.id)

    if (!error) {
      setIsDirty(false)
      setImgError(false)
    } else {
      alert("Error saving: " + error.message)
    }
    setSaving(false)
  }

  const handleChange = (type: 'image' | 'tier', value: any) => {
    if (type === 'image') setImageUrl(value)
    if (type === 'tier') setTier(parseInt(value))
    setIsDirty(true)
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow relative">
      
      {/* HEADER INFO */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/30 flex justify-between items-start">
        <div className="overflow-hidden">
          <h3 className="font-bold text-white text-sm truncate pr-2" title={player.name}>{player.name}</h3>
          <p className="text-xs text-slate-400 truncate">{player.college} • {player.team}</p>
        </div>
        
        {/* Live Tier Badge Preview */}
        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            tier === 1 ? 'border-yellow-500/30 text-yellow-500' :
            tier === 2 ? 'border-blue-500/30 text-blue-500' :
            tier === 3 ? 'border-slate-500/30 text-slate-500' :
            'border-red-500/30 text-red-500'
        }`}>
            T{tier}
        </div>
      </div>

      {/* IMAGE PREVIEW AREA */}
      <div className="relative h-48 w-full bg-slate-950 flex items-center justify-center group">
        {imageUrl && !imgError ? (
          <img 
            src={imageUrl} 
            alt={player.name}
            className="h-full w-full object-contain p-2"
            onError={() => setImgError(true)} 
          />
        ) : (
          <div className="text-center p-4">
            <ImageOff className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <span className="text-xs text-slate-600 block">
                {imgError ? "Broken Link" : "No Image"}
            </span>
          </div>
        )}
        
        {/* Google Search Link */}
        <a 
            href={`https://www.google.com/search?q=${player.name}+${player.sport}+espn+headshot&tbm=isch`} 
            target="_blank"
            rel="noreferrer"
            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-blue-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            title="Search Google"
        >
            <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* EDITING AREA */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 mt-auto space-y-3">
        
        {/* TIER SELECTOR */}
        <div className="flex items-center justify-between">
           <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tier Level</label>
           <select 
             value={tier}
             onChange={(e) => handleChange('tier', e.target.value)}
             className="bg-slate-950 border border-slate-800 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-yellow-500"
           >
             <option value={1}>Tier 1 (Star)</option>
             <option value={2}>Tier 2 (Starter)</option>
             <option value={3}>Tier 3 (Role)</option>
             <option value={4}>Tier 4 (Deep)</option>
           </select>
        </div>

        {/* IMAGE INPUT & SAVE BUTTON */}
        <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 block">Image URL</label>
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={imageUrl}
                    onChange={(e) => {
                        handleChange('image', e.target.value)
                        setImgError(false)
                    }}
                    className={`flex-1 bg-slate-950 border text-xs px-2 py-2 rounded focus:outline-none focus:ring-1 ${
                        imgError ? 'border-red-900 text-red-400 focus:ring-red-500' : 'border-slate-800 text-slate-300 focus:ring-blue-500'
                    }`}
                    placeholder="https://..."
                />
                
                <button 
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                    className={`px-3 rounded flex items-center justify-center transition-colors ${
                        isDirty 
                            ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_10px_rgba(22,163,74,0.4)]' 
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                    title="Save Changes"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
                </button>
            </div>
        </div>
      </div>
    </div>
  )
}