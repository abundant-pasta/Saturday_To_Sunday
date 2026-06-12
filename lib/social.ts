import { GROWTH_THEMES, getCurrentGrowthTheme, type GrowthTheme } from '@/lib/growth'

export const SOCIAL_PLATFORMS = ['x', 'tiktok', 'instagram', 'youtube'] as const
export const SOCIAL_POST_TYPES = ['guess_college', 'score_to_beat', 'school_spotlight', 'survival_promo'] as const
export const SOCIAL_ASSET_FORMATS = ['square', 'vertical'] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]
export type SocialPostType = (typeof SOCIAL_POST_TYPES)[number]
export type SocialSport = 'football' | 'basketball' | 'both'
export type SocialAssetFormat = (typeof SOCIAL_ASSET_FORMATS)[number]

export type PlatformAutomationConfig = {
  platform: SocialPlatform
  mode: 'direct_publish' | 'posting_pack'
  readiness: 'ready' | 'needs_credentials' | 'needs_review' | 'manual_only'
  summary: string
  publishAction: string
  primaryAsset: SocialAssetFormat
  requirements: string[]
  envVars: string[]
  docs: { label: string; url: string }[]
  copyChecklist: string[]
}

export type SocialCampaignRecord = {
  id?: string
  key: string
  name: string
  theme_key: string | null
  school: string | null
  sport: SocialSport | null
  default_path: string
  utm_campaign: string
}

export type SocialDraftContext = {
  platform: SocialPlatform
  postType: SocialPostType
  campaign: SocialCampaignRecord
  theme: GrowthTheme
  url: string
  teaserPlayers: string[]
  topScore?: number | null
  topPlayer?: string | null
  survivalLabel?: string | null
  draftDate: string
}

function clean(value?: string | null, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim()
}

export function slugify(value?: string | null, fallback = 'daily') {
  const slug = clean(value, fallback)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)

  return slug || fallback
}

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://playsaturdaytosunday.com').replace(/\/$/, '')
}

export function normalizeSocialPlatform(value?: string | null): SocialPlatform {
  return SOCIAL_PLATFORMS.includes(value as SocialPlatform) ? value as SocialPlatform : 'x'
}

export function formatPlatform(platform: SocialPlatform) {
  if (platform === 'x') return 'X'
  if (platform === 'tiktok') return 'TikTok'
  if (platform === 'instagram') return 'Instagram'
  return 'YouTube Shorts'
}

export function formatPostType(type: SocialPostType) {
  if (type === 'guess_college') return 'Guess College'
  if (type === 'score_to_beat') return 'Score To Beat'
  if (type === 'school_spotlight') return 'School Spotlight'
  return 'Survival Promo'
}

export function getPlatformAutomationConfig(platform: SocialPlatform): PlatformAutomationConfig {
  if (platform === 'x') {
    return {
      platform,
      mode: 'direct_publish',
      readiness: 'needs_credentials',
      summary: 'Approval-gated direct publishing is supported once X API credentials and posting credits are active.',
      publishAction: 'Approve, schedule, then publish X from this console.',
      primaryAsset: 'square',
      requirements: [
        'X developer app with read/write OAuth 2.0 permissions',
        'Valid access and refresh tokens for @PlayS2S',
        'Available X API posting credits',
      ],
      envVars: ['X_CLIENT_ID', 'X_CLIENT_SECRET', 'X_ACCESS_TOKEN', 'X_REFRESH_TOKEN'],
      docs: [{ label: 'X create post', url: 'https://docs.x.com/x-api/posts/create-post' }],
      copyChecklist: ['Approve copy', 'Confirm link UTM params', 'Publish or schedule from admin'],
    }
  }

  if (platform === 'tiktok') {
    return {
      platform,
      mode: 'posting_pack',
      readiness: 'needs_review',
      summary: 'TikTok stays copy/export first because public Direct Post requires creator consent and app review.',
      publishAction: 'Copy the caption/script, download the vertical asset, and post manually in TikTok Studio.',
      primaryAsset: 'vertical',
      requirements: [
        'TikTok developer app with Login Kit',
        'Content Posting API product approval',
        'Creator consent flow before any upload',
        'Audit before API-posted content can be public',
      ],
      envVars: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI'],
      docs: [
        { label: 'TikTok Content Posting', url: 'https://developers.tiktok.com/doc/content-posting-api-get-started/' },
        { label: 'Direct Post', url: 'https://developers.tiktok.com/doc/content-posting-api-reference-direct-post?enter_method=left_navigation' },
      ],
      copyChecklist: ['Open TikTok Studio', 'Use the vertical asset as the visual', 'Paste the hook and caption', 'Add the campaign link in bio/comment if available'],
    }
  }

  if (platform === 'instagram') {
    return {
      platform,
      mode: 'posting_pack',
      readiness: 'needs_credentials',
      summary: 'Instagram publishing needs Meta app permissions plus hosted image/video assets, so v1 exports a Reel/feed pack.',
      publishAction: 'Copy the caption, download the vertical asset, and post manually as a Reel or story.',
      primaryAsset: 'vertical',
      requirements: [
        'Professional Instagram account',
        'Meta app with Instagram content publishing permission',
        'Long-lived token management',
        'Publicly hosted JPEG/MP4 media URL for API publishing',
      ],
      envVars: ['INSTAGRAM_CLIENT_ID', 'INSTAGRAM_CLIENT_SECRET', 'INSTAGRAM_REDIRECT_URI', 'INSTAGRAM_ACCOUNT_ID'],
      docs: [{ label: 'Meta Instagram content publishing', url: 'https://developers.facebook.com/docs/instagram-platform/content-publishing/' }],
      copyChecklist: ['Download the vertical asset', 'Paste caption in Instagram', 'Use the campaign URL in link sticker/bio when possible', 'Mark posted manually'],
    }
  }

  return {
    platform,
    mode: 'posting_pack',
    readiness: 'needs_review',
    summary: 'YouTube Shorts uploads need MP4 generation and YouTube API verification before public autoposting.',
    publishAction: 'Copy the title/description, use the vertical asset as storyboard, and post manually in YouTube Studio.',
    primaryAsset: 'vertical',
    requirements: [
      'Google Cloud OAuth app with YouTube Data API v3 enabled',
      'Offline OAuth token with youtube.upload scope',
      'MP4 short-form asset generation',
      'API audit if the project is new and uploads must be public',
    ],
    envVars: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI', 'YOUTUBE_REFRESH_TOKEN'],
    docs: [{ label: 'YouTube videos.insert', url: 'https://developers.google.com/youtube/v3/docs/videos/insert' }],
    copyChecklist: ['Open YouTube Studio', 'Use the vertical card as the storyboard/thumbnail source', 'Paste the title and description', 'Mark posted manually after upload'],
  }
}

export function defaultPathForSport(sport?: SocialSport | null) {
  return sport === 'basketball' ? '/daily/basketball' : '/daily'
}

export function buildSocialCampaign(input: {
  theme?: GrowthTheme | null
  school?: string | null
  sport?: SocialSport | null
}) {
  const theme = input.theme || getCurrentGrowthTheme()
  const sport = input.sport || theme.sportFocus
  const school = clean(input.school || theme.schools[0] || null) || null
  const schoolSlug = school ? slugify(school) : 'theme'
  const key = `social_${slugify(theme.key)}_${schoolSlug}`
  const name = school ? `${school} Social Spotlight` : `${theme.name} Social`

  return {
    key,
    name,
    theme_key: theme.key,
    school,
    sport,
    default_path: defaultPathForSport(sport),
    utm_campaign: `${slugify(theme.key)}_${schoolSlug}`,
    status: 'active',
    metadata: {
      guide_angle: theme.guideAngle,
      social_prompts: theme.socialPrompts.slice(0, 4),
    },
  }
}

export function buildSocialUrl(input: {
  campaign: SocialCampaignRecord
  platform: SocialPlatform
  postId?: string | null
  postType?: SocialPostType | null
}) {
  const path = input.postType === 'survival_promo' ? '/survival' : (input.campaign.default_path || '/daily')
  const url = new URL(path, getSiteUrl())
  const content = input.postId || `${input.platform}_${input.postType || 'draft'}`

  url.searchParams.set('utm_source', input.platform)
  url.searchParams.set('utm_medium', 'social')
  url.searchParams.set('utm_campaign', input.campaign.utm_campaign || input.campaign.key)
  url.searchParams.set('utm_content', content)
  url.searchParams.set('social_post_id', content)

  if (input.campaign.school) url.searchParams.set('school', input.campaign.school)
  if (input.campaign.theme_key) url.searchParams.set('theme', input.campaign.theme_key)

  return url.toString()
}

export function getSocialAssetUrl(postId: string, format: SocialAssetFormat = 'square') {
  const params = new URLSearchParams({ post_id: postId })
  if (format !== 'square') params.set('format', format)
  return `/api/social-card?${params.toString()}`
}

function joinPlayers(players: string[]) {
  const cleanPlayers = players.map((player) => clean(player)).filter(Boolean).slice(0, 3)
  if (cleanPlayers.length >= 3) return `${cleanPlayers[0]}, ${cleanPlayers[1]}, and ${cleanPlayers[2]}`
  if (cleanPlayers.length === 2) return `${cleanPlayers[0]} and ${cleanPlayers[1]}`
  return cleanPlayers[0] || 'three pro names'
}

function platformSuffix(platform: SocialPlatform) {
  if (platform === 'x') return ''
  if (platform === 'tiktok') return '\n\nPosting pack: use the vertical card, pause for guesses, then send them to the link.'
  if (platform === 'instagram') return '\n\nReel/story pack: use the vertical card, add the link sticker when available, and invite replies.'
  return '\n\nShorts pack: use this as the title/description, keep the reveal tight, and point viewers to the link.'
}

export function generateSocialCaption(context: SocialDraftContext) {
  const school = context.campaign.school || context.theme.schools[0] || 'your school'
  const sportLabel = context.campaign.sport === 'basketball' ? 'basketball' : context.campaign.sport === 'football' ? 'football' : 'football + hoops'
  const players = joinPlayers(context.teaserPlayers)
  const score = context.topScore ? context.topScore.toLocaleString('en-US') : 'today'
  const topPlayer = context.topPlayer || 'the daily winner'

  if (context.postType === 'guess_college') {
    return `You know ${players}. Do you know where they played in college?\n\nPlay today's Saturday to Sunday ${sportLabel} grid:\n${context.url}${platformSuffix(context.platform)}`
  }

  if (context.postType === 'score_to_beat') {
    return `Score to beat: ${score}.\n\n${topPlayer} set the bar. Try today's Saturday to Sunday grid and send it to the friend who always claims they know ball:\n${context.url}${platformSuffix(context.platform)}`
  }

  if (context.postType === 'school_spotlight') {
    return `${school} fans, this one is for you.\n\nCan your group chat beat today's alumni challenge?\n${context.url}${platformSuffix(context.platform)}`
  }

  return `${context.survivalLabel || context.theme.survivalLabel} is the weekly pressure test.\n\nJoin, survive the daily cuts, and see who actually remembers the schools under pressure:\n${context.url}${platformSuffix(context.platform)}`
}

export function generateSocialScript(context: SocialDraftContext) {
  const school = context.campaign.school || context.theme.schools[0] || 'this school'
  const players = joinPlayers(context.teaserPlayers)
  const hook = context.postType === 'school_spotlight'
    ? `${school} fans, quick alumni check.`
    : context.postType === 'survival_promo'
      ? 'Five days. One missed round and you are out.'
      : 'You know the player. Do you know the college?'

  return [
    `0:00 Hook: ${hook}`,
    `0:02 Show: ${players}.`,
    '0:05 Prompt: pause before each school guess.',
    '0:09 CTA: play the full Saturday to Sunday grid.',
    `0:12 Link/caption: ${context.url}`,
  ].join('\n')
}

export function generatePostingPack(input: {
  platform: SocialPlatform
  caption: string
  campaignUrl: string
  shortScript?: string | null
  postId?: string | null
}) {
  const config = getPlatformAutomationConfig(input.platform)
  const squareAsset = input.postId ? `${getSiteUrl()}${getSocialAssetUrl(input.postId, 'square')}` : ''
  const verticalAsset = input.postId ? `${getSiteUrl()}${getSocialAssetUrl(input.postId, 'vertical')}` : ''
  const assetLine = config.primaryAsset === 'vertical'
    ? `Primary asset: ${verticalAsset || 'vertical asset pending'}`
    : `Primary asset: ${squareAsset || 'square asset pending'}`

  return [
    `${formatPlatform(input.platform)} posting pack`,
    '',
    input.caption,
    '',
    `Campaign link: ${input.campaignUrl}`,
    assetLine,
    squareAsset ? `Square card: ${squareAsset}` : null,
    verticalAsset ? `Vertical card: ${verticalAsset}` : null,
    input.shortScript ? `\nShort-form script:\n${input.shortScript}` : null,
    `\nChecklist:\n${config.copyChecklist.map((item) => `- ${item}`).join('\n')}`,
  ].filter(Boolean).join('\n')
}

export function getThemeForKey(key?: string | null) {
  return GROWTH_THEMES.find((theme) => theme.key === key) || getCurrentGrowthTheme()
}
