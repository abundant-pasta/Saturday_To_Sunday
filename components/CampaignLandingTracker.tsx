'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackGrowthEvent } from '@/lib/analytics'

export default function CampaignLandingTracker({ sport, eventName = 'campaign_landed' }: { sport?: 'football' | 'basketball' | null; eventName?: 'campaign_landed' | 'social_link_landed' }) {
  const searchParams = useSearchParams()
  const trackedRef = useRef(false)
  const metadata = useMemo(() => {
    const utmSource = searchParams.get('utm_source')
    const utmMedium = searchParams.get('utm_medium')
    const utmCampaign = searchParams.get('utm_campaign')
    const utmContent = searchParams.get('utm_content')
    const socialPostId = searchParams.get('social_post_id')

    return {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      school: searchParams.get('school'),
      theme: searchParams.get('theme') || utmCampaign,
      outreach_target: searchParams.get('outreach_target'),
      social_post_id: socialPostId,
    }
  }, [searchParams])

  useEffect(() => {
    if (trackedRef.current) return
    if (!metadata.utm_source && !metadata.utm_medium && !metadata.utm_campaign && !metadata.social_post_id) return
    trackedRef.current = true
    const landingEvent = metadata.social_post_id || metadata.utm_medium === 'social' ? 'social_link_landed' : eventName
    trackGrowthEvent(landingEvent, metadata, { sport: sport || undefined })
  }, [eventName, metadata, sport])

  return null
}
