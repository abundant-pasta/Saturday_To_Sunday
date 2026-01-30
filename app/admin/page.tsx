import { createClient } from '@/utils/supabase/server'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  const supabase = await createClient()

  // --- SECURITY GATE (Your Debug Logic) ---
  const { data: { user } } = await supabase.auth.getUser()
  
  const adminEmail = process.env.ADMIN_EMAIL
  const userEmail = user?.email
  // Check if emails match (case-insensitive)
  const isAuthorized = user && adminEmail && userEmail?.toLowerCase() === adminEmail?.toLowerCase()

  // If check fails, SHOW DEBUG DATA
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black text-white p-8 font-mono">
        <h1 className="text-red-500 text-2xl font-bold mb-6">🚫 ACCESS DENIED (DEBUG MODE)</h1>
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg space-y-6 max-w-2xl">
          <div>
            <span className="text-slate-500 block text-xs uppercase tracking-widest mb-1">1. Server Auth Status</span>
            <div className={`text-lg font-bold flex items-center gap-2 ${user ? 'text-green-400' : 'text-red-400'}`}>
              {user ? <>✅ User Session Found</> : <>❌ User is NULL (Server sees no cookie)</>}
            </div>
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase tracking-widest mb-1">2. Your Email</span>
            <code className="bg-slate-950 px-3 py-2 rounded border border-slate-800 text-yellow-300 block">
              {userEmail ? `"${userEmail}"` : 'null'}
            </code>
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase tracking-widest mb-1">3. Required Admin Email</span>
            <code className="bg-slate-950 px-3 py-2 rounded border border-slate-800 text-blue-300 block">
              {adminEmail ? `"${adminEmail}"` : 'UNDEFINED ⚠️'}
            </code>
          </div>
        </div>
      </div>
    )
  }

  // --- FETCH DATA ---
  // We fetch ALL players here and let the client component handle the filtering
  // This is faster for admin dashboards than making new DB requests for every filter change.
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('name', { ascending: true })

  return <AdminDashboard initialPlayers={players || []} />
}