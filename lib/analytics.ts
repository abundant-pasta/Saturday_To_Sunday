import { track } from '@vercel/analytics/react'

type AnalyticsValue = string | number | boolean | null

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function trackEvent(name: string, properties?: Record<string, AnalyticsValue>) {
  const cleanProperties = compactProperties(properties)
  track(name, cleanProperties)

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, cleanProperties)
  }
}

export function trackGrowthEvent(
  eventName: string,
  properties?: Record<string, AnalyticsValue>,
  context?: { guestId?: string | null; sport?: string | null }
) {
  trackEvent(eventName, properties)

  if (typeof window === 'undefined') return

  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      event_name: eventName,
      guest_id: context?.guestId || null,
      sport: context?.sport || null,
      metadata: compactProperties(properties),
    }),
  }).catch(() => {
    // Analytics should never block game play.
  })
}

function compactProperties(properties?: Record<string, AnalyticsValue>) {
  if (!properties) return {}
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== null && value !== undefined && value !== '')
  ) as Record<string, string | number | boolean>
}
