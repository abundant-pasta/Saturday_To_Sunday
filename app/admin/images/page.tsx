import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ImageAuditClient from '@/components/ImageAuditClient'
import AuthButton from '@/components/AuthButton'

type AdminImagePlayer = {
    id: string
    name: string
    college: string
    image_url: string | null
    sport: string
    is_image_verified?: boolean
    image_status?: 'unreviewed' | 'approved' | 'spoiler' | 'wrong_person' | 'missing'
    image_context?: 'unknown' | 'pro' | 'college' | 'headshot'
    image_notes?: string | null
}

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
                <div className="mt-6">
                    <AuthButton redirectPath="/admin/images" />
                </div>
            </div>
        )
    }

    // 2. SERVICE ROLE CLIENT: fetch players
    const adminDb = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: reports, error: reportsError } = await adminDb
        .from('image_audit_reports')
        .select('*')
        .in('status', ['open', 'reviewing'])
        .order('created_at', { ascending: false })
        .limit(250)

    if (reportsError) {
        console.error('Image audit reports error:', reportsError)
    }

    // Fetch ALL players without restrictions

    let allPlayers: AdminImagePlayer[] = []
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

        allPlayers = [...allPlayers, ...(players as AdminImagePlayer[])]

        if (players.length < pageSize) break
        page++
    }

    console.log('Total players fetched:', allPlayers.length)



    return <ImageAuditClient initialPlayers={allPlayers} initialReports={reports || []} />
}
