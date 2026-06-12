import Link from 'next/link'
import type { ReactNode } from 'react'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { GROWTH_THEMES, getCurrentGrowthTheme, getUpcomingGrowthThemes } from '@/lib/growth'

type DailyResultRow = {
  created_at: string
  game_date: string | null
  user_id: string | null
  guest_id: string | null
  sport: string | null
  score: number | null
}

type GrowthEventRow = {
  created_at: string
  event_name: string
  user_id: string | null
  guest_id: string | null
  sport: string | null
  metadata: Record<string, string | number | boolean | null> | null
}

type OutreachMessageRow = {
  status: string
  campaign_url: string
  sent_at: string | null
  created_at: string
  outreach_campaigns: { key: string; name: string; utm_campaign: string } | { key: string; name: string; utm_campaign: string }[] | null
  outreach_targets: { id: string; display_name: string; email: string | null } | { id: string; display_name: string; email: string | null }[] | null
}

type SocialPostRow = {
  id: string
  platform: string
  post_type: string
  status: string
  published_at: string | null
  created_at: string
  social_campaigns: { key: string; name: string; utm_campaign: string } | { key: string; name: string; utm_campaign: string }[] | null
}

const PERIODS = [7, 30, 60, 90]
const DAILY_RESULT_LIMIT = 10000
const EVENT_LIMIT = 20000
function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function isAfter(value: string, start: Date) {
  return new Date(value).getTime() >= start.getTime()
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

function countEvents(events: GrowthEventRow[], name: string) {
  return events.filter((event) => event.event_name === name).length
}

function getWeekStart(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = start.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setUTCDate(start.getUTCDate() + diff)
  return start.toISOString().split('T')[0]
}

function getCampaignKey(event: GrowthEventRow) {
  const metadata = event.metadata || {}
  return String(metadata.utm_campaign || metadata.theme || metadata.school || 'uncategorized')
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const userEmail = user?.email
  const isAuthorized = user && adminEmail && userEmail?.toLowerCase() === adminEmail.toLowerCase()

  return { isAuthorized, userEmail, adminEmail }
}

export default async function GrowthAdminPage() {
  const { isAuthorized, userEmail, adminEmail } = await requireAdmin()

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black text-white p-8 font-mono flex flex-col items-center justify-center">
        <h1 className="text-red-500 text-4xl font-black italic uppercase mb-4">Access Denied</h1>
        <p className="text-slate-500">Authenticated as: {userEmail || 'Guest'}</p>
        <p className="text-slate-700 text-sm mt-2">Required: {adminEmail || 'Not Set'}</p>
      </div>
    )
  }

  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const since90 = daysAgo(90).toISOString()
  const [
    profilesReq,
    pushReq,
    survivalReq,
    dailyReq,
    eventsReq,
    squadsReq,
    outreachReq,
    socialReq,
  ] = await Promise.all([
    adminDb.from('profiles').select('id', { count: 'exact', head: true }),
    adminDb.from('push_subscriptions').select('id', { count: 'exact', head: true }),
    adminDb.from('survival_participants').select('id', { count: 'exact', head: true }),
    adminDb
      .from('daily_results')
      .select('created_at, game_date, user_id, guest_id, sport, score')
      .gte('created_at', since90)
      .order('created_at', { ascending: false })
      .limit(DAILY_RESULT_LIMIT),
    adminDb
      .from('growth_events')
      .select('created_at, event_name, user_id, guest_id, sport, metadata')
      .gte('created_at', since90)
      .order('created_at', { ascending: false })
      .limit(EVENT_LIMIT),
    adminDb.from('squad_members').select('id', { count: 'exact', head: true }),
    adminDb
      .from('outreach_messages')
      .select('status, campaign_url, sent_at, created_at, outreach_campaigns(key, name, utm_campaign), outreach_targets(id, display_name, email)')
      .gte('created_at', since90)
      .order('created_at', { ascending: false })
      .limit(2000),
    adminDb
      .from('social_posts')
      .select('id, platform, post_type, status, published_at, created_at, social_campaigns(key, name, utm_campaign)')
      .gte('created_at', since90)
      .order('created_at', { ascending: false })
      .limit(2000),
  ])

  const dailyResults = (dailyReq.data || []) as DailyResultRow[]
  const events = (eventsReq.data || []) as GrowthEventRow[]
  const outreachMessages = (outreachReq.data || []) as OutreachMessageRow[]
  const socialPosts = (socialReq.data || []) as SocialPostRow[]
  const mayBeTruncated = dailyResults.length === DAILY_RESULT_LIMIT || events.length === EVENT_LIMIT

  const periodStats = PERIODS.map((days) => {
    const start = daysAgo(days)
    const periodResults = dailyResults.filter((row) => isAfter(row.created_at, start))
    const periodEvents = events.filter((row) => isAfter(row.created_at, start))
    const registered = new Set(periodResults.filter((row) => row.user_id).map((row) => row.user_id as string))
    const guests = new Set(periodResults.filter((row) => row.guest_id).map((row) => row.guest_id as string))
    const returningDays = new Map<string, Set<string>>()

    for (const row of periodResults) {
      if (!row.user_id || !row.game_date) continue
      if (!returningDays.has(row.user_id)) returningDays.set(row.user_id, new Set())
      returningDays.get(row.user_id)?.add(row.game_date)
    }

    return {
      days,
      submissions: periodResults.length,
      activeRegistered: registered.size,
      activeGuests: guests.size,
      returningTwoPlus: Array.from(returningDays.values()).filter((dates) => dates.size >= 2).length,
      gameStarts: countEvents(periodEvents, 'game_started'),
      gameFinishes: countEvents(periodEvents, 'game_finished'),
      claimCompletions: countEvents(periodEvents, 'claim_completed'),
      pushSubscriptions: countEvents(periodEvents, 'push_subscribed'),
      shareCompletions: countEvents(periodEvents, 'share_completed'),
      shareLandings: countEvents(periodEvents, 'shared_link_landed'),
      campaignLandings: countEvents(periodEvents, 'campaign_landed'),
      survivalJoins: countEvents(periodEvents, 'survival_joined'),
    }
  })

  const weekMap = new Map<string, {
    weekStart: string
    starts: number
    finishes: number
    claims: number
    shares: number
    survival: number
    activeRegistered: Set<string>
  }>()

  for (const row of dailyResults) {
    const weekStart = getWeekStart(new Date(row.created_at))
    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, { weekStart, starts: 0, finishes: 0, claims: 0, shares: 0, survival: 0, activeRegistered: new Set() })
    }
    if (row.user_id) weekMap.get(weekStart)?.activeRegistered.add(row.user_id)
  }

  for (const event of events) {
    const weekStart = getWeekStart(new Date(event.created_at))
    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, { weekStart, starts: 0, finishes: 0, claims: 0, shares: 0, survival: 0, activeRegistered: new Set() })
    }
    const week = weekMap.get(weekStart)
    if (!week) continue
    if (event.event_name === 'game_started') week.starts += 1
    if (event.event_name === 'game_finished') week.finishes += 1
    if (event.event_name === 'claim_completed') week.claims += 1
    if (event.event_name === 'share_completed') week.shares += 1
    if (event.event_name === 'survival_joined') week.survival += 1
  }

  const weeklyRows = Array.from(weekMap.values())
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, 8)

  const campaignMap = new Map<string, {
    key: string
    landings: number
    starts: number
    finishes: number
    shares: number
    claims: number
  }>()

  for (const event of events) {
    const key = getCampaignKey(event)
    if (key === 'uncategorized') continue
    if (!campaignMap.has(key)) {
      campaignMap.set(key, { key, landings: 0, starts: 0, finishes: 0, shares: 0, claims: 0 })
    }
    const campaign = campaignMap.get(key)
    if (!campaign) continue
    if (event.event_name === 'campaign_landed' || event.event_name === 'shared_link_landed') campaign.landings += 1
    if (event.event_name === 'game_started') campaign.starts += 1
    if (event.event_name === 'game_finished') campaign.finishes += 1
    if (event.event_name === 'share_completed') campaign.shares += 1
    if (event.event_name === 'claim_completed') campaign.claims += 1
  }

  const campaignRows = Array.from(campaignMap.values())
    .sort((a, b) => (b.landings + b.starts + b.shares) - (a.landings + a.starts + a.shares))
    .slice(0, 12)

  const outreachMap = new Map<string, { key: string; name: string; drafted: number; approved: number; sent: number; failed: number; landings: number; starts: number; claims: number; shares: number }>()
  for (const message of outreachMessages) {
    const campaign = Array.isArray(message.outreach_campaigns) ? message.outreach_campaigns[0] : message.outreach_campaigns
    const key = campaign?.utm_campaign || campaign?.key || 'unknown'
    if (!outreachMap.has(key)) {
      outreachMap.set(key, { key, name: campaign?.name || key, drafted: 0, approved: 0, sent: 0, failed: 0, landings: 0, starts: 0, claims: 0, shares: 0 })
    }
    const row = outreachMap.get(key)
    if (!row) continue
    if (message.status === 'drafted') row.drafted += 1
    if (message.status === 'approved') row.approved += 1
    if (message.status === 'sent') row.sent += 1
    if (message.status === 'failed') row.failed += 1
  }

  for (const event of events) {
    const metadata = event.metadata || {}
    const key = String(metadata.utm_campaign || '')
    const outreachTarget = metadata.outreach_target
    if (!key || !outreachTarget) continue
    if (!outreachMap.has(key)) {
      outreachMap.set(key, { key, name: key, drafted: 0, approved: 0, sent: 0, failed: 0, landings: 0, starts: 0, claims: 0, shares: 0 })
    }
    const row = outreachMap.get(key)
    if (!row) continue
    if (event.event_name === 'campaign_landed' || event.event_name === 'shared_link_landed') row.landings += 1
    if (event.event_name === 'game_started') row.starts += 1
    if (event.event_name === 'claim_completed') row.claims += 1
    if (event.event_name === 'share_completed') row.shares += 1
  }

  const outreachRows = Array.from(outreachMap.values()).sort((a, b) => b.sent + b.landings - (a.sent + a.landings)).slice(0, 12)
  const outreachTargetMap = new Map<string, { id: string; name: string; sent: number; landings: number; starts: number; claims: number; shares: number }>()

  for (const message of outreachMessages) {
    const target = Array.isArray(message.outreach_targets) ? message.outreach_targets[0] : message.outreach_targets
    if (!target?.id) continue
    if (!outreachTargetMap.has(target.id)) outreachTargetMap.set(target.id, { id: target.id, name: target.display_name, sent: 0, landings: 0, starts: 0, claims: 0, shares: 0 })
    const row = outreachTargetMap.get(target.id)
    if (row && message.status === 'sent') row.sent += 1
  }

  for (const event of events) {
    const metadata = event.metadata || {}
    const targetId = String(metadata.outreach_target || '')
    if (!targetId) continue
    if (!outreachTargetMap.has(targetId)) outreachTargetMap.set(targetId, { id: targetId, name: targetId, sent: 0, landings: 0, starts: 0, claims: 0, shares: 0 })
    const row = outreachTargetMap.get(targetId)
    if (!row) continue
    if (event.event_name === 'campaign_landed' || event.event_name === 'shared_link_landed') row.landings += 1
    if (event.event_name === 'game_started') row.starts += 1
    if (event.event_name === 'claim_completed') row.claims += 1
    if (event.event_name === 'share_completed') row.shares += 1
  }

  const outreachTargetRows = Array.from(outreachTargetMap.values()).sort((a, b) => b.starts + b.landings - (a.starts + a.landings)).slice(0, 12)
  const socialMap = new Map<string, {
    key: string
    name: string
    platform: string
    postType: string
    drafted: number
    approved: number
    posted: number
    failed: number
    landings: number
    starts: number
    finishes: number
    claims: number
    shares: number
    survival: number
  }>()

  for (const post of socialPosts) {
    const campaign = Array.isArray(post.social_campaigns) ? post.social_campaigns[0] : post.social_campaigns
    const key = `${post.id}`
    if (!socialMap.has(key)) {
      socialMap.set(key, {
        key,
        name: campaign?.name || campaign?.utm_campaign || post.id,
        platform: post.platform,
        postType: post.post_type,
        drafted: 0,
        approved: 0,
        posted: 0,
        failed: 0,
        landings: 0,
        starts: 0,
        finishes: 0,
        claims: 0,
        shares: 0,
        survival: 0,
      })
    }
    const row = socialMap.get(key)
    if (!row) continue
    if (post.status === 'drafted') row.drafted += 1
    if (post.status === 'approved' || post.status === 'scheduled') row.approved += 1
    if (post.status === 'posted') row.posted += 1
    if (post.status === 'failed') row.failed += 1
  }

  for (const event of events) {
    const metadata = event.metadata || {}
    const postId = String(metadata.social_post_id || '')
    if (!postId) continue
    if (!socialMap.has(postId)) {
      socialMap.set(postId, {
        key: postId,
        name: String(metadata.utm_campaign || postId),
        platform: String(metadata.utm_source || 'social'),
        postType: String(metadata.post_type || metadata.utm_content || 'unknown'),
        drafted: 0,
        approved: 0,
        posted: 0,
        failed: 0,
        landings: 0,
        starts: 0,
        finishes: 0,
        claims: 0,
        shares: 0,
        survival: 0,
      })
    }
    const row = socialMap.get(postId)
    if (!row) continue
    if (event.event_name === 'campaign_landed' || event.event_name === 'shared_link_landed' || event.event_name === 'social_link_landed') row.landings += 1
    if (event.event_name === 'game_started') row.starts += 1
    if (event.event_name === 'game_finished') row.finishes += 1
    if (event.event_name === 'claim_completed') row.claims += 1
    if (event.event_name === 'share_completed') row.shares += 1
    if (event.event_name === 'survival_joined') row.survival += 1
  }

  const socialRows = Array.from(socialMap.values())
    .sort((a, b) => (b.starts + b.landings + b.shares + b.posted) - (a.starts + a.landings + a.shares + a.posted))
    .slice(0, 16)

  const currentTheme = getCurrentGrowthTheme()
  const upcomingThemes = getUpcomingGrowthThemes(8)
  const thirtyDay = periodStats.find((row) => row.days === 30) || periodStats[0]

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Admin</p>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Growth Dashboard</h1>
            <p className="text-slate-400 mt-2 max-w-3xl">
              Weekly operating readout for the lean growth org: starts, claims, shares, push, Survival, squads, and campaign landing quality.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/social" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:border-cyan-300 hover:text-cyan-200">
              Social
            </Link>
            <Link href="/admin/outreach" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:border-cyan-300 hover:text-cyan-200">
              Outreach
            </Link>
            <Link href="/admin" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:border-cyan-300 hover:text-cyan-200">
              Roster Audit
            </Link>
            <Link href="/daily?utm_source=admin&utm_medium=ops&utm_campaign=dashboard_test&utm_content=football" className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-cyan-200">
              Test UTM
            </Link>
          </div>
        </header>

        {(dailyReq.error || eventsReq.error || squadsReq.error || outreachReq.error || socialReq.error) && (
          <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Some dashboard data could not be loaded. Daily: {dailyReq.error?.message || 'ok'}; events: {eventsReq.error?.message || 'ok'}; squads: {squadsReq.error?.message || 'ok'}; outreach: {outreachReq.error?.message || 'ok'}; social: {socialReq.error?.message || 'ok'}.
          </section>
        )}

        {mayBeTruncated && (
          <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Dashboard reads are capped at {formatNumber(DAILY_RESULT_LIMIT)} daily results and {formatNumber(EVENT_LIMIT)} growth events. Use the SQL report for exact high-volume reconciliation.
          </section>
        )}

        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Metric label="Profiles" value={profilesReq.count || 0} />
          <Metric label="30d Actives" value={thirtyDay.activeRegistered} />
          <Metric label="Push Subs" value={pushReq.count || 0} />
          <Metric label="Survival Players" value={survivalReq.count || 0} />
          <Metric label="Squad Members" value={squadsReq.count || 0} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="text-lg font-black uppercase tracking-tight">Funnel Windows</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="text-xs uppercase tracking-widest text-slate-500">
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-2">Window</th>
                    <th className="text-right py-2">Registered</th>
                    <th className="text-right py-2">Guests</th>
                    <th className="text-right py-2">2+ Days</th>
                    <th className="text-right py-2">Starts</th>
                    <th className="text-right py-2">Finishes</th>
                    <th className="text-right py-2">Claims</th>
                    <th className="text-right py-2">Shares</th>
                    <th className="text-right py-2">Landings</th>
                    <th className="text-right py-2">Survival</th>
                  </tr>
                </thead>
                <tbody>
                  {periodStats.map((row) => (
                    <tr key={row.days} className="border-b border-slate-900">
                      <td className="py-3 font-black">{row.days}d</td>
                      <td className="py-3 text-right">{formatNumber(row.activeRegistered)}</td>
                      <td className="py-3 text-right">{formatNumber(row.activeGuests)}</td>
                      <td className="py-3 text-right">{formatNumber(row.returningTwoPlus)}</td>
                      <td className="py-3 text-right">{formatNumber(row.gameStarts)}</td>
                      <td className="py-3 text-right">{formatNumber(row.gameFinishes)}</td>
                      <td className="py-3 text-right">{formatNumber(row.claimCompletions)}</td>
                      <td className="py-3 text-right">{formatNumber(row.shareCompletions)}</td>
                      <td className="py-3 text-right">{formatNumber(row.shareLandings + row.campaignLandings)}</td>
                      <td className="py-3 text-right">{formatNumber(row.survivalJoins)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200/80">This Week</p>
            <h2 className="text-2xl font-black uppercase tracking-tight mt-1">{currentTheme.name}</h2>
            <p className="mt-2 text-sm text-cyan-100/75 leading-relaxed">{currentTheme.description}</p>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-200/80">Suggested Posts</p>
              {currentTheme.socialPrompts.map((prompt) => (
                <div key={prompt} className="rounded-lg border border-cyan-300/15 bg-black/20 p-3 text-sm text-cyan-50">
                  {prompt}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TableCard title="Weekly Scoreboard">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2">Week</th>
                  <th className="text-right py-2">Actives</th>
                  <th className="text-right py-2">Starts</th>
                  <th className="text-right py-2">Finishes</th>
                  <th className="text-right py-2">Claims</th>
                  <th className="text-right py-2">Shares</th>
                </tr>
              </thead>
              <tbody>
                {weeklyRows.map((row) => (
                  <tr key={row.weekStart} className="border-b border-slate-900">
                    <td className="py-3 font-bold">{row.weekStart}</td>
                    <td className="py-3 text-right">{row.activeRegistered.size}</td>
                    <td className="py-3 text-right">{row.starts}</td>
                    <td className="py-3 text-right">{row.finishes}</td>
                    <td className="py-3 text-right">{row.claims}</td>
                    <td className="py-3 text-right">{row.shares}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          <TableCard title="Campaign Performance">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-slate-500">
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2">Campaign</th>
                  <th className="text-right py-2">Land</th>
                  <th className="text-right py-2">Start</th>
                  <th className="text-right py-2">Finish</th>
                  <th className="text-right py-2">Share</th>
                  <th className="text-right py-2">Claim</th>
                </tr>
              </thead>
              <tbody>
                {campaignRows.length > 0 ? campaignRows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-900">
                    <td className="py-3 font-bold">{row.key}</td>
                    <td className="py-3 text-right">{row.landings}</td>
                    <td className="py-3 text-right">{row.starts}</td>
                    <td className="py-3 text-right">{row.finishes}</td>
                    <td className="py-3 text-right">{row.shares}</td>
                    <td className="py-3 text-right">{row.claims}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">No campaign traffic tracked yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>
        </section>

        <TableCard title="Outreach Campaigns">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="text-xs uppercase tracking-widest text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="text-left py-2">Campaign</th>
                <th className="text-right py-2">Draft</th>
                <th className="text-right py-2">Approved</th>
                <th className="text-right py-2">Sent</th>
                <th className="text-right py-2">Failed</th>
                <th className="text-right py-2">Land</th>
                <th className="text-right py-2">Start</th>
                <th className="text-right py-2">Claim</th>
                <th className="text-right py-2">Share</th>
              </tr>
            </thead>
            <tbody>
              {outreachRows.length > 0 ? outreachRows.map((row) => (
                <tr key={row.key} className="border-b border-slate-900">
                  <td className="py-3 font-bold">{row.name}</td>
                  <td className="py-3 text-right">{row.drafted}</td>
                  <td className="py-3 text-right">{row.approved}</td>
                  <td className="py-3 text-right">{row.sent}</td>
                  <td className="py-3 text-right">{row.failed}</td>
                  <td className="py-3 text-right">{row.landings}</td>
                  <td className="py-3 text-right">{row.starts}</td>
                  <td className="py-3 text-right">{row.claims}</td>
                  <td className="py-3 text-right">{row.shares}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500">No outreach campaigns yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Social Autopilot">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="text-xs uppercase tracking-widest text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="text-left py-2">Post</th>
                <th className="text-left py-2">Platform</th>
                <th className="text-right py-2">Draft</th>
                <th className="text-right py-2">Ready</th>
                <th className="text-right py-2">Posted</th>
                <th className="text-right py-2">Failed</th>
                <th className="text-right py-2">Land</th>
                <th className="text-right py-2">Start</th>
                <th className="text-right py-2">Finish</th>
                <th className="text-right py-2">Claim</th>
                <th className="text-right py-2">Share</th>
                <th className="text-right py-2">Survival</th>
              </tr>
            </thead>
            <tbody>
              {socialRows.length > 0 ? socialRows.map((row) => (
                <tr key={row.key} className="border-b border-slate-900">
                  <td className="py-3">
                    <p className="font-bold text-white">{row.name}</p>
                    <p className="text-xs text-slate-500">{row.postType}</p>
                  </td>
                  <td className="py-3 text-slate-300">{row.platform}</td>
                  <td className="py-3 text-right">{row.drafted}</td>
                  <td className="py-3 text-right">{row.approved}</td>
                  <td className="py-3 text-right">{row.posted}</td>
                  <td className="py-3 text-right">{row.failed}</td>
                  <td className="py-3 text-right">{row.landings}</td>
                  <td className="py-3 text-right">{row.starts}</td>
                  <td className="py-3 text-right">{row.finishes}</td>
                  <td className="py-3 text-right">{row.claims}</td>
                  <td className="py-3 text-right">{row.shares}</td>
                  <td className="py-3 text-right">{row.survival}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-slate-500">No social posts or attributed social traffic yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Outreach Target Attribution">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-xs uppercase tracking-widest text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="text-left py-2">Target</th>
                <th className="text-right py-2">Sent</th>
                <th className="text-right py-2">Land</th>
                <th className="text-right py-2">Start</th>
                <th className="text-right py-2">Claim</th>
                <th className="text-right py-2">Share</th>
              </tr>
            </thead>
            <tbody>
              {outreachTargetRows.length > 0 ? outreachTargetRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-900">
                  <td className="py-3 font-bold">{row.name}</td>
                  <td className="py-3 text-right">{row.sent}</td>
                  <td className="py-3 text-right">{row.landings}</td>
                  <td className="py-3 text-right">{row.starts}</td>
                  <td className="py-3 text-right">{row.claims}</td>
                  <td className="py-3 text-right">{row.shares}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">No outreach target attribution yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </TableCard>

        <section className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-4">
          <TableCard title="UTM Links">
            <div className="space-y-3 text-sm">
              <CodeLine value="/daily?utm_source=tiktok&utm_medium=social&utm_campaign=daily_challenge&utm_content=football" />
              <CodeLine value="/daily/basketball?school=Duke&utm_source=instagram&utm_medium=social&utm_campaign=school_spotlight&utm_content=duke" />
              <CodeLine value="/survival?utm_source=x&utm_medium=social&utm_campaign=weekly_survival&utm_content=sunday_join" />
              <CodeLine value="/daily?utm_source=x&utm_medium=social&utm_campaign=school_spotlight_alabama&utm_content=<social_post_id>&social_post_id=<social_post_id>" />
            </div>
          </TableCard>

          <TableCard title="Theme Calendar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingThemes.map(({ weekStart, theme }) => (
                <div key={`${weekStart}-${theme.key}`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{weekStart}</p>
                  <p className="font-black uppercase tracking-tight text-white">{theme.shortName}</p>
                  <p className="mt-1 text-xs text-slate-400">{theme.sportFocus}</p>
                </div>
              ))}
            </div>
          </TableCard>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-lg font-black uppercase tracking-tight">Theme Library</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {GROWTH_THEMES.map((theme) => (
              <div key={theme.key} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{theme.key}</p>
                <h3 className="mt-1 font-black uppercase tracking-tight">{theme.name}</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">{theme.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{formatNumber(value)}</p>
    </div>
  )
}

function TableCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 overflow-x-auto">
      <h2 className="text-lg font-black uppercase tracking-tight mb-4">{title}</h2>
      {children}
    </section>
  )
}

function CodeLine({ value }: { value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-black/40 p-3 font-mono text-xs text-cyan-100 break-all">
      {value}
    </div>
  )
}
