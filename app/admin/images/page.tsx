import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ImageAuditClient from '@/components/ImageAuditClient'

export default async function AdminImagesPage() {
    // 1. STANDARD CLIENT: Used ONLY to check if YOU are logged in
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const adminEmail = process.env.ADMIN_EMAIL
    const userEmail = user?.email
    // Case-insensitive check
    const isAuthorized = user && adminEmail && userEmail?.toLowerCase() === adminEmail?.toLowerCase()

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-black text-white p-8 font-mono flex flex-col items-center justify-center">
                <h1 className="text-red-500 text-4xl font-black italic uppercase mb-4">Access Denied</h1>
                <p className="text-slate-500">Authenticated as: {userEmail || 'Guest'}</p>
                <p className="text-slate-700 text-sm mt-2">Required: {adminEmail || 'Not Set'}</p>
            </div>
        )
    }

    // 2. SERVICE ROLE CLIENT: fetch players
    const adminDb = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch ALL players without restrictions

    let allPlayers: any[] = []
    let page = 0
    const pageSize = 1000

    while (true) {
        const { data: players, error } = await adminDb
            .from('players')
            .select('*')
            .order('name', { ascending: true })
            .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
            return (
                <div className="min-h-screen bg-black text-white p-8">
                    <h2 className="text-red-500 font-bold">Database Error</h2>
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                </div>
            )
        }

        if (!players || players.length === 0) break

        allPlayers = [...allPlayers, ...players]

        if (players.length < pageSize) break
        page++
    }

    console.log('Total players fetched:', allPlayers.length)



    return <ImageAuditClient initialPlayers={allPlayers} />
}
