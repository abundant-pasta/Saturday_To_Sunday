import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getConference } from '@/lib/conferences'
import { TIMEZONE_OFFSET_MS, PLAYER_COOLDOWN_DAYS, GAME_CONFIG } from '@/lib/constants'
import webpush from 'web-push'
import {
  buildAnswerSecurity,
  getAcceptedCollegeAnswers,
  getRotatingSurvivalSportMode,
  getTransferSafeDistractors,
} from '@/lib/player-trust'
import {
  buildPersonalizedChallengeCards,
  buildPushCopy,
  loadTodayDailyRosters,
  normalizeChallengePreferences,
  type ChallengePreferences,
} from '@/lib/personalization'
import { getCurrentGrowthTheme, getThemeMetadata } from '@/lib/growth'
import { generateOutreachDraftsForClient, runOutreachDiscoveryForClient } from '@/app/actions/outreach'
import {
  generateSocialDraftsForClient,
  publishApprovedXPostsForClient,
  refreshSocialMetricsForClient,
} from '@/app/actions/social'

export const dynamic = 'force-dynamic'

// --- HELPER: FISHER-YATES SHUFFLE (Unbiased Randomization) ---
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getNextMondayAt16Utc(from = new Date()) {
  const nextMonday = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 16, 0, 0, 0))
  const day = nextMonday.getUTCDay()
  const daysUntilMonday = (8 - day) % 7 || 7
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday)
  return nextMonday
}

function formatSurvivalName(startDate: Date) {
  return `Weekly Survival: ${startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })}`
}

function getSurvivalDayNumber(startDate: string) {
  return Math.max(1, Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
}

function getSurvivalSportModeLabel(mode: string) {
  if (mode === 'football') return 'Football'
  if (mode === 'mixed') return 'Mixed'
  return 'Basketball'
}

function appendUtmParams(path: string, params: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://playsaturdaytosunday.com'
  const url = new URL(path, base)
  Object.entries(params).forEach(([key, value]) => {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value)
  })
  return `${url.pathname}${url.search}`
}

function formatImageAuditDigest(reports: Array<{
  player_name: string
  issue_type: string
  sport: string
  game_mode: string
  game_date: string | null
  notes: string | null
  created_at: string
}>) {
  const issueLabels: Record<string, string> = {
    bad_photo: 'Bad photo',
    wrong_person: 'Wrong photo',
    college_spoiler: 'College spoiler',
    broken_image: 'Broken image',
    other: 'Other',
  }

  const counts = reports.reduce<Record<string, number>>((acc, report) => {
    acc[report.issue_type] = (acc[report.issue_type] || 0) + 1
    return acc
  }, {})

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.playsaturdaytosunday.com'
  const lines = [
    `There are ${reports.length} open Saturday to Sunday image report${reports.length === 1 ? '' : 's'}.`,
    '',
    'Issue summary:',
    ...Object.entries(counts).map(([issue, count]) => `- ${issueLabels[issue] || issue}: ${count}`),
    '',
    `Review queue: ${siteUrl}/admin/images`,
    '',
    'Newest reports:',
    ...reports.slice(0, 25).map((report) => {
      const date = report.game_date || new Date(report.created_at).toISOString().split('T')[0]
      const note = report.notes ? ` Note: ${report.notes}` : ''
      return `- ${report.player_name} (${report.sport}/${report.game_mode}, ${date}): ${issueLabels[report.issue_type] || report.issue_type}.${note}`
    }),
  ]

  if (reports.length > 25) {
    lines.push('', `Plus ${reports.length - 25} more in the admin queue.`)
  }

  return lines.join('\n')
}

async function sendInternalEmail(input: { subject: string; body: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.SYSTEM_FROM_EMAIL || process.env.OUTREACH_FROM_EMAIL
  const replyTo = process.env.ADMIN_DIGEST_REPLY_TO_EMAIL || process.env.OUTREACH_REPLY_TO_EMAIL || process.env.ADMIN_EMAIL
  const to = process.env.ADMIN_DIGEST_TO_EMAIL || process.env.ADMIN_EMAIL

  if (!apiKey || !from || !to) {
    return {
      sent: false,
      disabled: true,
      error: 'Email digest disabled until RESEND_API_KEY, SYSTEM_FROM_EMAIL or OUTREACH_FROM_EMAIL, and ADMIN_DIGEST_TO_EMAIL or ADMIN_EMAIL are set.',
    }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: replyTo || undefined,
      subject: input.subject,
      text: input.body,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    return { sent: false, disabled: false, error: text.slice(0, 500) }
  }

  const json = await response.json().catch(() => ({}))
  return { sent: true, disabled: false, id: json.id as string | undefined }
}

export async function GET(request: Request) {
  // ==========================================
  // 🔒 SECURITY CHECK
  // ==========================================
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'generate'

  // ==========================================
  // MODE A: GENERATE
  // ==========================================
  if (action === 'generate') {
    
    // 1. DATE LOGIC
    const overrideDate = searchParams.get('date')
    let targetDate = ''

    if (overrideDate) {
        targetDate = overrideDate
        console.log(`Manual Override: Generating games for ${targetDate}`)
    } else {
        const now = new Date(Date.now() - TIMEZONE_OFFSET_MS)
        now.setDate(now.getDate() + 1)
        targetDate = now.toISOString().split('T')[0]
    }

    const growthTheme = getCurrentGrowthTheme(new Date(`${targetDate}T12:00:00.000Z`))
    const growthThemeMetadata = getThemeMetadata(growthTheme)

    // 2. DEFINE CONFIGS
    const sportConfigs = [
      {
        sportKey: 'football' as const,
        sourceSport: 'football' as const,
        distribution: GAME_CONFIG.football.distribution,
        mode: 'daily' as const,
      },
      {
        sportKey: 'basketball' as const,
        sourceSport: 'basketball' as const,
        distribution: GAME_CONFIG.basketball.distribution,
        mode: 'daily' as const,
      },
    ]

    const results = []

    // 3. GENERATION LOOP
    for (const config of sportConfigs) {
      const { sportKey, sourceSport, distribution, mode } = config
      const cooldownDays = PLAYER_COOLDOWN_DAYS
      const cooldownDate = new Date()
      cooldownDate.setDate(cooldownDate.getDate() - cooldownDays)
      const cutoffString = cooldownDate.toISOString()

      const applyModeFilter = (query: any) => {
        return query.in('game_mode', ['daily', 'both'])
      }

      // A. Check Idempotency
      const { data: existing } = await supabase
        .from('daily_games')
        .select('date')
        .eq('date', targetDate)
        .eq('sport', sportKey)
        .single()

      if (existing) {
        results.push(`${sportKey}: Already exists`)
        continue
      }

      // B. Fetch Pools
      const [easyRes, mediumRes, hardRes] = await Promise.all([
        applyModeFilter(
          supabase.from('players').select('*')
            .eq('sport', sourceSport)
            .eq('tier', 1)
            .not('image_url', 'is', null)
            .not('image_status', 'in', '("spoiler","wrong_person","missing")')
            .gt('rating', 0)
            .or(`last_selected.is.null,last_selected.lt.${cutoffString}`)
            .order('rating', { ascending: false })
            .limit(50)
        ),
        applyModeFilter(
          supabase.from('players').select('*')
            .eq('sport', sourceSport)
            .eq('tier', 2)
            .not('image_url', 'is', null)
            .not('image_status', 'in', '("spoiler","wrong_person","missing")')
            .gt('rating', 0)
            .or(`last_selected.is.null,last_selected.lt.${cutoffString}`)
            .order('rating', { ascending: false })
            .limit(30)
        ),
        applyModeFilter(
          supabase.from('players').select('*')
            .eq('sport', sourceSport)
            .eq('tier', 3)
            .not('image_url', 'is', null)
            .not('image_status', 'in', '("spoiler","wrong_person","missing")')
            .gt('rating', 0)
            .or(`last_selected.is.null,last_selected.lt.${cutoffString}`)
            .order('rating', { ascending: false })
            .limit(20)
        )
      ])

      // Validation
      if (!easyRes.data || easyRes.data.length < distribution[0] || 
          !mediumRes.data || mediumRes.data.length < distribution[1] || 
          !hardRes.data || hardRes.data.length < distribution[2]) {
        console.error(`Not enough ${sportKey} players available (checked ${cooldownDays}-day cooldown).`)
        results.push(`${sportKey}: Failed - Not enough players`)
        continue
      }

      // C. Compile Ordered Roster (Applied Shuffle Logic Here Too)
      const rosterPool = [
        ...shuffleArray(easyRes.data).slice(0, distribution[0]),
        ...shuffleArray(mediumRes.data).slice(0, distribution[1]),
        ...shuffleArray(hardRes.data).slice(0, distribution[2])
      ]
      
      // Shuffle the final roster order so tiers are mixed (optional, but good for gameplay)
      // If you want them strictly ordered Easy -> Hard, remove this line.
      // currently your UI seems to present them sequentially, so keeping original order might be better?
      // I will keep the tiers ordered (Easy first) but randomized *within* tiers as done above.
      const orderedRoster = rosterPool; 

      // D. Build Content
      const { data: allColleges } = await applyModeFilter(
        supabase
          .from('players')
          .select('college')
          .eq('sport', sourceSport)
          .not('college', 'is', null)
      )

      const collegeList = Array.from(new Set(allColleges?.map((c: any) => c.college) || [])) as string[]

      const content = await Promise.all(orderedRoster.map(async (p: any) => {
        const wrong = getTransferSafeDistractors(p, collegeList)
        
        // --- THE FIX IS HERE ---
        // Old: .sort(() => 0.5 - Math.random()) -> Biased
        // New: shuffleArray() -> Perfectly random
        const options = shuffleArray([p.college, ...wrong])
        const security = await buildAnswerSecurity(getAcceptedCollegeAnswers(p))

        return {
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          answer_hash: security.answer_hash,
          answer_hashes: security.answer_hashes,
          salt: security.salt,
          options: options,
          tier: p.tier || 1,
          sport: p.sport,
          team: p.team,
          college: p.college,
          accepted_colleges: p.accepted_colleges || [],
          college_answer_note: p.college_answer_note || null,
          conference: getConference(p.college)
        }
      }))

      // E. Save to DB
      const { error } = await supabase
        .from('daily_games')
        .insert({ 
          date: targetDate, 
          content,
          sport: sportKey,
          theme_key: growthTheme.key,
          theme_name: growthTheme.name,
          theme_metadata: {
            ...growthThemeMetadata,
            generatedSport: sportKey,
          },
        })

      if (error) {
        results.push(`${sportKey}: DB Error - ${error.message}`)
      } else {
        // F. Update last_selected
        const playerIds = orderedRoster.map((p: any) => p.id)
        await supabase
          .from('players')
          .update({ last_selected: new Date().toISOString() })
          .in('id', playerIds)
        
        results.push(`${sportKey}: Generated successfully`)
      }
    }

    return NextResponse.json({ success: true, date: targetDate, results })
  }

  // ==========================================
  // MODE A2: WEEKLY SURVIVAL
  // ==========================================
  if (action === 'survival-weekly') {
    const now = new Date()

    await supabase
      .from('survival_tournaments')
      .update({ is_active: false })
      .eq('is_active', true)
      .lte('end_date', now.toISOString())

    const { data: currentActive } = await supabase
      .from('survival_tournaments')
      .select('id, name, start_date, end_date')
      .eq('is_active', true)
      .gt('end_date', now.toISOString())
      .order('start_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (currentActive) {
      return NextResponse.json({
        success: true,
        action: 'survival-weekly',
        result: 'active tournament already exists',
        tournament: currentActive,
      })
    }

    const startDate = getNextMondayAt16Utc(now)
    const endDate = new Date(startDate)
    endDate.setUTCDate(endDate.getUTCDate() + 5)
    const sportMode = getRotatingSurvivalSportMode(startDate)
    const growthTheme = getCurrentGrowthTheme(startDate)
    const growthThemeMetadata = getThemeMetadata(growthTheme)

    const { data: existing } = await supabase
      .from('survival_tournaments')
      .select('id, name, start_date, end_date')
      .eq('start_date', startDate.toISOString())
      .limit(1)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('survival_tournaments')
        .update({
          is_active: true,
          theme_key: growthTheme.key,
          theme_name: growthTheme.name,
          theme_metadata: {
            ...growthThemeMetadata,
            gauntletMode: sportMode,
            gauntletLabel: `${getSurvivalSportModeLabel(sportMode)} Gauntlet`,
          },
          sport_mode: sportMode,
        })
        .eq('id', existing.id)

      return NextResponse.json({
        success: true,
        action: 'survival-weekly',
        result: 'reactivated existing tournament',
        tournament: existing,
      })
    }

    const { data: tournament, error } = await supabase
      .from('survival_tournaments')
      .insert({
        name: formatSurvivalName(startDate),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        sport_mode: sportMode,
        theme_key: growthTheme.key,
        theme_name: growthTheme.name,
        theme_metadata: {
          ...growthThemeMetadata,
          gauntletMode: sportMode,
          gauntletLabel: `${getSurvivalSportModeLabel(sportMode)} Gauntlet`,
        },
      })
      .select('id, name, start_date, end_date')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      action: 'survival-weekly',
      result: 'created tournament',
      tournament,
    })
  }

  // ==========================================
  // MODE A3: OUTREACH DISCOVERY
  // ==========================================
  if (action === 'outreach-discovery') {
    const theme = getCurrentGrowthTheme()
    const schools = theme.schools.slice(0, 3)
    const results = []

    for (const school of schools) {
      const result = await runOutreachDiscoveryForClient(supabase, {
        school,
        sport: theme.sportFocus === 'both' ? 'both' : theme.sportFocus,
        themeKey: theme.key,
        limit: 10,
      })
      results.push({ school, ...result })
    }

    return NextResponse.json({
      success: true,
      action: 'outreach-discovery',
      theme: theme.key,
      results,
    })
  }

  // ==========================================
  // MODE A4: OUTREACH DRAFTS
  // ==========================================
  if (action === 'outreach-drafts') {
    const result = await generateOutreachDraftsForClient(supabase, { limit: 40 })
    return NextResponse.json({
      success: true,
      action: 'outreach-drafts',
      result,
    })
  }

  // ==========================================
  // MODE A4B: SOCIAL DRAFTS
  // ==========================================
  if (action === 'social-drafts') {
    const theme = getCurrentGrowthTheme()
    const result = await generateSocialDraftsForClient(supabase, {
      school: theme.schools[0] || null,
      sport: theme.sportFocus,
      themeKey: theme.key,
    })

    return NextResponse.json({
      success: true,
      action: 'social-drafts',
      theme: theme.key,
      result,
    })
  }

  // ==========================================
  // MODE A4C: SOCIAL SURVIVAL DRAFTS
  // ==========================================
  if (action === 'social-survival-drafts') {
    const theme = getCurrentGrowthTheme()
    const result = await generateSocialDraftsForClient(supabase, {
      school: theme.schools[0] || null,
      sport: theme.sportFocus,
      themeKey: theme.key,
      survivalOnly: true,
    })

    return NextResponse.json({
      success: true,
      action: 'social-survival-drafts',
      theme: theme.key,
      result,
    })
  }

  // ==========================================
  // MODE A4D: SOCIAL PUBLISH X
  // ==========================================
  if (action === 'social-publish-x') {
    const result = await publishApprovedXPostsForClient(supabase)
    return NextResponse.json({
      success: true,
      action: 'social-publish-x',
      result,
    })
  }

  // ==========================================
  // MODE A4E: SOCIAL METRICS REFRESH
  // ==========================================
  if (action === 'social-metrics-refresh') {
    const result = await refreshSocialMetricsForClient(supabase)
    return NextResponse.json({
      success: true,
      action: 'social-metrics-refresh',
      result,
    })
  }

  // ==========================================
  // MODE A5: IMAGE AUDIT DIGEST
  // ==========================================
  if (action === 'image-audit-digest') {
    const { data: reports, error } = await supabase
      .from('image_audit_reports')
      .select('player_name, issue_type, sport, game_mode, game_date, notes, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Image audit digest query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json({
        success: true,
        action: 'image-audit-digest',
        result: 'no open reports',
      })
    }

    const emailResult = await sendInternalEmail({
      subject: `Saturday to Sunday image fixes: ${reports.length} open report${reports.length === 1 ? '' : 's'}`,
      body: formatImageAuditDigest(reports),
    })

    await supabase.from('growth_events').insert({
      event_name: 'image_audit_digest_sent',
      metadata: {
        report_count: reports.length,
        sent: emailResult.sent,
        disabled: emailResult.disabled,
        error: emailResult.error || null,
      },
    })

    return NextResponse.json({
      success: emailResult.sent || emailResult.disabled,
      action: 'image-audit-digest',
      reportCount: reports.length,
      email: emailResult,
    }, { status: emailResult.sent || emailResult.disabled ? 200 : 500 })
  }

  // ==========================================
  // MODE B: NOTIFY
  // ==========================================
  if (action === 'notify') {
    try {
      if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
        throw new Error('Missing VAPID_PRIVATE_KEY or VAPID_SUBJECT env vars')
      }

      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY
      )

      const { data: subs } = await supabase.from('push_subscriptions').select('id, subscription, user_id')
      
      if (subs && subs.length > 0) {
        const linkedUserIds = Array.from(new Set(subs.map(sub => sub.user_id).filter(Boolean)))
        const { data: profiles } = linkedUserIds.length > 0
          ? await supabase
            .from('profiles')
            .select('id, favorite_teams, favorite_schools, favorite_conferences, preferred_sport')
            .in('id', linkedUserIds)
          : { data: [] }

        const profileMap = new Map(
          (profiles || []).map((profile: {
            id: string
            favorite_teams: string[]
            favorite_schools: string[]
            favorite_conferences: string[]
            preferred_sport: ChallengePreferences['preferred_sport']
          }) => [profile.id, normalizeChallengePreferences(profile)])
        )

        const rosters = await loadTodayDailyRosters(supabase)
        const { data: activeTournament } = await supabase
          .from('survival_tournaments')
          .select('id, start_date, end_date')
          .eq('is_active', true)
          .gt('end_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle()

        const activeSurvivalUserIds = new Set<string>()
        if (activeTournament && linkedUserIds.length > 0) {
          const { data: participants } = await supabase
            .from('survival_participants')
            .select('user_id, status')
            .eq('tournament_id', activeTournament.id)
            .eq('status', 'active')
            .in('user_id', linkedUserIds)

          for (const participant of participants || []) {
            activeSurvivalUserIds.add(participant.user_id)
          }
        }

        const now = new Date()
        const isSundayUtc = now.getUTCDay() === 0
        const survivalStarted = activeTournament ? new Date(activeTournament.start_date).getTime() <= Date.now() : false
        const survivalDay = activeTournament ? getSurvivalDayNumber(activeTournament.start_date) : 0

        await Promise.allSettled(
          subs.map(async (sub) => {
            const profile = sub.user_id ? profileMap.get(sub.user_id) : null
            const hasExplicitPreferences = !!profile && (
              profile.favorite_teams.length > 0 ||
              profile.favorite_schools.length > 0 ||
              profile.favorite_conferences.length > 0 ||
              !!profile.preferred_sport
            )

            const cards = hasExplicitPreferences && profile
              ? buildPersonalizedChallengeCards(
                profile,
                rosters,
                { football: null, basketball: null },
                { includeGenericFallback: false }
              )
              : []

            let url = cards[0]?.href || '/daily'
            let copy = buildPushCopy(cards[0] || null)
            let kind = cards[0] ? 'personalized_daily' : 'generic_daily'

            if (activeTournament && sub.user_id && activeSurvivalUserIds.has(sub.user_id) && survivalStarted && survivalDay <= 5) {
              url = '/survival/play'
              copy = {
                title: 'Survival is live',
                body: 'Play today or be eliminated from the weekly tournament.',
                icon: '/icon-192x192.png',
              }
              kind = 'survival_daily'
            } else if (activeTournament && isSundayUtc && !survivalStarted) {
              url = '/survival'
              copy = {
                title: 'Weekly Survival starts Monday',
                body: 'Join before the first cut. Five days, one survivor.',
                icon: '/icon-192x192.png',
              }
              kind = 'survival_join'
            }

            const pushUrl = appendUtmParams(url, {
              utm_source: 'push',
              utm_medium: 'notification',
              utm_campaign: kind,
              utm_content: cards[0]?.sport || (kind.startsWith('survival') ? 'survival' : 'daily'),
            })

            try {
              await webpush.sendNotification(sub.subscription as any, JSON.stringify({ ...copy, url: pushUrl }))
              await supabase.from('growth_events').insert({
                user_id: sub.user_id || null,
                event_name: 'push_sent',
                metadata: { status: 'sent', kind, url: pushUrl },
              })
            } catch (error: any) {
              const statusCode = Number(error?.statusCode || error?.status || 0)
              if (statusCode === 404 || statusCode === 410) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id)
              }

              await supabase.from('growth_events').insert({
                user_id: sub.user_id || null,
                event_name: 'push_sent',
                metadata: { status: 'failed', status_code: statusCode, kind, url: pushUrl },
              })
            }
          })
        )
      }
      
      return NextResponse.json({ success: true, action: 'Notified' })

    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Notification failed'
      console.error("Cron Notify Error:", e)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 })
}
