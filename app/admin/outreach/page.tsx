import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import OutreachAdminClient from '@/components/OutreachAdminClient'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const userEmail = user?.email
  const isAuthorized = user && adminEmail && userEmail?.toLowerCase() === adminEmail.toLowerCase()

  return { isAuthorized, userEmail, adminEmail }
}

export default async function OutreachAdminPage() {
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

  const [campaignsReq, targetsReq, messagesReq, eventsReq] = await Promise.all([
    adminDb
      .from('outreach_campaigns')
      .select('id, key, name, school, sport, theme_key, status, utm_campaign')
      .order('created_at', { ascending: false })
      .limit(50),
    adminDb
      .from('outreach_targets')
      .select('id, display_name, platform, url, email, contact_url, school, sport, target_type, fit_score, status, created_at')
      .order('fit_score', { ascending: false })
      .limit(250),
    adminDb
      .from('outreach_messages')
      .select('id, channel, subject, body, campaign_url, status, error, created_at, sent_at, outreach_targets(id, display_name, platform, url, email, contact_url, school, sport, target_type, fit_score, status, created_at), outreach_campaigns(id, key, name, school, sport, theme_key, status, utm_campaign)')
      .order('created_at', { ascending: false })
      .limit(200),
    adminDb
      .from('outreach_events')
      .select('id, event_name, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const hasErrors = campaignsReq.error || targetsReq.error || messagesReq.error || eventsReq.error

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Admin</p>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Outreach Autopilot</h1>
            <p className="text-slate-400 mt-2 max-w-3xl">
              Discover public sports contacts, generate school challenge drafts, approve cold outreach, and track downstream starts without doing the hunting by hand.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/growth" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:border-cyan-300 hover:text-cyan-200">
              Growth
            </Link>
            <Link href="/admin" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:border-cyan-300 hover:text-cyan-200">
              Roster
            </Link>
            <Link href="/creator" className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-cyan-200">
              Creator Portal
            </Link>
          </div>
        </header>

        {hasErrors && (
          <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Some outreach data could not be loaded. Campaigns: {campaignsReq.error?.message || 'ok'}; targets: {targetsReq.error?.message || 'ok'}; messages: {messagesReq.error?.message || 'ok'}; events: {eventsReq.error?.message || 'ok'}.
          </section>
        )}

        <OutreachAdminClient
          campaigns={(campaignsReq.data || []) as any}
          targets={(targetsReq.data || []) as any}
          messages={(messagesReq.data || []) as any}
          events={(eventsReq.data || []) as any}
          emailSendingConfigured={!!(process.env.RESEND_API_KEY && process.env.OUTREACH_FROM_EMAIL && process.env.OUTREACH_REPLY_TO_EMAIL)}
          searchConfigured={!!process.env.OUTREACH_SEARCH_API_KEY}
        />
      </div>
    </main>
  )
}
