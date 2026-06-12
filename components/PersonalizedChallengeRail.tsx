'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Dribbble, Flame, Shield, Star, Trophy } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import type { PersonalizedChallengeCard } from '@/lib/personalization'

type PersonalizedChallengeRailProps = {
  cards: PersonalizedChallengeCard[]
  loading?: boolean
}

const CARD_STYLES = {
  football: {
    border: 'border-[#00ff80]/25 hover:border-[#00ff80]/50',
    iconBg: 'bg-[#00ff80]/10 border border-[#00ff80]/20',
    iconColor: 'text-[#00ff80]',
    chip: 'bg-[#00ff80]/10 text-[#00ff80]',
  },
  basketball: {
    border: 'border-amber-500/25 hover:border-amber-400/50',
    iconBg: 'bg-amber-500/10 border border-amber-500/20',
    iconColor: 'text-amber-400',
    chip: 'bg-amber-500/10 text-amber-300',
  },
} as const

function getCardIcon(kind: PersonalizedChallengeCard['kind']) {
  if (kind === 'school') return Trophy
  if (kind === 'conference') return Shield
  if (kind === 'team') return Star
  return Flame
}

export default function PersonalizedChallengeRail({ cards, loading = false }: PersonalizedChallengeRailProps) {
  const hasTrackedImpression = useRef(false)

  useEffect(() => {
    if (loading || cards.length === 0 || hasTrackedImpression.current) return
    hasTrackedImpression.current = true

    trackEvent('challenge_rail_impression', {
      count: cards.length,
      first_kind: cards[0]?.kind || null,
      first_sport: cards[0]?.sport || null,
    })
  }, [cards, loading])

  if (loading) {
    return (
      <div className="w-full mb-3">
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 animate-pulse">
          <div className="h-3 w-28 bg-neutral-800 rounded mb-3" />
          <div className="grid gap-3">
            {[0, 1].map((item) => (
              <div key={item} className="h-24 rounded-xl bg-neutral-800/70" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (cards.length === 0) return null

  return (
    <div className="w-full mb-3">
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Personalized Challenges</h3>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Tailored to your favorites</p>
          </div>
          <div className="px-2 py-1 rounded-full bg-neutral-800 text-[9px] font-black uppercase tracking-widest text-neutral-400">
            Signed In
          </div>
        </div>

        <div className="grid gap-3">
          {cards.map((card) => {
            const Icon = card.sport === 'basketball' ? Dribbble : getCardIcon(card.kind)
            const styles = CARD_STYLES[card.sport]

            return (
              <Link
                key={card.id}
                href={card.href}
                onClick={() => {
                  trackEvent('challenge_card_click', {
                    kind: card.kind,
                    sport: card.sport,
                    match_count: card.matchCount,
                  })
                }}
                className={`group block rounded-2xl border ${styles.border} bg-gradient-to-r from-neutral-900 to-neutral-950 p-4 transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 rounded-xl p-3 ${styles.iconBg}`}>
                    <Icon className={`w-5 h-5 ${styles.iconColor}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${styles.chip}`}>
                        {card.sport}
                      </span>
                      {card.matchCount > 0 && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                          {card.matchCount} match{card.matchCount === 1 ? '' : 'es'}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-black text-white uppercase tracking-tight leading-tight">
                      {card.title}
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed mt-1">
                      {card.subtitle}
                    </p>
                  </div>

                  <div className="shrink-0 self-center text-neutral-500 group-hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
