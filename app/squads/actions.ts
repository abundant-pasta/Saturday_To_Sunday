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

// --- INVITE SYSTEM ---

export async function searchUsers(query: string) {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) return []

    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .not('id', 'eq', currentUser.id)
        .limit(5)

    if (error) {
        console.error('Error searching users:', error)
        return []
    }

    return data
}

export async function sendInvite(squadId: string, inviteeId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('squad_invites')
        .insert({
            squad_id: squadId,
            inviter_id: user.id,
            invitee_id: inviteeId,
            status: 'pending'
        })

    if (error) {
        if (error.code === '23505') throw new Error('Invite already sent')
        console.error('Error sending invite:', error)
        throw new Error('Failed to send invite')
    }
}

export async function getPendingInviteCount() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return 0

    const { count, error } = await supabase
        .from('squad_invites')
        .select('*', { count: 'exact', head: true })
        .eq('invitee_id', user.id)
        .eq('status', 'pending')

    if (error) {
        console.error('Error fetching invite count:', error)
        return 0
    }

    return count || 0
}

export async function getPendingInvites() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // Try a simpler selection first. 
    // If the Join to profiles is failing due to FK naming, this might be why it's returning []
    const { data, error } = await supabase
        .from('squad_invites')
        .select(`
            id,
            squad:squads (
                id,
                name
            ),
            inviter_id
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')

    if (error) {
        console.error('Error fetching invites:', error)
        return []
    }

    if (!data || data.length === 0) return []

    // Manually fetch inviter profiles to avoid join issues
    const inviterIds = data.map(i => i.inviter_id)
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .in('id', inviterIds)

    return data.map(invite => ({
        ...invite,
        inviter: profiles?.find(p => p.id === invite.inviter_id) || { username: 'Someone' }
    }))
}

export async function respondToInvite(inviteId: string, action: 'accept' | 'decline') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    if (action === 'decline') {
        await supabase.from('squad_invites').delete().eq('id', inviteId)
    } else {
        // Fetch invite details
        const { data: invite } = await supabase
            .from('squad_invites')
            .select('squad_id')
            .eq('id', inviteId)
            .single()

        if (invite) {
            // Add to members
            const { error: joinError } = await supabase
                .from('squad_members')
                .insert({
                    squad_id: invite.squad_id,
                    user_id: user.id,
                    role: 'member'
                })

            if (joinError && joinError.code !== '23505') {
                throw new Error('Failed to join squad')
            }

            // Delete invite
            await supabase.from('squad_invites').delete().eq('id', inviteId)
        }
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

export async function renameSquad(squadId: string, newName: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Verify ownership
    const { data: squad } = await supabase
        .from('squads')
        .select('owner_id')
        .eq('id', squadId)
        .single()

    if (squad?.owner_id !== user.id) {
        throw new Error('Only the owner can rename the squad')
    }

    const { error } = await supabase
        .from('squads')
        .update({ name: newName })
        .eq('id', squadId)

    if (error) {
        console.error('Error renaming squad:', error)
        throw new Error('Failed to rename squad')
    }

    revalidatePath('/squads')
}

export async function deleteSquad(squadId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Not authenticated')

    // Verify ownership
    const { data: squad } = await supabase
        .from('squads')
        .select('owner_id')
        .eq('id', squadId)
        .single()

    if (squad?.owner_id !== user.id) {
        throw new Error('Only the owner can delete the squad')
    }

    const { error } = await supabase
        .from('squads')
        .delete()
        .eq('id', squadId)

    if (error) {
        console.error('Error deleting squad:', error)
        throw new Error('Failed to delete squad')
    }

    revalidatePath('/squads')
    redirect('/squads')
}

