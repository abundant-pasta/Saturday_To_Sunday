import { getConference } from '@/lib/conferences'
import { TIMEZONE_OFFSET_MS } from '@/lib/constants'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PreferredSport = 'football' | 'basketball'
export type ChallengeKind = 'school' | 'conference' | 'team' | 'preferred_sport'

export type DailyQuestion = {
  id: number | string
  name: string
  image_url?: string | null
  answer_hash?: string
  answer_hashes?: string[]
  salt?: string
  correct_answer?: string
  options: string[]
  tier?: number
  sport?: PreferredSport
  team?: string | null
  college?: string | null
  accepted_colleges?: string[]
  college_answer_note?: string | null
  conference?: string | null
}

export type ChallengePreferences = {
  favorite_teams: string[]
  favorite_schools: string[]
  favorite_conferences: string[]
  preferred_sport: PreferredSport | null
}

export type PreferenceOptions = {
  teams: string[]
  schools: string[]
  conferences: string[]
}

export type PersonalizedChallengeCard = {
  id: string
  sport: PreferredSport
  kind: ChallengeKind
  title: string
  subtitle: string
  ctaLabel: string
  href: string
  targetValue: string
  matchCount: number
}

type PlayerMetadata = {
  id: number | string
  team: string | null
  college: string | null
  sport: PreferredSport
}

type SportRosters = Record<PreferredSport, DailyQuestion[]>
type RecentBestScores = Record<PreferredSport, number | null>

const MAX_MULTI_SELECT = 3
const PREFERRED_SCORE_BASELINES: Record<PreferredSport, number> = {
  football: 1000,
  basketball: 900,
}

function normalizeId(value: number | string | null | undefined) {
  return value == null ? '' : String(value)
}

function normalizeString(value: unknown) {
  return String(value || '').trim()
}

function singularOrPlural(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function getDailyGameDate() {
  return new Date(Date.now() - TIMEZONE_OFFSET_MS).toISOString().split('T')[0]
}

function getPlayerIdFilterValues(ids: string[]) {
  return ids.map((id) => (/^\d+$/.test(id) ? Number(id) : id))
}

function sortAlphabetically(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b))
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function scoreFallbackSubtitle(sport: PreferredSport, bestScore: number | null) {
  const fallback = PREFERRED_SCORE_BASELINES[sport]
  if (bestScore && bestScore > 0) {
    return `Top your recent best of ${bestScore.toLocaleString()} in today’s ${sport} grid.`
  }
  return `Score ${fallback.toLocaleString()} or better in today’s ${sport} grid.`
}

function createChallengeHref(
  sport: PreferredSport,
  kind: ChallengeKind,
  targetValue: string,
  label: string
) {
  const basePath = sport === 'basketball' ? '/daily/basketball' : '/daily'
  const params = new URLSearchParams({
    challenge_kind: kind,
    challenge_value: targetValue,
    challenge_label: label,
  })

  return `${basePath}?${params.toString()}`
}

function buildPreferredSportCard(
  sport: PreferredSport,
  bestScore: number | null
): PersonalizedChallengeCard {
  const title = `Beat your best ${sport} day`

  return {
    id: `preferred_sport_${sport}`,
    sport,
    kind: 'preferred_sport',
    title,
    subtitle: scoreFallbackSubtitle(sport, bestScore),
    ctaLabel: sport === 'basketball' ? 'Play Basketball' : 'Play Football',
    href: createChallengeHref(sport, 'preferred_sport', sport, title),
    targetValue: sport,
    matchCount: 0,
  }
}

function getSportLabel(sport: PreferredSport) {
  return sport === 'basketball' ? 'basketball' : 'football'
}

function buildMatchedCard(
  sport: PreferredSport,
  kind: Exclude<ChallengeKind, 'preferred_sport'>,
  targetValue: string,
  matchCount: number
): PersonalizedChallengeCard {
  const sportLabel = getSportLabel(sport)

  if (kind === 'school') {
    const title = `Tonight’s ${targetValue} alumni challenge`
    return {
      id: `${kind}_${sport}_${targetValue}`,
      sport,
      kind,
      title,
      subtitle: `${singularOrPlural(matchCount, 'player')} from ${targetValue} in today’s ${sportLabel} grid.`,
      ctaLabel: 'Play Now',
      href: createChallengeHref(sport, kind, targetValue, title),
      targetValue,
      matchCount,
    }
  }

  if (kind === 'conference') {
    const title = `${targetValue} challenge`
    return {
      id: `${kind}_${sport}_${targetValue}`,
      sport,
      kind,
      title,
      subtitle: `${singularOrPlural(matchCount, 'player')} from the ${targetValue} in today’s ${sportLabel} grid.`,
      ctaLabel: 'Take It On',
      href: createChallengeHref(sport, kind, targetValue, title),
      targetValue,
      matchCount,
    }
  }

  const title = `${targetValue} fan check-in`
  return {
    id: `${kind}_${sport}_${targetValue}`,
    sport,
    kind,
    title,
    subtitle: `${singularOrPlural(matchCount, 'player')} from ${targetValue} in today’s ${sportLabel} grid.`,
    ctaLabel: 'Lock In',
    href: createChallengeHref(sport, kind, targetValue, title),
    targetValue,
    matchCount,
  }
}

function getChallengeMatchCount(kind: Exclude<ChallengeKind, 'preferred_sport'>, targetValue: string, questions: DailyQuestion[]) {
  return questions.filter((question) => {
    if (kind === 'school') return question.college === targetValue
    if (kind === 'conference') return question.conference === targetValue
    return question.team === targetValue
  }).length
}

function chooseBestSportForMatch(
  kind: Exclude<ChallengeKind, 'preferred_sport'>,
  targetValue: string,
  rosters: SportRosters,
  preferredSport: PreferredSport | null
) {
  const sportOrder: PreferredSport[] = preferredSport
    ? [preferredSport, preferredSport === 'football' ? 'basketball' : 'football']
    : ['football', 'basketball']

  let best: { sport: PreferredSport; matchCount: number } | null = null

  for (const sport of sportOrder) {
    const matchCount = getChallengeMatchCount(kind, targetValue, rosters[sport])
    if (matchCount === 0) continue

    if (!best || matchCount > best.matchCount) {
      best = { sport, matchCount }
    }
  }

  return best
}

export function sanitizeMultiSelect(values: string[] | null | undefined) {
  return dedupe((values || []).map(normalizeString)).slice(0, MAX_MULTI_SELECT)
}

export function normalizeChallengePreferences(row: Partial<ChallengePreferences> | null | undefined): ChallengePreferences {
  const preferredSport = row?.preferred_sport === 'football' || row?.preferred_sport === 'basketball'
    ? row.preferred_sport
    : null

  return {
    favorite_teams: sanitizeMultiSelect(row?.favorite_teams),
    favorite_schools: sanitizeMultiSelect(row?.favorite_schools),
    favorite_conferences: sanitizeMultiSelect(row?.favorite_conferences),
    preferred_sport: preferredSport,
  }
}

export async function getPreferenceOptions(supabase: SupabaseClient<any, 'public', any>): Promise<PreferenceOptions> {
  const { data: players } = await supabase
    .from('players')
    .select('team, college')

  const teams = sortAlphabetically(
    dedupe((players || []).map((player: { team: string | null }) => normalizeString(player.team)))
  )
  const schools = sortAlphabetically(
    dedupe((players || []).map((player: { college: string | null }) => normalizeString(player.college)))
  )
  const conferences = sortAlphabetically(
    dedupe(
      schools
        .map((school) => getConference(school))
        .filter((conference) => conference && conference !== 'Other')
    )
  )

  return { teams, schools, conferences }
}

export async function getRecentBestScores(
  supabase: SupabaseClient<any, 'public', any>,
  userId: string
): Promise<RecentBestScores> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: results } = await supabase
    .from('daily_results')
    .select('sport, score')
    .eq('user_id', userId)
    .gte('game_date', since)
    .in('sport', ['football', 'basketball'])

  const bestScores: RecentBestScores = {
    football: null,
    basketball: null,
  }

  for (const result of results || []) {
    if (result.sport !== 'football' && result.sport !== 'basketball') continue
    const sport: PreferredSport = result.sport
    bestScores[sport] = Math.max(bestScores[sport] || 0, result.score || 0)
  }

  return bestScores
}

export async function loadTodayDailyRosters(
  supabase: SupabaseClient<any, 'public', any>,
  sports: PreferredSport[] = ['football', 'basketball']
): Promise<SportRosters> {
  const date = getDailyGameDate()
  const { data: dailyGames } = await supabase
    .from('daily_games')
    .select('sport, content')
    .eq('date', date)
    .in('sport', sports)

  const rosterMap: SportRosters = {
    football: [],
    basketball: [],
  }

  const rawQuestions = (dailyGames || []).flatMap((game: { sport: string; content: DailyQuestion[] }) => {
    const sport = game.sport === 'basketball' ? 'basketball' : 'football'
    const questions: DailyQuestion[] = (game.content || []).map((question) => ({
      ...question,
      sport,
    }))
    rosterMap[sport] = questions
    return questions
  })

  const playerIds = dedupe(rawQuestions.map((question) => normalizeId(question.id))).filter(Boolean)
  if (playerIds.length === 0) return rosterMap

  const { data: players } = await supabase
    .from('players')
    .select('id, team, college, sport')
    .in('id', getPlayerIdFilterValues(playerIds))

  const playerMap = new Map<string, PlayerMetadata>()
  for (const player of players || []) {
    if (player.sport !== 'football' && player.sport !== 'basketball') continue
    playerMap.set(normalizeId(player.id), player as PlayerMetadata)
  }

  for (const sport of sports) {
    rosterMap[sport] = rosterMap[sport].map((question) => {
      const player = playerMap.get(normalizeId(question.id))
      const college = question.college || player?.college || null
      return {
        ...question,
        sport,
        team: question.team || player?.team || null,
        college,
        conference: question.conference || (college ? getConference(college) : null),
      }
    })
  }

  return rosterMap
}

export async function enrichQuestionsWithPlayerMetadata(
  supabase: SupabaseClient<any, 'public', any>,
  questions: DailyQuestion[],
  sport: PreferredSport
): Promise<DailyQuestion[]> {
  const rosterMap = await loadTodayDailyRosters(supabase, [sport])
  const enrichedQuestions = rosterMap[sport]
  if (enrichedQuestions.length === questions.length && enrichedQuestions.length > 0) {
    const byId = new Map(enrichedQuestions.map((question) => [normalizeId(question.id), question]))
    return questions.map((question) => {
      const enriched = byId.get(normalizeId(question.id))
      return {
        ...question,
        team: question.team || enriched?.team || null,
        college: question.college || enriched?.college || null,
        conference: question.conference || enriched?.conference || null,
        sport,
      }
    })
  }

  return questions.map((question) => {
    const college = question.college || null
    return {
      ...question,
      team: question.team || null,
      college,
      conference: question.conference || (college ? getConference(college) : null),
      sport,
    }
  })
}

export function buildPersonalizedChallengeCards(
  preferences: ChallengePreferences,
  rosters: SportRosters,
  bestScores: RecentBestScores,
  options?: { includeGenericFallback?: boolean }
) {
  const includeGenericFallback = options?.includeGenericFallback ?? true
  const cards: PersonalizedChallengeCard[] = []

  for (const school of preferences.favorite_schools) {
    const match = chooseBestSportForMatch('school', school, rosters, preferences.preferred_sport)
    if (match) cards.push(buildMatchedCard(match.sport, 'school', school, match.matchCount))
  }

  for (const conference of preferences.favorite_conferences) {
    const match = chooseBestSportForMatch('conference', conference, rosters, preferences.preferred_sport)
    if (match) cards.push(buildMatchedCard(match.sport, 'conference', conference, match.matchCount))
  }

  for (const team of preferences.favorite_teams) {
    const match = chooseBestSportForMatch('team', team, rosters, preferences.preferred_sport)
    if (match) cards.push(buildMatchedCard(match.sport, 'team', team, match.matchCount))
  }

  const preferredSportOrder: PreferredSport[] = preferences.preferred_sport
    ? [preferences.preferred_sport]
    : ['football', 'basketball']

  for (const sport of preferredSportOrder) {
    cards.push(buildPreferredSportCard(sport, bestScores[sport]))
  }

  if (cards.length === 0 && includeGenericFallback) {
    cards.push(buildPreferredSportCard('football', bestScores.football))
    cards.push(buildPreferredSportCard('basketball', bestScores.basketball))
  }

  return cards
    .filter((card, index, allCards) => allCards.findIndex((candidate) => candidate.id === card.id) === index)
    .slice(0, 3)
}

export function getChallengeLabel(kind: ChallengeKind, value: string, sport: PreferredSport, matchCount = 0) {
  if (kind === 'school') return `Go ${matchCount}/${matchCount} on ${value} players`
  if (kind === 'conference') return `Clear the ${value} challenge`
  if (kind === 'team') return `Nail every ${value} player`
  return `Beat your best ${sport} score`
}

export function buildPushCopy(card: PersonalizedChallengeCard | null) {
  if (!card) {
    return {
      title: 'Saturday to Sunday',
      body: "New Daily Grids are live! Check out today's Football and Basketball challenges. 🏈 🏀",
      icon: '/icon-192x192.png',
    }
  }

  if (card.kind === 'school') {
    return {
      title: 'Saturday to Sunday',
      body: `Your ${card.targetValue} alumni challenge is live.`,
      icon: '/icon-192x192.png',
    }
  }

  if (card.kind === 'conference') {
    return {
      title: 'Saturday to Sunday',
      body: `${card.targetValue} challenge is live in today's grid.`,
      icon: '/icon-192x192.png',
    }
  }

  if (card.kind === 'team') {
    return {
      title: 'Saturday to Sunday',
      body: `There are ${card.matchCount} ${card.targetValue} players in today's grid.`,
      icon: '/icon-192x192.png',
    }
  }

  return {
    title: 'Saturday to Sunday',
    body: `${card.sport === 'basketball' ? 'Basketball' : 'Football'} is live. Beat your best score today.`,
    icon: '/icon-192x192.png',
  }
}

export function getFallbackTargetScore(sport: PreferredSport, bestScore: number | null) {
  return Math.max(bestScore || 0, PREFERRED_SCORE_BASELINES[sport])
}
