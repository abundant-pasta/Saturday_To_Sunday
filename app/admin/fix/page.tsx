import { getUpcomingPlayers } from '@/app/actions'
import AdminFixClient from '@/components/AdminFixClient'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminFixPage() {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    const adminEmail = process.env.ADMIN_EMAIL

    const isAuthorized = user && adminEmail && user.email?.toLowerCase() === adminEmail?.toLowerCase()

    if (!isAuthorized) {
        // If not authorized, redirect to home or show 401
        // For now, let's redirect to home to keep it "secret"
        redirect('/')
    }

    // 2. Fetch Data
    const initialPlayers = await getUpcomingPlayers()

    return (
        <div className="min-h-screen bg-neutral-950 pt-16">
            <AdminFixClient initialPlayers={initialPlayers} />
        </div>
    )
}
