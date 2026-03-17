'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X, Skull, Users, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'

const CAMPAIGN_KEY = 's2s_whats_new_march_2026_seen'

export default function WhatsNewPopup() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!pathname || pathname.startsWith('/auth/callback')) return
    const seen = localStorage.getItem(CAMPAIGN_KEY)
    if (seen) return
    localStorage.setItem(CAMPAIGN_KEY, '1')
    setOpen(true)
  }, [pathname])

  if (!open) return null

  const features = [
    {
      icon: <Skull className="w-5 h-5 text-red-400" />,
      bg: 'bg-red-500/10 border-red-500/20',
      title: 'Survival Mode — March Madness',
      desc: 'A 5-day elimination tournament kicks off this Thursday with tip-off. Join now before it starts.',
    },
    {
      icon: <Users className="w-5 h-5 text-blue-400" />,
      bg: 'bg-blue-500/10 border-blue-500/20',
      title: 'Challenge Your Friends',
      desc: "The 'Challenge' popup is fixed and working — send a direct challenge and see who really knows their college hoops.",
    },
    {
      icon: <Trophy className="w-5 h-5 text-yellow-400" />,
      bg: 'bg-yellow-500/10 border-yellow-500/20',
      title: 'Awards — All Your Achievements',
      desc: 'Head to your profile to see every award you\'ve earned. Streaks, podium finishes, survival runs — it\'s all there.',
    },
  ]

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl relative overflow-hidden">

        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 text-neutral-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">What's New</p>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-tight">
              A few things I've been working on
            </h2>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${f.bg}`}>
                <div className="mt-0.5 shrink-0">{f.icon}</div>
                <div>
                  <p className="text-sm font-black text-white leading-tight">{f.title}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sign-off */}
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Thanks for playing — means a lot that you're here. More coming soon.{' '}
            <span className="text-neutral-300 font-bold">— Matt</span>
          </p>

          {/* CTA */}
          <Button
            onClick={() => { setOpen(false); router.push('/survival') }}
            className="w-full h-11 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-xl"
          >
            Check Out Survival Mode
          </Button>

          <button
            onClick={() => setOpen(false)}
            className="w-full text-[11px] font-bold uppercase tracking-widest text-neutral-600 hover:text-neutral-400 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  )
}
