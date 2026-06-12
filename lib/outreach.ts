import { getCurrentGrowthTheme, getThemeByKey } from '@/lib/growth'

export type OutreachSport = 'football' | 'basketball' | 'both'

export type OutreachCandidate = {
  source: string
  platform: string
  displayName: string
  url: string
  email?: string | null
  contactUrl?: string | null
  school?: string | null
  sport?: OutreachSport | null
  targetType: 'podcast' | 'newsletter' | 'fan_site' | 'alumni_page' | 'creator' | 'generic_contact'
  fitScore: number
  metadata?: Record<string, unknown>
}

export type OutreachDiscoveryInput = {
  school?: string | null
  sport?: OutreachSport | null
  themeKey?: string | null
  limit?: number
}

export type OutreachCampaignInput = {
  school?: string | null
  sport?: OutreachSport | null
  themeKey?: string | null
}

type OutreachCampaignRow = {
  id: string
  key: string
  name: string
  theme_key: string | null
  school: string | null
  sport: string | null
  base_path: string
  utm_campaign: string
  default_subject: string
  default_pitch: string
  status: string
}

type OutreachTargetRow = {
  id: string
  display_name: string
  url: string
  email: string | null
  contact_url: string | null
  school: string | null
  sport: string | null
  target_type: string
  status: string
  fit_score: number
}

const PRIORITY_SCHOOLS = ['Alabama', 'Georgia', 'Ohio State', 'Michigan', 'Texas', 'LSU', 'Duke', 'Kentucky', 'UNC', 'Kansas', 'UConn']
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const CONTACT_HREF_PATTERN = /href=["']([^"']*(?:contact|about|advertis|sponsor|media)[^"']*)["']/gi
const FEED_HREF_PATTERN = /href=["']([^"']*(?:rss|feed|atom)[^"']*)["']/gi

function cleanText(value?: string | null) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function slugify(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72) || 'outreach'
}

function normalizeUrl(value?: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    url.hash = ''
    if (url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1)
    return url.toString()
  } catch {
    return null
  }
}

function resolveUrl(base: string, href?: string | null) {
  if (!href) return null
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

function pickEmail(html: string) {
  const matches = html.match(EMAIL_PATTERN) || []
  return matches
    .map((email) => email.toLowerCase())
    .find((email) => !email.includes('example.') && !email.includes('sentry.') && !email.includes('schema.org')) || null
}

function pickHref(html: string, base: string, pattern: RegExp) {
  pattern.lastIndex = 0
  const match = pattern.exec(html)
  return match ? resolveUrl(base, match[1]) : null
}

async function fetchText(url: string, timeoutMs = 8000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SaturdayToSundayOutreach/1.0 (+https://playsaturdaytosunday.com)',
      },
    })
    if (!response.ok) return null
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text') && !contentType.includes('html') && !contentType.includes('xml') && !contentType.includes('json')) return null
    return await response.text()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function scoreCandidate(candidate: OutreachCandidate, input: OutreachDiscoveryInput) {
  let score = 0
  const targetSchool = cleanText(input.school)
  if (targetSchool && candidate.school?.toLowerCase() === targetSchool.toLowerCase()) score += 30
  if (candidate.email) score += 20
  if (candidate.targetType === 'podcast' || candidate.targetType === 'newsletter' || candidate.targetType === 'fan_site') score += 15
  if (candidate.metadata?.recentSignal) score += 10
  if (!candidate.email && !candidate.contactUrl) score -= 25
  return Math.max(-50, score)
}

export function getOutreachSchools(input: OutreachDiscoveryInput = {}) {
  if (input.school) return [cleanText(input.school)]
  const theme = getThemeByKey(input.themeKey) || getCurrentGrowthTheme()
  return (theme.schools.length ? theme.schools : PRIORITY_SCHOOLS).slice(0, 4)
}

export function buildOutreachCampaign(input: OutreachCampaignInput = {}) {
  const theme = getThemeByKey(input.themeKey) || getCurrentGrowthTheme()
  const school = cleanText(input.school) || theme.schools[0] || 'College Sports'
  const sport = input.sport || (theme.sportFocus === 'both' ? 'football' : theme.sportFocus)
  const sportPath = sport === 'basketball' ? '/daily/basketball' : '/daily'
  const schoolSlug = slugify(school)
  const themeSlug = slugify(theme.key)
  const campaignKey = `${themeSlug}_${schoolSlug}`.slice(0, 96)
  const sportLabel = sport === 'basketball' ? 'basketball' : sport === 'football' ? 'football' : 'sports'

  return {
    key: campaignKey,
    name: `${school} ${theme.shortName}`,
    theme_key: theme.key,
    school,
    sport,
    base_path: sportPath,
    utm_campaign: campaignKey,
    default_subject: `Custom ${school} alumni challenge for your followers`,
    default_pitch: `I built a quick ${school} alumni ${sportLabel} challenge for your followers.`,
  }
}

export function buildOutreachUrl(campaign: Pick<OutreachCampaignRow, 'base_path' | 'utm_campaign' | 'school' | 'theme_key'>, target: Pick<OutreachTargetRow, 'id' | 'display_name'>) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://playsaturdaytosunday.com'
  const url = new URL(campaign.base_path || '/daily', base)
  url.searchParams.set('utm_source', 'outreach')
  url.searchParams.set('utm_medium', 'email')
  url.searchParams.set('utm_campaign', campaign.utm_campaign)
  url.searchParams.set('utm_content', slugify(target.display_name))
  if (campaign.school) url.searchParams.set('school', campaign.school)
  if (campaign.theme_key) url.searchParams.set('theme', campaign.theme_key)
  url.searchParams.set('outreach_target', target.id)
  return url.toString()
}

async function enrichCandidate(candidate: OutreachCandidate) {
  const normalizedUrl = normalizeUrl(candidate.url)
  if (!normalizedUrl) return null

  const homepage = await fetchText(normalizedUrl)
  let email = candidate.email || null
  let contactUrl = candidate.contactUrl || null
  let feedUrl: string | null = null

  if (homepage) {
    email = email || pickEmail(homepage)
    contactUrl = contactUrl || pickHref(homepage, normalizedUrl, CONTACT_HREF_PATTERN)
    feedUrl = pickHref(homepage, normalizedUrl, FEED_HREF_PATTERN)
  }

  if (!email && contactUrl) {
    const contactHtml = await fetchText(contactUrl)
    if (contactHtml) email = pickEmail(contactHtml)
  }

  return {
    ...candidate,
    url: normalizedUrl,
    email,
    contactUrl,
    fitScore: scoreCandidate({ ...candidate, email, contactUrl }, { school: candidate.school, sport: candidate.sport }),
    metadata: {
      ...(candidate.metadata || {}),
      feedUrl,
      enrichedAt: new Date().toISOString(),
    },
  }
}

async function discoverPodcasts(input: OutreachDiscoveryInput) {
  const schools = getOutreachSchools(input)
  const sport = input.sport === 'basketball' ? 'basketball' : input.sport === 'football' ? 'football' : 'sports'
  const candidates: OutreachCandidate[] = []

  for (const school of schools) {
    const term = encodeURIComponent(`${school} ${sport} podcast`)
    const text = await fetchText(`https://itunes.apple.com/search?term=${term}&media=podcast&entity=podcast&limit=8`)
    if (!text) continue

    try {
      const json = JSON.parse(text)
      for (const item of json.results || []) {
        const url = normalizeUrl(item.collectionViewUrl || item.feedUrl)
        if (!url) continue
        candidates.push({
          source: 'itunes_podcast_search',
          platform: 'podcast',
          displayName: cleanText(item.collectionName || item.artistName || `${school} podcast`),
          url,
          contactUrl: item.feedUrl || null,
          school,
          sport: input.sport || null,
          targetType: 'podcast',
          fitScore: 0,
          metadata: {
            artistName: item.artistName,
            feedUrl: item.feedUrl,
            recentSignal: true,
          },
        })
      }
    } catch {
      continue
    }
  }

  return candidates
}

async function discoverPublicSearch(input: OutreachDiscoveryInput) {
  const apiKey = process.env.OUTREACH_SEARCH_API_KEY
  if (!apiKey) {
    return { candidates: [] as OutreachCandidate[], warning: 'Search provider not configured' }
  }

  const endpoint = process.env.OUTREACH_SEARCH_ENDPOINT || 'https://api.search.brave.com/res/v1/web/search'
  const schools = getOutreachSchools(input)
  const candidates: OutreachCandidate[] = []

  for (const school of schools) {
    const queries = [
      `${school} ${input.sport || 'sports'} podcast contact`,
      `${school} fan site email sports`,
      `${school} alumni newsletter sports`,
    ]

    for (const query of queries) {
      const url = `${endpoint}?q=${encodeURIComponent(query)}&count=5`
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'x-subscription-token': apiKey,
            'User-Agent': 'SaturdayToSundayOutreach/1.0 (+https://playsaturdaytosunday.com)',
          },
        })
        if (!response.ok) continue
        const json = await response.json()
        for (const result of json.web?.results || json.results || []) {
          const resultUrl = normalizeUrl(result.url)
          if (!resultUrl) continue
          const title = cleanText(result.title || result.name || resultUrl)
          candidates.push({
            source: 'public_search',
            platform: 'web',
            displayName: title,
            url: resultUrl,
            school,
            sport: input.sport || null,
            targetType: title.toLowerCase().includes('newsletter') ? 'newsletter' : title.toLowerCase().includes('podcast') ? 'podcast' : 'fan_site',
            fitScore: 0,
            metadata: {
              query,
              description: result.description || result.snippet || null,
            },
          })
        }
      } catch {
        continue
      } finally {
        clearTimeout(timeout)
      }
    }
  }

  return { candidates, warning: null }
}

export async function discoverOutreachCandidates(input: OutreachDiscoveryInput = {}) {
  const [podcasts, search] = await Promise.all([
    discoverPodcasts(input),
    discoverPublicSearch(input),
  ])

  const seen = new Set<string>()
  const enriched: OutreachCandidate[] = []
  const rawCandidates = [...podcasts, ...search.candidates].slice(0, input.limit || 32)

  for (const candidate of rawCandidates) {
    const normalized = normalizeUrl(candidate.url)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    const enrichedCandidate = await enrichCandidate({ ...candidate, url: normalized })
    if (!enrichedCandidate) continue
    enrichedCandidate.fitScore = scoreCandidate(enrichedCandidate, input)
    enriched.push(enrichedCandidate)
  }

  return {
    candidates: enriched.sort((a, b) => b.fitScore - a.fitScore),
    warnings: search.warning ? [search.warning] : [],
  }
}

export function generateOutreachDraft(campaign: OutreachCampaignRow, target: OutreachTargetRow) {
  const campaignUrl = buildOutreachUrl(campaign, target)
  const school = campaign.school || target.school || 'your school'
  const targetName = target.display_name
  const channel = target.email ? 'email' : target.contact_url ? 'contact_form' : 'copy_only'

  const openerByType: Record<string, string> = {
    podcast: `I found ${targetName} while looking for college sports podcasts that might enjoy a quick fan challenge.`,
    newsletter: `I found ${targetName} while looking for sports newsletters that cover ${school}.`,
    fan_site: `I found ${targetName} while looking for ${school} fan communities.`,
    alumni_page: `I found ${targetName} while looking for alumni communities around ${school} sports.`,
    creator: `I found ${targetName} while looking for creators who make college sports fun.`,
    generic_contact: `I found ${targetName} while looking for college sports communities.`,
  }

  const body = [
    `Hi ${targetName},`,
    '',
    openerByType[target.target_type] || openerByType.generic_contact,
    campaign.default_pitch,
    '',
    `Here is the custom link: ${campaignUrl}`,
    '',
    'The ask is lightweight: if this is useful, share it with a "can you beat this score?" caption or send it to one fan who would know the alumni.',
    'Want me to make a weekly school challenge for your page?',
    '',
    'If this is not useful, reply no thanks and I will not follow up.',
    '',
    'Matthew',
  ].join('\n')

  return {
    channel,
    subject: campaign.default_subject,
    body,
    campaignUrl,
  }
}

export async function sendOutreachEmail(input: { to: string; subject: string; body: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.OUTREACH_FROM_EMAIL
  const replyTo = process.env.OUTREACH_REPLY_TO_EMAIL

  if (!apiKey || !from || !replyTo) {
    return { sent: false, disabled: true, error: 'Email sending is disabled until RESEND_API_KEY, OUTREACH_FROM_EMAIL, and OUTREACH_REPLY_TO_EMAIL are set.' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      reply_to: replyTo,
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
