'use client'

import { useMemo, useState, useTransition } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle, Copy, ExternalLink, Mail, RefreshCw, Search, Send, SkipForward, XCircle } from 'lucide-react'
import {
  approveOutreachMessage,
  generateOutreachDrafts,
  markOutreachTargetOptOut,
  regenerateOutreachMessage,
  runOutreachDiscovery,
  sendApprovedOutreachMessages,
  skipOutreachMessage,
} from '@/app/actions/outreach'
import { Button } from '@/components/ui/button'
import { GROWTH_THEMES } from '@/lib/growth'

type Campaign = {
  id: string
  key: string
  name: string
  school: string | null
  sport: string | null
  theme_key: string | null
  status: string
  utm_campaign: string
}

type Target = {
  id: string
  display_name: string
  platform: string
  url: string
  email: string | null
  contact_url: string | null
  school: string | null
  sport: string | null
  target_type: string
  fit_score: number
  status: string
  created_at: string
}

type Message = {
  id: string
  channel: string
  subject: string
  body: string
  campaign_url: string
  status: string
  error: string | null
  created_at: string
  sent_at: string | null
  outreach_targets: Target | Target[] | null
  outreach_campaigns: Campaign | Campaign[] | null
}

type EventRow = {
  id: string
  event_name: string
  created_at: string
  metadata: Record<string, unknown> | null
}

type Props = {
  campaigns: Campaign[]
  targets: Target[]
  messages: Message[]
  events: EventRow[]
  emailSendingConfigured: boolean
  searchConfigured: boolean
}

function getRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function statusClass(status: string) {
  if (status === 'sent' || status === 'approved' || status === 'enriched' || status === 'opted_in') return 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10'
  if (status === 'failed' || status === 'opted_out') return 'border-red-400/30 text-red-300 bg-red-400/10'
  if (status === 'skipped') return 'border-slate-700 text-slate-400 bg-slate-900'
  return 'border-cyan-400/30 text-cyan-200 bg-cyan-400/10'
}

export default function OutreachAdminClient({ campaigns, targets, messages, events, emailSendingConfigured, searchConfigured }: Props) {
  const [tab, setTab] = useState<'queue' | 'targets' | 'campaigns' | 'discovery' | 'history'>('queue')
  const [filter, setFilter] = useState('')
  const [school, setSchool] = useState(campaigns[0]?.school || 'Duke')
  const [sport, setSport] = useState<'football' | 'basketball' | 'both'>((campaigns[0]?.sport as any) || 'basketball')
  const [themeKey, setThemeKey] = useState(campaigns[0]?.theme_key || 'school_spotlight')
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredMessages = useMemo(() => messages.filter((message) => {
    const target = getRelation(message.outreach_targets)
    const campaign = getRelation(message.outreach_campaigns)
    const haystack = `${message.subject} ${target?.display_name || ''} ${target?.email || ''} ${campaign?.name || ''}`.toLowerCase()
    return haystack.includes(filter.toLowerCase())
  }), [filter, messages])

  const queue = filteredMessages.filter((message) => message.status === 'drafted' || message.status === 'approved' || message.status === 'failed')
  const sentThisWeek = messages.filter((message) => message.status === 'sent' && message.sent_at && new Date(message.sent_at).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000).length
  const pendingApproval = messages.filter((message) => message.status === 'drafted').length
  const approved = messages.filter((message) => message.status === 'approved').length
  const enrichedTargets = targets.filter((target) => target.status === 'enriched' || target.status === 'opted_in').length
  const optedOut = targets.filter((target) => target.status === 'opted_out').length

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

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setLastResult('Copied to clipboard.')
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Metric label="Targets" value={targets.length} />
        <Metric label="Enriched" value={enrichedTargets} />
        <Metric label="Drafts" value={pendingApproval} />
        <Metric label="Approved" value={approved} />
        <Metric label="Sent 7d" value={sentThisWeek} />
        <Metric label="Opt-outs" value={optedOut} />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['queue', 'targets', 'campaigns', 'discovery', 'history'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`h-9 px-3 rounded-lg text-xs font-black uppercase tracking-widest border ${tab === item ? 'bg-cyan-300 text-slate-950 border-cyan-300' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search outreach"
              className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-cyan-300"
            />
          </div>
        </div>
        {lastResult && (
          <div className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3 text-xs text-cyan-100 break-words">
            {lastResult}
          </div>
        )}
      </section>

      {tab === 'queue' && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {queue.length === 0 && <Empty label="No draft or approved messages yet. Run discovery, then generate drafts." />}
          {queue.map((message) => {
            const target = getRelation(message.outreach_targets)
            const campaign = getRelation(message.outreach_campaigns)
            const canSend = emailSendingConfigured && message.status === 'approved' && message.channel === 'email' && !!target?.email
            return (
              <div key={message.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${statusClass(message.status)}`}>{message.status}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{message.channel}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-white">{target?.display_name || 'Unknown target'}</h3>
                    <p className="text-xs text-slate-400">{target?.email || target?.contact_url || target?.url}</p>
                    <p className="text-xs text-cyan-200 mt-1">{campaign?.name}</p>
                  </div>
                  <Button variant="outline" className="h-9 border-slate-700 bg-slate-950 text-slate-300" onClick={() => copy(message.campaign_url)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                  <p className="text-sm font-bold text-white">{message.subject}</p>
                  <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-300 leading-relaxed font-sans">{message.body}</pre>
                </div>
                {message.error && <p className="text-xs text-red-300">{message.error}</p>}
                <div className="flex flex-wrap gap-2">
                  {message.status !== 'approved' && (
                    <ActionButton disabled={isPending} onClick={() => runAction('Approved', () => approveOutreachMessage(message.id))} label="Approve" icon={<CheckCircle className="w-4 h-4" />} />
                  )}
                  <ActionButton disabled={isPending || !canSend} onClick={() => runAction('Sent', () => sendApprovedOutreachMessages([message.id]))} label={emailSendingConfigured ? 'Send' : 'Send Disabled'} icon={<Send className="w-4 h-4" />} />
                  <ActionButton disabled={isPending} onClick={() => runAction('Regenerated', () => regenerateOutreachMessage(message.id))} label="Regenerate" icon={<RefreshCw className="w-4 h-4" />} />
                  <ActionButton disabled={isPending} onClick={() => runAction('Skipped', () => skipOutreachMessage(message.id))} label="Skip" icon={<SkipForward className="w-4 h-4" />} />
                  {target && <ActionButton disabled={isPending} onClick={() => runAction('Opted out', () => markOutreachTargetOptOut(target.id))} label="Opt Out" icon={<XCircle className="w-4 h-4" />} />}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {tab === 'targets' && (
        <TableCard>
          <thead className="text-xs uppercase tracking-widest text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2">Target</th>
              <th className="text-left py-2">Contact</th>
              <th className="text-left py-2">School</th>
              <th className="text-right py-2">Fit</th>
              <th className="text-right py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => (
              <tr key={target.id} className="border-b border-slate-900">
                <td className="py-3">
                  <a href={target.url} target="_blank" rel="noreferrer" className="font-bold text-white hover:text-cyan-200 inline-flex items-center gap-1">
                    {target.display_name}<ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-xs text-slate-500">{target.platform} / {target.target_type}</p>
                </td>
                <td className="py-3 text-sm text-slate-300">{target.email || target.contact_url || 'No contact path'}</td>
                <td className="py-3 text-sm text-slate-300">{target.school || '-'}</td>
                <td className="py-3 text-right font-mono">{target.fit_score}</td>
                <td className="py-3 text-right"><span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${statusClass(target.status)}`}>{target.status}</span></td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}

      {tab === 'campaigns' && (
        <TableCard>
          <thead className="text-xs uppercase tracking-widest text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2">Campaign</th>
              <th className="text-left py-2">School</th>
              <th className="text-left py-2">Theme</th>
              <th className="text-left py-2">UTM</th>
              <th className="text-right py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="border-b border-slate-900">
                <td className="py-3 font-bold text-white">{campaign.name}</td>
                <td className="py-3 text-slate-300">{campaign.school}</td>
                <td className="py-3 text-slate-300">{campaign.theme_key}</td>
                <td className="py-3 font-mono text-xs text-cyan-100">{campaign.utm_campaign}</td>
                <td className="py-3 text-right">{campaign.status}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}

      {tab === 'discovery' && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-5">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Discovery Run</h2>
            <p className="text-sm text-slate-400 mt-1">
              Podcast discovery always works through public podcast search. Public web search needs `OUTREACH_SEARCH_API_KEY`.
            </p>
            {!searchConfigured && (
              <p className="mt-2 text-xs text-amber-200 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3">
                Search provider not configured. Discovery will still use podcast search and website enrichment.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="School" value={school} onChange={setSchool} />
            <label className="space-y-1">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Sport</span>
              <select value={sport} onChange={(event) => setSport(event.target.value as any)} className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 px-3 text-sm text-white">
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
          <div className="flex flex-wrap gap-2">
            <ActionButton disabled={isPending} onClick={() => runAction('Discovery', () => runOutreachDiscovery({ school, sport, themeKey }))} label="Run Discovery" icon={<Search className="w-4 h-4" />} />
            <ActionButton disabled={isPending} onClick={() => runAction('Drafts', () => generateOutreachDrafts({}))} label="Generate Drafts" icon={<Mail className="w-4 h-4" />} />
            <ActionButton disabled={isPending || !emailSendingConfigured} onClick={() => runAction('Send batch', () => sendApprovedOutreachMessages())} label={emailSendingConfigured ? 'Send Approved Batch' : 'Sending Disabled'} icon={<Send className="w-4 h-4" />} />
          </div>
        </section>
      )}

      {tab === 'history' && (
        <TableCard>
          <thead className="text-xs uppercase tracking-widest text-slate-500">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2">When</th>
              <th className="text-left py-2">Event</th>
              <th className="text-left py-2">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-slate-900">
                <td className="py-3 text-sm text-slate-400">{new Date(event.created_at).toLocaleString()}</td>
                <td className="py-3 font-bold text-white">{event.event_name}</td>
                <td className="py-3 font-mono text-xs text-slate-400">{JSON.stringify(event.metadata || {})}</td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-white">{value.toLocaleString()}</p>
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
      <table className="w-full min-w-[760px] text-sm">
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
