'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Skull, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'

const CAMPAIGN_KEY = 's2s_survival_launch_seen_2026_02_18'
const ACTIVE_DATES = new Set(['2026-02-18', '2026-02-19'])

export default function SurvivalLaunchPopup() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  useEffect(() => {
    if (!pathname || pathname.startsWith('/survival') || pathname.startsWith('/auth/callback')) {
      return
    }

    const seen = localStorage.getItem(CAMPAIGN_KEY)
    if (seen) return

    const gameDate = new Date(Date.now() - TIMEZONE_OFFSET_MS).toISOString().split('T')[0]
    if (!ACTIVE_DATES.has(gameDate)) return

    localStorage.setItem(CAMPAIGN_KEY, '1')
    setOpen(true)
  }, [pathname])

  const closePopup = () => setOpen(false)

  const handleJoin = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const { data: activeTournament } = await supabase
        .from('survival_tournaments')
        .select('id')
        .eq('is_active', true)
        .maybeSingle()

      if (activeTournament) {
        const { data: participant } = await supabase
          .from('survival_participants')
          .select('id')
          .eq('tournament_id', activeTournament.id)
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (participant) {
          setOpen(false)
          setLoading(false)
          router.push('/survival')
          return
        }
      }

      setOpen(false)
      setLoading(false)
      router.push('/survival')
      return
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/survival?autojoin=1')}`
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-gradient-to-br from-neutral-950 via-red-950/60 to-orange-950/60 border border-red-500/40 rounded-2xl shadow-[0_0_40px_rgba(220,38,38,0.25)] relative overflow-hidden">
        <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />

        <button
          onClick={closePopup}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 p-6 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <Skull className="w-8 h-8 text-red-500" />
          </div>

          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              Survival Mode Is Live
            </h2>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-neutral-300">
              10 Days. Daily Cuts. Last Player Standing.
            </p>
          </div>

          <Button
            onClick={handleJoin}
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-red-700 to-orange-600 hover:from-red-600 hover:to-orange-500 text-white font-black uppercase tracking-widest shadow-xl border border-red-400/40"
          >
            {loading ? 'Loading...' : 'Join Survival Mode'}
          </Button>

          <button
            onClick={closePopup}
            className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  )
}
