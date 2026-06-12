'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getCurrentGrowthTheme } from '@/lib/growth'
import {
  SOCIAL_PLATFORMS,
  SOCIAL_POST_TYPES,
  buildSocialCampaign,
  buildSocialUrl,
  generateSocialCaption,
  generateSocialScript,
  getSocialAssetUrl,
  getPlatformAutomationConfig,
  getThemeForKey,
  normalizeSocialPlatform,
  type SocialPlatform,
  type SocialPostType,
  type SocialSport,
} from '@/lib/social'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

function createAdminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const isAuthorized = user && adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()

  if (!isAuthorized) {
    throw new Error('Unauthorized')
  }

  return createAdminDb()
}

function todayKey(date = new Date()) {
  return date.toISOString().split('T')[0]
}

function yesterdayKey(date = new Date()) {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() - 1)
  return todayKey(copy)
}

function normalizeSport(value?: string | null): SocialSport | null {
  if (value === 'football' || value === 'basketball' || value === 'both') return value
  return null
}

function getRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

async function logSocialEvent(
  adminDb: any,
  eventName: string,
  ids: { accountId?: string | null; campaignId?: string | null; postId?: string | null },
  metadata: Record<string, unknown> = {}
) {
  await adminDb.from('social_post_events').insert({
    account_id: ids.accountId || null,
    campaign_id: ids.campaignId || null,
    post_id: ids.postId || null,
    event_name: eventName,
    metadata,
  })
}

async function ensureSocialCampaign(adminDb: any, input: { school?: string | null; sport?: SocialSport | null; themeKey?: string | null } = {}) {
  const theme = getThemeForKey(input.themeKey)
  const campaign = buildSocialCampaign({
    theme,
    school: input.school || theme.schools[0] || null,
    sport: input.sport || theme.sportFocus,
  })

  const { data: existing } = await adminDb
    .from('social_campaigns')
    .select('*')
    .eq('key', campaign.key)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await adminDb
    .from('social_campaigns')
    .insert(campaign)
    .select('*')
    .single()

  if (error) throw new Error(`Failed to create social campaign: ${error.message}`)
  return data
}

async function getTodayAnswerIds(adminDb: any) {
  const { data } = await adminDb
    .from('daily_games')
    .select('content')
    .eq('date', todayKey())

  const ids = new Set<string>()
  for (const game of data || []) {
    for (const question of game.content || []) {
      if (question?.id) ids.add(String(question.id))
    }
  }
  return ids
}

async function loadTeaserPlayers(adminDb: any, sport: SocialSport | null, limit = 8) {
  const todayAnswerIds = await getTodayAnswerIds(adminDb)
  const sports = sport === 'both' || !sport ? ['football', 'basketball'] : [sport]
  const { data } = await adminDb
    .from('players')
    .select('id, name, sport, tier, rating')
    .in('sport', sports)
    .not('image_url', 'is', null)
    .not('image_status', 'in', '("spoiler","wrong_person","missing")')
    .gt('rating', 0)
    .order('rating', { ascending: false })
    .limit(60)

  return (data || [])
    .filter((player: { id: string | number }) => !todayAnswerIds.has(String(player.id)))
    .slice(0, limit)
    .map((player: { name: string }) => player.name)
}

async function loadScoreToBeat(adminDb: any, sport: SocialSport | null) {
  const sports = sport === 'both' || !sport ? ['football', 'basketball'] : [sport]
  const { data } = await adminDb
    .from('daily_results')
    .select('score, sport, profiles(username, full_name)')
    .in('sport', sports)
    .eq('game_date', yesterdayKey())
    .not('user_id', 'is', null)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)

  const row = data?.[0]
  const profile = row ? getRelation(row.profiles) as { username?: string | null; full_name?: string | null } | null : null
  return {
    topScore: row?.score || null,
    topPlayer: profile?.username || profile?.full_name || null,
  }
}

async function loadSurvivalLabel(adminDb: any) {
  const { data } = await adminDb
    .from('survival_tournaments')
    .select('name, start_date, end_date, sport_mode')
    .eq('is_active', true)
    .gt('end_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!data) return 'Weekly Survival'
  const mode = data.sport_mode === 'football' ? 'Football' : data.sport_mode === 'mixed' ? 'Mixed' : 'Basketball'
  return `${mode} ${data.name}`
}

async function updatePostWithFinalUrl(adminDb: any, post: any, campaign: any, platform: SocialPlatform, postType: SocialPostType, contextBase: any) {
  const campaignUrl = buildSocialUrl({ campaign, platform, postId: post.id, postType })
  const caption = generateSocialCaption({ ...contextBase, url: campaignUrl })
  const shortScript = generateSocialScript({ ...contextBase, url: campaignUrl })
  const assetUrl = getSocialAssetUrl(post.id)
  const verticalAssetUrl = getSocialAssetUrl(post.id, 'vertical')

  const { error } = await adminDb
    .from('social_posts')
    .update({
      campaign_url: campaignUrl,
      caption,
      short_script: shortScript,
      asset_url: assetUrl,
      metadata: {
        ...(post.metadata || {}),
        square_asset_url: assetUrl,
        vertical_asset_url: verticalAssetUrl,
        primary_asset_format: getPlatformAutomationConfig(platform).primaryAsset,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', post.id)

  if (error) throw new Error(error.message)
}

export async function generateSocialDrafts(input: { school?: string | null; sport?: SocialSport | null; themeKey?: string | null; survivalOnly?: boolean } = {}) {
  const adminDb = await requireAdmin()
  return generateSocialDraftsForClient(adminDb, input)
}

export async function generateSocialDraftsForClient(adminDb: SupabaseAdmin | any, input: { school?: string | null; sport?: SocialSport | null; themeKey?: string | null; survivalOnly?: boolean } = {}) {
  const currentTheme = input.themeKey ? getThemeForKey(input.themeKey) : getCurrentGrowthTheme()
  const campaign = await ensureSocialCampaign(adminDb, {
    school: input.school || currentTheme.schools[0] || null,
    sport: normalizeSport(input.sport || null) || currentTheme.sportFocus,
    themeKey: currentTheme.key,
  })

  const draftDate = todayKey()
  const teaserPlayers = await loadTeaserPlayers(adminDb, normalizeSport(campaign.sport), 8)
  const scoreToBeat = await loadScoreToBeat(adminDb, normalizeSport(campaign.sport))
  const survivalLabel = await loadSurvivalLabel(adminDb)
  const postTypes = input.survivalOnly ? ['survival_promo'] as SocialPostType[] : [...SOCIAL_POST_TYPES]

  let drafted = 0
  let skipped = 0

  for (const platform of SOCIAL_PLATFORMS) {
    for (const postType of postTypes) {
      const { data: existing } = await adminDb
        .from('social_posts')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('platform', platform)
        .eq('post_type', postType)
        .neq('status', 'skipped')
        .contains('metadata', { draft_date: draftDate })
        .maybeSingle()

      if (existing) {
        skipped++
        continue
      }

      const provisionalUrl = buildSocialUrl({ campaign, platform, postType })
      const contextBase = {
        platform,
        postType,
        campaign,
        theme: currentTheme,
        url: provisionalUrl,
        teaserPlayers,
        topScore: scoreToBeat.topScore,
        topPlayer: scoreToBeat.topPlayer,
        survivalLabel,
        draftDate,
      }

      const { data: post, error } = await adminDb
        .from('social_posts')
        .insert({
          campaign_id: campaign.id,
          platform,
          post_type: postType,
          caption: generateSocialCaption(contextBase),
          campaign_url: provisionalUrl,
          short_script: generateSocialScript(contextBase),
          scheduled_at: null,
          status: 'drafted',
          metadata: {
            draft_date: draftDate,
            theme_key: currentTheme.key,
            school: campaign.school,
            sport: campaign.sport,
            primary_asset_format: getPlatformAutomationConfig(platform).primaryAsset,
            square_asset_url: '',
            vertical_asset_url: '',
            posting_mode: getPlatformAutomationConfig(platform).mode,
            spoiler_safe: true,
            excludes_today_answers: true,
          },
        })
        .select('*')
        .single()

      if (error) {
        skipped++
        continue
      }

      await updatePostWithFinalUrl(adminDb, post, campaign, platform, postType, contextBase)
      await logSocialEvent(adminDb, 'drafted', { campaignId: campaign.id, postId: post.id }, { platform, post_type: postType, draft_date: draftDate })
      drafted++
    }
  }

  revalidatePath('/admin/social')
  revalidatePath('/admin/growth')
  return { campaignId: campaign.id, drafted, skipped }
}

export async function approveSocialPost(postId: string) {
  const adminDb = await requireAdmin()
  const { data, error } = await adminDb
    .from('social_posts')
    .update({ status: 'approved', approved_at: new Date().toISOString(), error: null, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .select('campaign_id')
    .single()

  if (error) throw new Error(error.message)
  await logSocialEvent(adminDb, 'approved', { campaignId: data.campaign_id, postId })
  revalidatePath('/admin/social')
  return { success: true }
}

export async function updateSocialPost(postId: string, input: { caption?: string; scheduledAt?: string | null }) {
  const adminDb = await requireAdmin()
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString(), error: null }
  if (typeof input.caption === 'string') payload.caption = input.caption.trim().slice(0, 1200)
  if (input.scheduledAt !== undefined) {
    payload.scheduled_at = input.scheduledAt || null
    if (input.scheduledAt) payload.status = 'scheduled'
  }

  const { data, error } = await adminDb
    .from('social_posts')
    .update(payload)
    .eq('id', postId)
    .select('campaign_id, scheduled_at, status')
    .single()

  if (error) throw new Error(error.message)
  if (input.scheduledAt) await logSocialEvent(adminDb, 'scheduled', { campaignId: data.campaign_id, postId }, { scheduled_at: data.scheduled_at })
  revalidatePath('/admin/social')
  return { success: true }
}

export async function skipSocialPost(postId: string) {
  const adminDb = await requireAdmin()
  const { data, error } = await adminDb
    .from('social_posts')
    .update({ status: 'skipped', updated_at: new Date().toISOString() })
    .eq('id', postId)
    .select('campaign_id')
    .single()

  if (error) throw new Error(error.message)
  await logSocialEvent(adminDb, 'skipped', { campaignId: data.campaign_id, postId })
  revalidatePath('/admin/social')
  return { success: true }
}

export async function copySocialPost(postId: string) {
  const adminDb = await requireAdmin()
  const { data, error } = await adminDb
    .from('social_posts')
    .select('campaign_id, platform, post_type')
    .eq('id', postId)
    .single()

  if (error) throw new Error(error.message)
  await logSocialEvent(adminDb, 'copied', { campaignId: data.campaign_id, postId }, { platform: data.platform, post_type: data.post_type })
  revalidatePath('/admin/social')
  return { success: true }
}

export async function markSocialPostPosted(postId: string, externalPostId?: string | null) {
  const adminDb = await requireAdmin()
  const { data, error } = await adminDb
    .from('social_posts')
    .update({
      status: 'posted',
      published_at: new Date().toISOString(),
      external_post_id: externalPostId || 'manual',
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .select('campaign_id')
    .single()

  if (error) throw new Error(error.message)
  await logSocialEvent(adminDb, 'manual_posted', { campaignId: data.campaign_id, postId }, { external_post_id: externalPostId || 'manual' })
  revalidatePath('/admin/social')
  revalidatePath('/admin/growth')
  return { success: true }
}

export async function regenerateSocialPost(postId: string) {
  const adminDb = await requireAdmin()
  const { data: post, error } = await adminDb
    .from('social_posts')
    .select('*, social_campaigns(*)')
    .eq('id', postId)
    .single()

  if (error) throw new Error(error.message)
  const campaign = getRelation(post.social_campaigns)
  if (!campaign) throw new Error('Campaign missing')

  const theme = getThemeForKey(campaign.theme_key)
  const platform = normalizeSocialPlatform(post.platform)
  const postType = SOCIAL_POST_TYPES.includes(post.post_type as SocialPostType) ? post.post_type as SocialPostType : 'guess_college'
  const teaserPlayers = await loadTeaserPlayers(adminDb, normalizeSport(campaign.sport), 8)
  const scoreToBeat = await loadScoreToBeat(adminDb, normalizeSport(campaign.sport))
  const survivalLabel = await loadSurvivalLabel(adminDb)
  const campaignUrl = buildSocialUrl({ campaign, platform, postId, postType })
  const context = {
    platform,
    postType,
    campaign,
    theme,
    url: campaignUrl,
    teaserPlayers,
    topScore: scoreToBeat.topScore,
    topPlayer: scoreToBeat.topPlayer,
    survivalLabel,
    draftDate: String(post.metadata?.draft_date || todayKey()),
  }

  const { error: updateError } = await adminDb
    .from('social_posts')
    .update({
      caption: generateSocialCaption(context),
      short_script: generateSocialScript(context),
      campaign_url: campaignUrl,
      asset_url: getSocialAssetUrl(postId),
      metadata: {
        ...(post.metadata || {}),
        square_asset_url: getSocialAssetUrl(postId, 'square'),
        vertical_asset_url: getSocialAssetUrl(postId, 'vertical'),
        primary_asset_format: getPlatformAutomationConfig(platform).primaryAsset,
        posting_mode: getPlatformAutomationConfig(platform).mode,
      },
      status: 'drafted',
      approved_at: null,
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)

  if (updateError) throw new Error(updateError.message)
  await logSocialEvent(adminDb, 'regenerated', { campaignId: campaign.id, postId })
  revalidatePath('/admin/social')
  return { success: true }
}

async function getXAccessToken(adminDb: any) {
  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  const envAccessToken = process.env.X_ACCESS_TOKEN
  const envRefreshToken = process.env.X_REFRESH_TOKEN

  const { data: account } = await adminDb
    .from('social_accounts')
    .select('id, metadata')
    .eq('platform', 'x')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const metadata = account?.metadata || {}
  const refreshToken = metadata.x_refresh_token || envRefreshToken

  if (!clientId || !clientSecret || !refreshToken) {
    if (envAccessToken) return { accessToken: envAccessToken, disabled: false, refreshed: false }
    return {
      accessToken: null,
      disabled: true,
      error: 'X publishing disabled until X_CLIENT_ID, X_CLIENT_SECRET, X_ACCESS_TOKEN, and X_REFRESH_TOKEN are configured.',
    }
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: String(refreshToken),
    client_id: clientId,
  })

  const refreshResponse = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const tokenJson = await refreshResponse.json().catch(() => ({}))
  if (!refreshResponse.ok || !tokenJson.access_token) {
    if (envAccessToken) return { accessToken: envAccessToken, disabled: false, refreshed: false }
    return {
      accessToken: null,
      disabled: false,
      error: JSON.stringify(tokenJson).slice(0, 500) || 'X token refresh failed',
    }
  }

  if (account?.id) {
    await adminDb
      .from('social_accounts')
      .update({
        metadata: {
          ...metadata,
          x_access_token: tokenJson.access_token,
          x_refresh_token: tokenJson.refresh_token || refreshToken,
          x_token_refreshed_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
  }

  return { accessToken: tokenJson.access_token as string, disabled: false, refreshed: true }
}

async function publishX(adminDb: any, post: { caption: string }) {
  const token = await getXAccessToken(adminDb)
  if (token.disabled || !token.accessToken) {
    return { posted: false, disabled: token.disabled, error: token.error }
  }

  const text = post.caption.trim()
  if (text.length > 280) {
    return {
      posted: false,
      disabled: false,
      error: `X post is ${text.length} characters. Shorten it to 280 characters or fewer before publishing.`,
    }
  }

  const response = await fetch('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    return { posted: false, disabled: false, error: JSON.stringify(json).slice(0, 500) }
  }

  return { posted: true, disabled: false, id: json?.data?.id as string | undefined }
}

export async function publishApprovedXPosts(postIds?: string[]) {
  const adminDb = await requireAdmin()
  return publishApprovedXPostsForClient(adminDb, postIds)
}

export async function publishApprovedXPostsForClient(adminDb: SupabaseAdmin | any, postIds?: string[]) {
  const now = new Date().toISOString()
  const query = adminDb
    .from('social_posts')
    .select('*, social_campaigns(*)')
    .eq('platform', 'x')
    .in('status', ['approved', 'scheduled', 'failed'])
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .order('approved_at', { ascending: true, nullsFirst: false })
    .limit(5)

  if (postIds?.length) query.in('id', postIds)
  const { data: posts, error } = await query
  if (error) throw new Error(error.message)

  let posted = 0
  let failed = 0
  let disabled = false

  for (const post of posts || []) {
    const campaign = getRelation(post.social_campaigns)
    const result = await publishX(adminDb, { caption: post.caption })
    if (result.disabled) {
      disabled = true
      break
    }

    if (!result.posted) {
      failed++
      await adminDb
        .from('social_posts')
        .update({ status: 'failed', error: result.error || 'X publish failed', updated_at: new Date().toISOString() })
        .eq('id', post.id)
      await logSocialEvent(adminDb, 'failed', { campaignId: campaign?.id, postId: post.id }, { platform: 'x', error: result.error })
      continue
    }

    posted++
    await adminDb
      .from('social_posts')
      .update({
        status: 'posted',
        published_at: new Date().toISOString(),
        external_post_id: result.id || null,
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)

    await logSocialEvent(adminDb, 'posted', { campaignId: campaign?.id, postId: post.id }, { platform: 'x', external_post_id: result.id || null })
    await adminDb.from('growth_events').insert({
      event_name: 'social_post_published',
      metadata: {
        platform: 'x',
        social_post_id: post.id,
        utm_campaign: campaign?.utm_campaign || null,
        post_type: post.post_type,
      },
    })
  }

  revalidatePath('/admin/social')
  revalidatePath('/admin/growth')
  return {
    posted,
    failed,
    disabled,
    message: disabled ? 'X publishing is disabled until X API env vars are configured.' : undefined,
  }
}

export async function refreshSocialMetrics() {
  const adminDb = await requireAdmin()
  return refreshSocialMetricsForClient(adminDb)
}

export async function refreshSocialMetricsForClient(adminDb: SupabaseAdmin | any) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const [{ data: posts, error: postsError }, { data: events, error: eventsError }] = await Promise.all([
    adminDb
      .from('social_posts')
      .select('id, campaign_id, platform, post_type, metadata')
      .gte('created_at', since)
      .limit(2000),
    adminDb
      .from('growth_events')
      .select('event_name, metadata')
      .gte('created_at', since)
      .limit(20000),
  ])

  if (postsError) throw new Error(postsError.message)
  if (eventsError) throw new Error(eventsError.message)

  const metricsByPost = new Map<string, { landings: number; starts: number; finishes: number; claims: number; shares: number; survival: number }>()
  for (const post of posts || []) {
    metricsByPost.set(post.id, { landings: 0, starts: 0, finishes: 0, claims: 0, shares: 0, survival: 0 })
  }

  for (const event of events || []) {
    const postId = String(event.metadata?.social_post_id || event.metadata?.utm_content || '')
    if (!postId || !metricsByPost.has(postId)) continue
    const metrics = metricsByPost.get(postId)
    if (!metrics) continue
    if (event.event_name === 'campaign_landed' || event.event_name === 'shared_link_landed' || event.event_name === 'social_link_landed') metrics.landings += 1
    if (event.event_name === 'game_started') metrics.starts += 1
    if (event.event_name === 'game_finished') metrics.finishes += 1
    if (event.event_name === 'claim_completed') metrics.claims += 1
    if (event.event_name === 'share_completed') metrics.shares += 1
    if (event.event_name === 'survival_joined') metrics.survival += 1
  }

  let refreshed = 0
  for (const post of posts || []) {
    const metrics = metricsByPost.get(post.id)
    if (!metrics) continue
    const { error } = await adminDb
      .from('social_posts')
      .update({
        metadata: { ...(post.metadata || {}), metrics, metrics_refreshed_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)

    if (!error) {
      refreshed++
      await logSocialEvent(adminDb, 'metric_refresh', { campaignId: post.campaign_id, postId: post.id }, metrics)
    }
  }

  revalidatePath('/admin/social')
  revalidatePath('/admin/growth')
  return { refreshed }
}
