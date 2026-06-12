import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import SocialAdminClient from '@/components/SocialAdminClient'
import type { SocialPlatform } from '@/lib/social'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const userEmail = user?.email
  const isAuthorized = user && adminEmail && userEmail?.toLowerCase() === adminEmail.toLowerCase()

  return { isAuthorized, userEmail, adminEmail }
}

export default async function SocialAdminPage() {
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

  const [accountsReq, campaignsReq, postsReq, eventsReq] = await Promise.all([
    adminDb
      .from('social_accounts')
      .select('id, platform, handle, status, publish_capability, metadata')
      .order('platform', { ascending: true }),
    adminDb
      .from('social_campaigns')
      .select('id, key, name, theme_key, school, sport, default_path, utm_campaign, status')
      .order('created_at', { ascending: false })
      .limit(100),
    adminDb
      .from('social_posts')
      .select('id, campaign_id, platform, post_type, caption, asset_url, campaign_url, short_script, scheduled_at, status, approved_at, published_at, external_post_id, error, metadata, created_at, social_campaigns(id, key, name, theme_key, school, sport, default_path, utm_campaign, status)')
      .order('created_at', { ascending: false })
      .limit(300),
    adminDb
      .from('social_post_events')
      .select('id, event_name, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const hasErrors = accountsReq.error || campaignsReq.error || postsReq.error || eventsReq.error
  const platformReadiness: Record<SocialPlatform, boolean> = {
    x: !!(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET && process.env.X_ACCESS_TOKEN && process.env.X_REFRESH_TOKEN),
    tiktok: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REDIRECT_URI),
    instagram: !!(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET && process.env.INSTAGRAM_REDIRECT_URI && process.env.INSTAGRAM_ACCOUNT_ID),
    youtube: !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REDIRECT_URI && process.env.YOUTUBE_REFRESH_TOKEN),
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Admin</p>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Social Autopilot</h1>
            <p className="text-slate-400 mt-2 max-w-3xl">
              Draft platform-native posts, generate campaign links and static cards, approve brand-safe copy, publish X when credentials are ready, and export packs for TikTok, Instagram, and YouTube Shorts.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/growth" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:border-cyan-300 hover:text-cyan-200">
              Growth
            </Link>
            <Link href="/admin/outreach" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:border-cyan-300 hover:text-cyan-200">
              Outreach
            </Link>
            <Link href="/admin" className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:border-cyan-300 hover:text-cyan-200">
              Roster
            </Link>
          </div>
        </header>

        {hasErrors && (
          <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            Some social data could not be loaded. Accounts: {accountsReq.error?.message || 'ok'}; campaigns: {campaignsReq.error?.message || 'ok'}; posts: {postsReq.error?.message || 'ok'}; events: {eventsReq.error?.message || 'ok'}.
          </section>
        )}

        {!platformReadiness.x && (
          <section className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
            X is currently approval-and-copy only. Add `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_ACCESS_TOKEN`, and `X_REFRESH_TOKEN` to enable direct publishing for approved due posts.
          </section>
        )}

        <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
          TikTok, Instagram, and YouTube are set up as posting-pack workflows first: copy, vertical asset, script, and manual posted-state tracking. Their direct publishing stays disabled until their platform reviews, media requirements, and OAuth credentials are ready.
        </section>

        <SocialAdminClient
          accounts={(accountsReq.data || []) as any}
          campaigns={(campaignsReq.data || []) as any}
          posts={(postsReq.data || []) as any}
          events={(eventsReq.data || []) as any}
          xPublishingConfigured={platformReadiness.x}
          platformReadiness={platformReadiness}
        />
      </div>
    </main>
  )
}
