import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  // 1. Standard Client: Checks if YOU are logged in and authorized
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const adminEmail = process.env.ADMIN_EMAIL
  const userEmail = user?.email
  const isAuthorized = user && adminEmail && userEmail?.toLowerCase() === adminEmail?.toLowerCase()

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black text-white p-8 font-mono flex items-center justify-center">
        <div className="text-center space-y-4">
           <h1 className="text-red-500 text-4xl font-black italic uppercase">Access Denied</h1>
           <p className="text-slate-500">Authenticated as: {userEmail || 'Guest'}</p>
        </div>
      </div>
    )
  }

  // 2. Service Role Client: Bypasses RLS to see all 300+ players
  // Ensure SUPABASE_SERVICE_ROLE_KEY is in your Vercel/Local env variables
  const adminDb = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: players, error } = await adminDb
    .from('players')
    .select('*')
    .order('name', { ascending: true })
    .limit(5000) // High limit to ensure we get every row

  if (error) {
    console.error("Admin Fetch Error:", error)
  }

  return <AdminDashboard initialPlayers={players || []} />
}