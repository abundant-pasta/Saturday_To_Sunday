'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Helper to generate a random 6-character code
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

export type SquadDetails = {
    id: string
    name: string
    invite_code: string
    owner_id: string
    created_at: string
    member_count: number
    role: string
}

export async function createSquad(name: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    // 1. Generate Code & Create Squad
    let inviteCode = generateInviteCode()
    // Simple retry mechanism for collision (could be improved)
    let attempts = 0
    while (attempts < 3) {
        const { data: existing } = await supabase.from('squads').select('id').eq('invite_code', inviteCode).single()
        if (!existing) break
        inviteCode = generateInviteCode()
        attempts++
    }

    const { data: squad, error: squadError } = await supabase
        .from('squads')
        .insert({
            name,
            invite_code: inviteCode,
            owner_id: user.id
        })
        .select()
        .single()

    if (squadError) {
        console.error('Error creating squad:', squadError)
        throw new Error('Failed to create squad')
    }

    // 2. Add Creator as Owner
    const { error: memberError } = await supabase
        .from('squad_members')
        .insert({
            squad_id: squad.id,
            user_id: user.id,
            role: 'owner'
        })

    if (memberError) {
        // Rollback? ideally yes, but for now just error
        console.error('Error adding owner to squad:', memberError)
        throw new Error('Failed to join created squad')
    }

    revalidatePath('/squads')
    return squad
}

export async function joinSquad(code: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    const cleanCode = code.trim().toUpperCase()

    // 1. Find Squad
    const { data: squad, error: squadError } = await supabase
        .from('squads')
        .select('id')
        .eq('invite_code', cleanCode)
        .single()

    if (squadError || !squad) {
        throw new Error('Invalid invite code')
    }

    // 2. Check if already member
    const { data: membership } = await supabase
        .from('squad_members')
        .select('id')
        .eq('squad_id', squad.id)
        .eq('user_id', user.id)
        .single()

    if (membership) {
        return { success: true, message: 'Already a member' }
    }

    // 3. Insert Member
    const { error: joinError } = await supabase
        .from('squad_members')
        .insert({
            squad_id: squad.id,
            user_id: user.id,
            role: 'member'
        })

    if (joinError) {
        console.error('Error joining squad:', joinError)
        throw new Error('Failed to join squad')
    }

    revalidatePath('/squads')
    return { success: true }
}

export async function getMySquads() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('squad_members')
        .select(`
            squad:squads (
                id,
                name,
                invite_code,
                owner_id,
                created_at,
                members:squad_members(count)
            ),
            role
        `)
        .eq('user_id', user.id)

    if (error) {
        console.error('Error fetching squads:', error)
        return []
    }

    // Format data
    return data.map((item: any) => ({
        ...item.squad,
        member_count: item.squad.members[0].count,
        role: item.role
    }))
}

export async function leaveSquad(squadId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Check if owner
    const { data: membership } = await supabase
        .from('squad_members')
        .select('role')
        .eq('squad_id', squadId)
        .eq('user_id', user.id)
        .single()

    if (membership?.role === 'owner') {
        // For V1, owners cannot leave existing squads unless they delete them (which we haven't implemented)
        // Or we could auto-promote oldest member.
        // Let's just block it for now.
        throw new Error('Owners cannot leave their squad. Delete the squad instead.')
    }

    const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('user_id', user.id)

    if (error) {
        throw new Error('Failed to leave squad')
    }

    revalidatePath('/squads')
}

// NOTE: getSquadLeaderboard is best handled inside the existing Leaderboard component
// by passing a list of user_ids or handling the join there. 
// However, we can create a helper to get the member IDs.
export async function getSquadMemberIds(squadId: string) {
    const supabase = await createClient()

    const { data } = await supabase
        .from('squad_members')
        .select('user_id')
        .eq('squad_id', squadId)

    return data?.map(r => r.user_id) || []
}
