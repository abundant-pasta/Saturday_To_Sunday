import { createClient } from '@/utils/supabase/server'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  const supabase = await createClient()

  // --- SECURITY GATE ---
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

  // --- FETCH DATA ---
  // Added .limit(5000) to ensure we get past the letter "J"
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('name', { ascending: true })
    .limit(5000) 

  return <AdminDashboard initialPlayers={players || []} />
}