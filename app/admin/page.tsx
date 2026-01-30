import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js' // <--- IMPORT THIS
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  // 1. REGULAR CLIENT (For Security Check)
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const userEmail = user?.email
  const isAuthorized = user && adminEmail && userEmail?.toLowerCase() === adminEmail?.toLowerCase()

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black text-white p-8 font-mono">
        <h1 className="text-red-500 text-2xl font-bold mb-6">🚫 ACCESS DENIED</h1>
        <p>Please check your ADMIN_EMAIL environment variable.</p>
      </div>
    )
  }

  // 2. ADMIN CLIENT (For Data Fetching - Bypasses RLS)
  // This uses the Service Role Key to see EVERYTHING in the DB
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: players } = await adminDb
    .from('players')
    .select('*')
    .order('name', { ascending: true })
    .limit(5000)

  return <AdminDashboard initialPlayers={players || []} />
}