'use server'

import { createClient } from '@/utils/supabase/server'
import {
  buildPersonalizedChallengeCards,
  getPreferenceOptions,
  getRecentBestScores,
  loadTodayDailyRosters,
  normalizeChallengePreferences,
} from '@/lib/personalization'

export async function getChallengePreferenceOptions() {
  const supabase = await createClient()
  return getPreferenceOptions(supabase)
}

export async function getPersonalizedChallengeCards() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('favorite_teams, favorite_schools, favorite_conferences, preferred_sport')
    .eq('id', user.id)
    .maybeSingle()

  const preferences = normalizeChallengePreferences(profile)
  const [rosters, bestScores] = await Promise.all([
    loadTodayDailyRosters(supabase),
    getRecentBestScores(supabase, user.id),
  ])

  return buildPersonalizedChallengeCards(preferences, rosters, bestScores)
}
