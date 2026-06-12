'use client'

import { useMemo, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { BarChart3, CalendarClock, CheckCircle, Copy, Download, ExternalLink, Megaphone, RefreshCw, Send, SkipForward } from 'lucide-react'
import {
  approveSocialPost,
  copySocialPost,
  generateSocialDrafts,
  markSocialPostPosted,
  publishApprovedXPosts,
  refreshSocialMetrics,
  regenerateSocialPost,
  skipSocialPost,
  updateSocialPost,
} from '@/app/actions/social'
import { Button } from '@/components/ui/button'
import { GROWTH_THEMES } from '@/lib/growth'
import {
  formatPlatform,
  formatPostType,
  generatePostingPack,
  getPlatformAutomationConfig,
  getSocialAssetUrl,
  type SocialPlatform,
  type SocialPostType,
  type SocialSport,
} from '@/lib/social'

type Account = {
  id: string
  platform: SocialPlatform
  handle: string
  status: string
  publish_capability: string
  metadata: Record<string, unknown> | null
}

type Campaign = {
  id: string
  key: string
  name: string
  theme_key: string | null
  school: string | null
  sport: SocialSport | null
  default_path: string
  utm_campaign: string
  status: string
}

type Post = {
  id: string
  campaign_id: string | null
  platform: SocialPlatform
  post_type: SocialPostType
  caption: string
  asset_url: string | null
  campaign_url: string
  short_script: string | null
  scheduled_at: string | null
  status: string
  approved_at: string | null
  published_at: string | null
  external_post_id: string | null
  error: string | null
  metadata: Record<string, any> | null
  created_at: string
  social_campaigns: Campaign | Campaign[] | null
}

type EventRow = {
  id: string
  event_name: string
  created_at: string
  metadata: Record<string, unknown> | null
}

type Props = {
  accounts: Account[]
  campaigns: Campaign[]
  posts: Post[]
  events: EventRow[]
  xPublishingConfigured: boolean
  platformReadiness: Record<SocialPlatform, boolean>
}

function getRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function statusClass(status: string) {
  if (status === 'posted' || status === 'approved' || status === 'scheduled' || status === 'connected') return 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10'
  if (status === 'failed' || status === 'disabled') return 'border-red-400/30 text-red-300 bg-red-400/10'
  if (status === 'skipped') return 'border-slate-700 text-slate-400 bg-slate-900'
  return 'border-cyan-400/30 text-cyan-200 bg-cyan-400/10'
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

export default function SocialAdminClient({ accounts, campaigns, posts, events, xPublishingConfigured, platformReadiness }: Props) {
  const [tab, setTab] = useState<'drafts' | 'calendar' | 'campaigns' | 'accounts' | 'published' | 'performance'>('drafts')
  const [filter, setFilter] = useState('')
  const [school, setSchool] = useState(campaigns[0]?.school || 'Alabama')
  const [sport, setSport] = useState<SocialSport>((campaigns[0]?.sport as SocialSport) || 'both')
  const [themeKey, setThemeKey] = useState(campaigns[0]?.theme_key || GROWTH_THEMES[0]?.key || 'school_spotlight')
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({})
  const [scheduleEdits, setScheduleEdits] = useState<Record<string, string>>({})
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredPosts = useMemo(() => posts.filter((post) => {
    const campaign = getRelation(post.social_campaigns)
    const haystack = `${post.caption} ${post.platform} ${post.post_type} ${campaign?.name || ''} ${campaign?.school || ''}`.toLowerCase()
    return haystack.includes(filter.toLowerCase())
  }), [filter, posts])

  const drafts = filteredPosts.filter((post) => ['drafted', 'approved', 'scheduled', 'failed'].includes(post.status))
  const calendar = filteredPosts.filter((post) => post.scheduled_at && post.status !== 'skipped')
  const published = filteredPosts.filter((post) => post.status === 'posted')
  const approved = posts.filter((post) => post.status === 'approved' || post.status === 'scheduled').length
  const failed = posts.filter((post) => post.status === 'failed').length
  const postedThisWeek = posts.filter((post) => post.published_at && new Date(post.published_at).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000).length
  const performance = posts.reduce((acc, post) => {
    const metrics = post.metadata?.metrics || {}
    acc.landings += Number(metrics.landings || 0)
    acc.starts += Number(metrics.starts || 0)
    acc.shares += Number(metrics.shares || 0)
    return acc
  }, { landings: 0, starts: 0, shares: 0 })

  const runAction = (label: string, action: () => Promise<any>) => {
    setLastResult(null)
    startTransition(async () => {
      try {
        const result = await action()
        setLastResult(`${label}: ${JSON.stringify(result)}`)
      } catch (error) {
        setLastResult(`${label} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
  }

  const copyPack = async (post: Post) => {
    const text = generatePostingPack({
      platform: post.platform,
      caption: draftEdits[post.id] ?? post.caption,
      campaignUrl: post.campaign_url,
      shortScript: post.short_script,
      postId: post.id,
    })
    await navigator.clipboard.writeText(text)
    runAction('Copied', () => copySocialPost(post.id))
  }

  const saveCaption = (post: Post) => {
    runAction('Saved', () => updateSocialPost(post.id, { caption: draftEdits[post.id] ?? post.caption }))
  }

  const schedulePost = (post: Post) => {
    const scheduledAt = scheduleEdits[post.id]
    if (!scheduledAt) {
      setLastResult('Pick a schedule time first.')
      return
    }
    runAction('Scheduled', () => updateSocialPost(post.id, { caption: draftEdits[post.id] ?? post.caption, scheduledAt: new Date(scheduledAt).toISOString() }))
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Metric label="Drafts" value={posts.filter((post) => post.status === 'drafted').length} />
        <Metric label="Ready" value={approved} />
        <Metric label="Posted 7d" value={postedThisWeek} />
        <Metric label="Failed" value={failed} />
        <Metric label="Starts" value={performance.starts} />
        <Metric label="Shares" value={performance.shares} />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['drafts', 'calendar', 'campaigns', 'accounts', 'published', 'performance'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`h-9 px-3 rounded-lg text-xs font-black uppercase tracking-widest border ${tab === item ? 'bg-cyan-300 text-slate-950 border-cyan-300' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search social"
              className="h-10 rounded-lg bg-slate-950 border border-slate-800 px-3 text-sm text-white focus:outline-none focus:border-cyan-300"
            />
            <ActionButton disabled={isPending} onClick={() => runAction('Drafts', () => generateSocialDrafts({ school, sport, themeKey }))} label="Generate Drafts" icon={<Megaphone className="w-4 h-4" />} />
            <ActionButton disabled={isPending} onClick={() => runAction('Metrics', () => refreshSocialMetrics())} label="Refresh Metrics" icon={<BarChart3 className="w-4 h-4" />} />
          </div>
        </div>
        {lastResult && (
          <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs text-cyan-100 break-words">
            {lastResult}
          </div>
        )}
      </section>

      {tab === 'drafts' && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {drafts.length === 0 && <Empty label="No social drafts yet. Generate the daily queue to create platform packs." />}
          {drafts.map((post) => <PostCard
            key={post.id}
            post={post}
            isPending={isPending}
            xPublishingConfigured={xPublishingConfigured}
            captionValue={draftEdits[post.id] ?? post.caption}
            scheduleValue={scheduleEdits[post.id] ?? ''}
            onCaptionChange={(value) => setDraftEdits((current) => ({ ...current, [post.id]: value }))}
            onScheduleChange={(value) => setScheduleEdits((current) => ({ ...current, [post.id]: value }))}
            onSave={() => saveCaption(post)}
            onApprove={() => runAction('Approved', () => approveSocialPost(post.id))}
            onSchedule={() => schedulePost(post)}
            onPublishX={() => runAction('Publish X', () => publishApprovedXPosts([post.id]))}
            onCopy={() => copyPack(post)}
            onMarkPosted={() => runAction('Marked posted', () => markSocialPostPosted(post.id))}
            onRegenerate={() => runAction('Regenerated', () => regenerateSocialPost(post.id))}
            onSkip={() => runAction('Skipped', () => skipSocialPost(post.id))}
          />)}
        </section>
      )}

      {tab === 'calendar' && (
        <TableCard>
          <thead className="text-xs uppercase tracking-widest text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2">Scheduled</th>
              <th className="text-left py-2">Post</th>
              <th className="text-left py-2">Campaign</th>
              <th className="text-right py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {calendar.map((post) => {
              const campaign = getRelation(post.social_campaigns)
              return (
                <tr key={post.id} className="border-b border-slate-900">
                  <td className="py-3 text-slate-300">{post.scheduled_at ? new Date(post.scheduled_at).toLocaleString() : '-'}</td>
                  <td className="py-3">
                    <p className="font-bold text-white">{formatPlatform(post.platform)} / {formatPostType(post.post_type)}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{post.caption}</p>
                  </td>
                  <td className="py-3 text-slate-300">{campaign?.name || '-'}</td>
                  <td className="py-3 text-right"><span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${statusClass(post.status)}`}>{post.status}</span></td>
                </tr>
              )
            })}
          </tbody>
        </TableCard>
      )}

      {tab === 'campaigns' && (
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight">Campaign Setup</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="School" value={school} onChange={setSchool} />
              <label className="space-y-1">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Sport</span>
                <select value={sport} onChange={(event) => setSport(event.target.value as SocialSport)} className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 px-3 text-sm text-white">
                  <option value="football">Football</option>
                  <option value="basketball">Basketball</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Theme</span>
                <select value={themeKey} onChange={(event) => setThemeKey(event.target.value)} className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 px-3 text-sm text-white">
                  {GROWTH_THEMES.map((theme) => <option key={theme.key} value={theme.key}>{theme.name}</option>)}
                </select>
              </label>
            </div>
          </div>
          <TableCard>
            <thead className="text-xs uppercase tracking-widest text-slate-500">
              <tr className="border-b border-slate-800">
                <th className="text-left py-2">Campaign</th>
                <th className="text-left py-2">Theme</th>
                <th className="text-left py-2">Path</th>
                <th className="text-left py-2">UTM</th>
                <th className="text-right py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-slate-900">
                  <td className="py-3 font-bold text-white">{campaign.name}</td>
                  <td className="py-3 text-slate-300">{campaign.theme_key || '-'}</td>
                  <td className="py-3 font-mono text-xs text-slate-400">{campaign.default_path}</td>
                  <td className="py-3 font-mono text-xs text-cyan-100">{campaign.utm_campaign}</td>
                  <td className="py-3 text-right">{campaign.status}</td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </section>
      )}

      {tab === 'accounts' && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} isReady={platformReadiness[account.platform]} />
          ))}
        </section>
      )}

      {tab === 'accounts' && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-lg font-black uppercase tracking-tight mb-4">Connector Roadmap</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {(['tiktok', 'instagram', 'youtube'] as SocialPlatform[]).map((platform) => {
              const config = getPlatformAutomationConfig(platform)
              return (
                <div key={platform} className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-cyan-200">{formatPlatform(platform)}</p>
                  <p className="mt-2 text-sm text-slate-300">{config.summary}</p>
                  <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-500">Next setup</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {config.requirements.slice(0, 3).map((requirement) => <li key={requirement}>- {requirement}</li>)}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {tab === 'published' && (
        <TableCard>
          <thead className="text-xs uppercase tracking-widest text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2">Published</th>
              <th className="text-left py-2">Post</th>
              <th className="text-left py-2">External</th>
              <th className="text-right py-2">Metrics</th>
            </tr>
          </thead>
          <tbody>
            {published.map((post) => {
              const metrics = post.metadata?.metrics || {}
              return (
                <tr key={post.id} className="border-b border-slate-900">
                  <td className="py-3 text-slate-300">{post.published_at ? new Date(post.published_at).toLocaleString() : '-'}</td>
                  <td className="py-3">
                    <p className="font-bold text-white">{formatPlatform(post.platform)} / {formatPostType(post.post_type)}</p>
                    <a href={post.campaign_url} target="_blank" rel="noreferrer" className="text-xs text-cyan-200 hover:text-cyan-100 inline-flex items-center gap-1">Campaign link <ExternalLink className="w-3 h-3" /></a>
                  </td>
                  <td className="py-3 font-mono text-xs text-slate-400">{post.external_post_id || '-'}</td>
                  <td className="py-3 text-right text-sm text-slate-300">{formatNumber(Number(metrics.starts || 0))} starts / {formatNumber(Number(metrics.shares || 0))} shares</td>
                </tr>
              )
            })}
          </tbody>
        </TableCard>
      )}

      {tab === 'performance' && (
        <TableCard>
          <thead className="text-xs uppercase tracking-widest text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2">Post</th>
              <th className="text-right py-2">Land</th>
              <th className="text-right py-2">Start</th>
              <th className="text-right py-2">Finish</th>
              <th className="text-right py-2">Claim</th>
              <th className="text-right py-2">Share</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const metrics = post.metadata?.metrics || {}
              return (
                <tr key={post.id} className="border-b border-slate-900">
                  <td className="py-3">
                    <p className="font-bold text-white">{formatPlatform(post.platform)} / {formatPostType(post.post_type)}</p>
                    <p className="text-xs text-slate-500">{post.id}</p>
                  </td>
                  <td className="py-3 text-right">{formatNumber(Number(metrics.landings || 0))}</td>
                  <td className="py-3 text-right">{formatNumber(Number(metrics.starts || 0))}</td>
                  <td className="py-3 text-right">{formatNumber(Number(metrics.finishes || 0))}</td>
                  <td className="py-3 text-right">{formatNumber(Number(metrics.claims || 0))}</td>
                  <td className="py-3 text-right">{formatNumber(Number(metrics.shares || 0))}</td>
                </tr>
              )
            })}
          </tbody>
        </TableCard>
      )}

      {events.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-lg font-black uppercase tracking-tight mb-4">Recent Social Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {events.slice(0, 12).map((event) => (
              <div key={event.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs font-black uppercase tracking-widest text-cyan-200">{event.event_name}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function PostCard({
  post,
  isPending,
  xPublishingConfigured,
  captionValue,
  scheduleValue,
  onCaptionChange,
  onScheduleChange,
  onSave,
  onApprove,
  onSchedule,
  onPublishX,
  onCopy,
  onMarkPosted,
  onRegenerate,
  onSkip,
}: {
  post: Post
  isPending: boolean
  xPublishingConfigured: boolean
  captionValue: string
  scheduleValue: string
  onCaptionChange: (value: string) => void
  onScheduleChange: (value: string) => void
  onSave: () => void
  onApprove: () => void
  onSchedule: () => void
  onPublishX: () => void
  onCopy: () => void
  onMarkPosted: () => void
  onRegenerate: () => void
  onSkip: () => void
}) {
  const campaign = getRelation(post.social_campaigns)
  const config = getPlatformAutomationConfig(post.platform)
  const canPublishX = post.platform === 'x' && xPublishingConfigured && (post.status === 'approved' || post.status === 'scheduled' || post.status === 'failed')
  const squareAsset = getSocialAssetUrl(post.id, 'square')
  const verticalAsset = getSocialAssetUrl(post.id, 'vertical')

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${statusClass(post.status)}`}>{post.status}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{formatPlatform(post.platform)}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{formatPostType(post.post_type)}</span>
          </div>
          <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-white">{campaign?.name || 'Social Draft'}</h3>
          <a href={post.campaign_url} target="_blank" rel="noreferrer" className="text-xs text-cyan-200 hover:text-cyan-100 inline-flex items-center gap-1">
            Campaign link <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <a href={squareAsset} target="_blank" rel="noreferrer" className="h-9 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white">
            <Download className="w-4 h-4" /> Square
          </a>
          <a href={verticalAsset} target="_blank" rel="noreferrer" className="h-9 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white">
            <Download className="w-4 h-4" /> Vertical
          </a>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <p className="text-xs font-black uppercase tracking-widest text-cyan-200">{config.mode === 'direct_publish' ? 'Publishing Path' : 'Posting Pack'}</p>
        <p className="mt-1 text-sm text-slate-300">{config.publishAction}</p>
      </div>

      <textarea
        value={captionValue}
        onChange={(event) => onCaptionChange(event.target.value)}
        className="min-h-40 w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm text-white leading-relaxed focus:outline-none focus:border-cyan-300"
      />

      {post.short_script && (
        <pre className="whitespace-pre-wrap rounded-lg border border-slate-800 bg-black/30 p-3 text-xs text-slate-300 font-sans leading-relaxed">{post.short_script}</pre>
      )}

      {post.error && <p className="text-xs text-red-300">{post.error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
        <input
          type="datetime-local"
          value={scheduleValue}
          onChange={(event) => onScheduleChange(event.target.value)}
          className="h-10 rounded-lg bg-slate-950 border border-slate-800 px-3 text-sm text-white"
        />
        <ActionButton disabled={isPending} onClick={onSchedule} label="Schedule" icon={<CalendarClock className="w-4 h-4" />} />
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton disabled={isPending} onClick={onSave} label="Save" icon={<CheckCircle className="w-4 h-4" />} />
        {post.status !== 'approved' && post.status !== 'scheduled' && <ActionButton disabled={isPending} onClick={onApprove} label="Approve" icon={<CheckCircle className="w-4 h-4" />} />}
        <ActionButton disabled={isPending || !canPublishX} onClick={onPublishX} label={post.platform === 'x' ? (xPublishingConfigured ? 'Publish X' : 'X Disabled') : 'Manual Only'} icon={<Send className="w-4 h-4" />} />
        <ActionButton disabled={isPending} onClick={onCopy} label="Copy Pack" icon={<Copy className="w-4 h-4" />} />
        <ActionButton disabled={isPending} onClick={onMarkPosted} label="Mark Posted" icon={<Megaphone className="w-4 h-4" />} />
        <ActionButton disabled={isPending} onClick={onRegenerate} label="Regenerate" icon={<RefreshCw className="w-4 h-4" />} />
        <ActionButton disabled={isPending} onClick={onSkip} label="Skip" icon={<SkipForward className="w-4 h-4" />} />
      </div>
    </div>
  )
}

function AccountCard({ account, isReady }: { account: Account; isReady: boolean }) {
  const config = getPlatformAutomationConfig(account.platform)
  const status = isReady ? 'connected' : account.status

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black uppercase tracking-tight text-white">{formatPlatform(account.platform)}</h3>
        <span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${statusClass(status)}`}>{isReady ? 'ready' : status}</span>
      </div>
      <div>
        <p className="text-2xl font-black text-cyan-100">{account.handle}</p>
        <p className="mt-1 text-xs text-slate-400">{config.summary}</p>
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mode</p>
        <p className="mt-1 text-sm text-white">{account.publish_capability === 'direct' ? 'Direct publish eligible' : 'Copy/export pack'}</p>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Required setup</p>
        <ul className="mt-2 space-y-1 text-xs text-slate-400">
          {config.requirements.map((requirement) => <li key={requirement}>- {requirement}</li>)}
        </ul>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Env vars</p>
        <p className="mt-2 font-mono text-[11px] text-slate-400 break-words">{config.envVars.join(', ') || 'None'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {config.docs.map((doc) => (
          <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-700 px-2 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white">
            {doc.label} <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-white">{formatNumber(value)}</p>
    </div>
  )
}

function ActionButton({ label, icon, onClick, disabled }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <Button onClick={onClick} disabled={disabled} className="h-9 rounded-lg bg-cyan-300 text-slate-950 hover:bg-cyan-200 text-xs font-black uppercase tracking-widest disabled:opacity-40">
      {icon}<span className="ml-2">{label}</span>
    </Button>
  )
}

function TableCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        {children}
      </table>
    </section>
  )
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-500">{label}</div>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 px-3 text-sm text-white focus:outline-none focus:border-cyan-300" />
    </label>
  )
}
