'use client'

import { useState } from 'react'
import { deletePlayer, updatePlayerImage } from '@/app/actions'
import Image from 'next/image'
import { Trash2, Save, X, ImageIcon } from 'lucide-react'

export default function AdminCard({ player }: { player: any }) {
  const [isDeleted, setIsDeleted] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [newUrl, setNewUrl] = useState(player.image_url || '')

  if (isDeleted) return null

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${player.name}?`)) {
      await deletePlayer(player.id)
      setIsDeleted(true)
    }
  }

  const handleUpdate = async () => {
    await updatePlayerImage(player.id, newUrl)
    setIsEditing(false)
    // Optional: Force a refresh or just rely on local state updates if you want
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-4 relative group">
      
      {/* HEADER INFO */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg leading-tight">{player.name}</h3>
          <p className="text-xs text-slate-500 uppercase">{player.team} • {player.college}</p>
        </div>
        <button 
            onClick={handleDelete}
            className="text-slate-600 hover:text-red-500 transition-colors p-1"
            title="Delete Player"
        >
            <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* IMAGE AREA */}
      <div className="relative w-full aspect-square bg-slate-950 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
        {player.image_url ? (
            <Image 
                src={player.image_url} 
                alt={player.name} 
                fill 
                className="object-cover"
                sizes="300px"
            />
        ) : (
            <ImageIcon className="text-slate-700 w-12 h-12" />
        )}
      </div>

      {/* EDIT URL TOOL */}
      <div className="space-y-2">
        {isEditing ? (
            <div className="flex gap-2">
                <input 
                    type="text" 
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    placeholder="Paste Image URL..."
                />
                <button onClick={handleUpdate} className="bg-green-600 text-white p-1 rounded hover:bg-green-500"><Save className="w-4 h-4" /></button>
                <button onClick={() => setIsEditing(false)} className="bg-slate-700 text-white p-1 rounded hover:bg-slate-600"><X className="w-4 h-4" /></button>
            </div>
        ) : (
            <button 
                onClick={() => setIsEditing(true)}
                className="w-full text-xs font-bold text-blue-400 hover:text-blue-300 py-1 border border-blue-900/50 rounded hover:bg-blue-900/20"
            >
                {player.image_url ? 'Change Photo' : 'Add Photo'}
            </button>
        )}
      </div>

    </div>
  )
}