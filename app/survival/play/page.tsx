import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import SurvivalGridWrapper from '@/components/SurvivalGrid'

export default async function SurvivalPlayPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/survival')

  const { data: tournament } = await supabase
    .from('survival_tournaments')
    .select('id, start_date')
    .eq('is_active', true)
    .single()

  if (!tournament) redirect('/survival')

  const hasStarted = new Date(tournament.start_date).getTime() <= Date.now()
  if (!hasStarted) redirect('/survival')

  const { data: participant } = await supabase
    .from('survival_participants')
    .select('id')
    .eq('tournament_id', tournament.id)
    .eq('user_id', user.id)
    .single()

  if (!participant) redirect('/survival')

  return <SurvivalGridWrapper />
}
