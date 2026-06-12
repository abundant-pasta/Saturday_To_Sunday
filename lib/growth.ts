export type GrowthSportFocus = 'football' | 'basketball' | 'both'

export type GrowthTheme = {
  key: string
  name: string
  shortName: string
  description: string
  sportFocus: GrowthSportFocus
  ctaLabel: string
  ctaHref: string
  survivalLabel: string
  guideAngle: string
  schools: string[]
  socialPrompts: string[]
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const THEME_ANCHOR_UTC = Date.UTC(2026, 0, 5)

export const GROWTH_THEMES: GrowthTheme[] = [
  {
    key: 'nfl_draft_schools',
    name: 'NFL Draft Schools',
    shortName: 'Draft Schools',
    description: 'Prospect pipelines, first-round factories, and the schools that keep feeding Sundays.',
    sportFocus: 'football',
    ctaLabel: 'Play the Draft Schools Grid',
    ctaHref: '/daily?theme=nfl_draft_schools&utm_source=owned&utm_medium=homepage&utm_campaign=nfl_draft_schools&utm_content=football_grid',
    survivalLabel: 'Draft Schools Survival',
    guideAngle: 'Which colleges produce the pros everyone actually remembers?',
    schools: ['Alabama', 'Georgia', 'Ohio State', 'Michigan', 'LSU', 'Texas', 'USC', 'Notre Dame'],
    socialPrompts: [
      'Do you know where these first-rounders played in college?',
      'Three NFL names, three schools. Beat today’s grid.',
      'Only real draft-board watchers know all of these.',
    ],
  },
  {
    key: 'march_madness_alumni',
    name: 'March Madness Alumni',
    shortName: 'Madness Alumni',
    description: 'Tournament heroes and NBA names who first became unavoidable in March.',
    sportFocus: 'basketball',
    ctaLabel: 'Play the Madness Grid',
    ctaHref: '/daily/basketball?theme=march_madness_alumni&utm_source=owned&utm_medium=homepage&utm_campaign=march_madness_alumni&utm_content=basketball_grid',
    survivalLabel: 'March Alumni Survival',
    guideAngle: 'From bracket memories to NBA careers, which schools can you still place?',
    schools: ['Duke', 'Kentucky', 'UNC', 'Kansas', 'UConn', 'Villanova', 'Michigan State', 'Gonzaga'],
    socialPrompts: [
      'Three NBA names who owned March. Where did they play?',
      'Today’s basketball grid is built for bracket people.',
      'If you watched the tournament, this one should be in your bag.',
    ],
  },
  {
    key: 'nba_playoffs_alumni',
    name: 'NBA Playoffs Alumni',
    shortName: 'Playoff Alumni',
    description: 'Playoff rotations, stars, and role players traced back to campus.',
    sportFocus: 'basketball',
    ctaLabel: 'Play the Playoff Alumni Grid',
    ctaHref: '/daily/basketball?theme=nba_playoffs_alumni&utm_source=owned&utm_medium=homepage&utm_campaign=nba_playoffs_alumni&utm_content=basketball_grid',
    survivalLabel: 'Playoff Alumni Survival',
    guideAngle: 'The guys deciding May and June games still have college origin stories.',
    schools: ['Duke', 'Kentucky', 'UCLA', 'Arizona', 'Kansas', 'Texas', 'Villanova', 'Marquette'],
    socialPrompts: [
      'You know the playoff player. Do you know the college?',
      'Today’s challenge: place three NBA playoff names.',
      'This is for people who know rotations and rosters.',
    ],
  },
  {
    key: 'rivalry_week',
    name: 'Rivalry Week',
    shortName: 'Rivalry Week',
    description: 'The schools, grudges, and alumni bases that turn one answer into a bragging-rights check.',
    sportFocus: 'both',
    ctaLabel: 'Play the Rivalry Grid',
    ctaHref: '/daily?theme=rivalry_week&utm_source=owned&utm_medium=homepage&utm_campaign=rivalry_week&utm_content=football_grid',
    survivalLabel: 'Rivalry Week Survival',
    guideAngle: 'Build posts around one rivalry and let both fan bases argue with the scoreboard.',
    schools: ['Michigan', 'Ohio State', 'Alabama', 'Auburn', 'Duke', 'UNC', 'Kansas', 'Kansas State'],
    socialPrompts: [
      'Rivalry check: can you place these alumni before your rival can?',
      'Today’s grid is pure bragging rights.',
      'Tag the fan base that should never miss this one.',
    ],
  },
  {
    key: 'heisman_week',
    name: 'Heisman Week',
    shortName: 'Heisman Week',
    description: 'Heisman winners, finalists, and the Sundays they turned into.',
    sportFocus: 'football',
    ctaLabel: 'Play the Heisman Grid',
    ctaHref: '/daily?theme=heisman_week&utm_source=owned&utm_medium=homepage&utm_campaign=heisman_week&utm_content=football_grid',
    survivalLabel: 'Heisman Week Survival',
    guideAngle: 'Some Heisman names are automatic. The finalists are where it gets interesting.',
    schools: ['Oklahoma', 'USC', 'Alabama', 'Florida', 'LSU', 'Baylor', 'Texas A&M', 'Louisville'],
    socialPrompts: [
      'Heisman memory test: where did these pros play?',
      'The trophy is famous. The school should be too.',
      'Today’s challenge is built for award-season people.',
    ],
  },
  {
    key: 'hbcu_legends',
    name: 'HBCU Legends',
    shortName: 'HBCU Legends',
    description: 'A spotlight for HBCU alumni, history, and pro careers worth celebrating.',
    sportFocus: 'football',
    ctaLabel: 'Play the HBCU Legends Grid',
    ctaHref: '/daily?theme=hbcu_legends&utm_source=owned&utm_medium=homepage&utm_campaign=hbcu_legends&utm_content=football_grid',
    survivalLabel: 'HBCU Legends Survival',
    guideAngle: 'A history-forward week built around player spotlights and school pride.',
    schools: ['Jackson State', 'Grambling State', 'Florida A&M', 'Howard', 'North Carolina A&T', 'Southern', 'Tennessee State'],
    socialPrompts: [
      'HBCU legend check: do you know the school?',
      'Today’s grid has a little more history in it.',
      'A campus-to-pros challenge worth sharing.',
    ],
  },
  {
    key: 'blue_blood_basketball',
    name: 'Blue Blood Basketball Week',
    shortName: 'Blue Bloods',
    description: 'The obvious jerseys, the endless alumni lists, and the names everyone claims to know.',
    sportFocus: 'basketball',
    ctaLabel: 'Play the Blue Blood Grid',
    ctaHref: '/daily/basketball?theme=blue_blood_basketball&utm_source=owned&utm_medium=homepage&utm_campaign=blue_blood_basketball&utm_content=basketball_grid',
    survivalLabel: 'Blue Blood Survival',
    guideAngle: 'Duke, Kentucky, UNC, Kansas, UConn. Easy to say, harder to sort under pressure.',
    schools: ['Duke', 'Kentucky', 'UNC', 'Kansas', 'UConn', 'UCLA', 'Indiana', 'Louisville'],
    socialPrompts: [
      'Blue blood test: which college did this NBA player come from?',
      'These schools produce everyone. Can you keep them straight?',
      'Today’s basketball grid is for banner-count people.',
    ],
  },
  {
    key: 'small_school_stars',
    name: 'Small-School Stars',
    shortName: 'Small Schools',
    description: 'The players everyone knows and the college answers that are just obscure enough to feel earned.',
    sportFocus: 'both',
    ctaLabel: 'Play the Small-School Grid',
    ctaHref: '/daily?theme=small_school_stars&utm_source=owned&utm_medium=homepage&utm_campaign=small_school_stars&utm_content=football_grid',
    survivalLabel: 'Small-School Survival',
    guideAngle: 'The perfect theme for high-score screenshots because the misses feel surprising.',
    schools: ['Davidson', 'Weber State', 'Fresno State', 'Eastern Washington', 'San Diego State', 'Northern Iowa'],
    socialPrompts: [
      'You know the player. Nobody remembers the school.',
      'Small-school stars are the hardest daily grid cheat code.',
      'This one separates casual fans from roster people.',
    ],
  },
  {
    key: 'school_spotlight',
    name: 'School Spotlight',
    shortName: 'School Spotlight',
    description: 'A flexible weekly campaign for one school, alumni page, creator, or fan account.',
    sportFocus: 'both',
    ctaLabel: 'Play the School Spotlight',
    ctaHref: '/daily?theme=school_spotlight&utm_source=owned&utm_medium=homepage&utm_campaign=school_spotlight&utm_content=football_grid',
    survivalLabel: 'School Spotlight Survival',
    guideAngle: 'Pick one school and turn the week into a custom alumni challenge.',
    schools: ['Alabama', 'Georgia', 'Ohio State', 'Michigan', 'Texas', 'LSU', 'Duke', 'Kentucky', 'UNC', 'Kansas', 'UConn'],
    socialPrompts: [
      'Can your fan base beat today’s alumni grid?',
      'I built a custom school challenge. Who is beating this score?',
      'Tag the alumni account that should run this.',
    ],
  },
]

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor
}

function startOfUtcWeek(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = start.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  start.setUTCDate(start.getUTCDate() + diff)
  return start
}

export function getCurrentGrowthTheme(date = new Date()) {
  const weekStart = startOfUtcWeek(date).getTime()
  const weekIndex = Math.floor((weekStart - THEME_ANCHOR_UTC) / WEEK_MS)
  return GROWTH_THEMES[positiveModulo(weekIndex, GROWTH_THEMES.length)]
}

export function getUpcomingGrowthThemes(count = 6, from = new Date()) {
  const weekStart = startOfUtcWeek(from)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(weekStart)
    date.setUTCDate(date.getUTCDate() + index * 7)
    return {
      weekStart: date.toISOString().split('T')[0],
      theme: getCurrentGrowthTheme(date),
    }
  })
}

export function getThemeByKey(key?: string | null) {
  if (!key) return null
  return GROWTH_THEMES.find((theme) => theme.key === key) || null
}

export function getThemeMetadata(theme: GrowthTheme) {
  return {
    key: theme.key,
    name: theme.name,
    shortName: theme.shortName,
    sportFocus: theme.sportFocus,
    ctaLabel: theme.ctaLabel,
    ctaHref: theme.ctaHref,
    survivalLabel: theme.survivalLabel,
    guideAngle: theme.guideAngle,
    schools: theme.schools.slice(0, 12),
    socialPrompts: theme.socialPrompts.slice(0, 4),
  }
}

function cleanParam(value?: string | null) {
  if (!value) return null
  return value.replace(/[_-]+/g, ' ').replace(/[^\w .&']/g, '').trim().slice(0, 48) || null
}

export function buildCampaignLandingCopy(input: {
  school?: string | null
  themeKey?: string | null
  sport?: 'football' | 'basketball'
}) {
  const sportLabel = input.sport === 'basketball' ? 'basketball' : 'football'
  const school = cleanParam(input.school)

  if (school) {
    return {
      badge: 'School Spotlight',
      title: `${school} Alumni Challenge`,
      subtitle: `Play today's ${sportLabel} grid, then share your score with ${school} fans.`,
    }
  }

  const theme = getThemeByKey(input.themeKey)
  if (theme) {
    return {
      badge: 'Weekly Theme',
      title: theme.name,
      subtitle: theme.guideAngle,
    }
  }

  return null
}
