'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function joinTournament(tournamentId: string) {
    const supabase = await createClient()

    // 1. Auth Check
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'You must be logged in to join the tournament.' }
    }

    try {
        // 2. Tournament Validation
        const { data: tournament, error: tourneyError } = await supabase
            .from('survival_tournaments')
            .select('is_active, start_date')
            .eq('id', tournamentId)
            .single()

        if (tourneyError || !tournament) {
            return { error: 'Tournament not found.' }
        }

        if (!tournament.is_active) {
            return { error: 'This tournament is not currently active.' }
        }

        // Optional: Check if already started? 
        // Usually joining after start date is allowed in some modes, but strictly for winning usually not.
        // Given requirements, we just check is_active.

        // 3. Join
        const { error: joinError } = await supabase
            .from('survival_participants')
            .insert({
                user_id: user.id,
                tournament_id: tournamentId,
                status: 'active'
            })

        if (joinError) {
            if (joinError.code === '23505') { // Unique violation
                return { error: 'You have already joined this tournament.' }
            }
            throw joinError
        }

        revalidatePath('/') // Revalidate homepage or wherever the button is
        return { success: true }

    } catch (error) {
        console.error('Error joining tournament:', error)
        return { error: 'Failed to join tournament. Please try again.' }
    }
}
