import { createClient } from '@/utils/supabase/server'
// import { redirect } from 'next/navigation' <--- Disabled for Debugging
import AdminCard from '@/components/AdminCard'

export default async function AdminPage() {
  const supabase = await createClient()

  // --- SECURITY GATE (Debug Mode) ---
  const { data: { user } } = await supabase.auth.getUser()
  
  const adminEmail = process.env.ADMIN_EMAIL
  const userEmail = user?.email
  const isAuthorized = user && userEmail === adminEmail

  // If check fails, SHOW DATA instead of redirecting
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black text-white p-8 font-mono">
        <h1 className="text-red-500 text-2xl font-bold mb-6">🚫 ACCESS DENIED (DEBUG MODE)</h1>
        
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-lg space-y-6 max-w-2xl">
          
          {/* Check 1: Are you logged in? */}
          <div>
            <span className="text-slate-500 block text-xs uppercase tracking-widest mb-1">1. Server Auth Status</span>
            <div className={`text-lg font-bold flex items-center gap-2 ${user ? 'text-green-400' : 'text-red-400'}`}>
              {user ? (
                <>✅ User Session Found</>
              ) : (
                <>❌ User is NULL (Server sees no cookie)</>
              )}
            </div>
          </div>

          {/* Check 2: What email does the server see? */}
          <div>
            <span className="text-slate-500 block text-xs uppercase tracking-widest mb-1">2. Your Email (From Session)</span>
            <code className="bg-slate-950 px-3 py-2 rounded border border-slate-800 text-yellow-300 block">
              {userEmail ? `"${userEmail}"` : 'null'}
            </code>
          </div>

          {/* Check 3: What env var is loaded? */}
          <div>
            <span className="text-slate-500 block text-xs uppercase tracking-widest mb-1">3. Required Admin Email (Env Var)</span>
            <code className="bg-slate-950 px-3 py-2 rounded border border-slate-800 text-blue-300 block">
              {adminEmail ? `"${adminEmail}"` : 'UNDEFINED ⚠️'}
            </code>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <span className="text-slate-500 block text-xs uppercase tracking-widest mb-1">Diagnosis</span>
            <p className="text-white mt-1">
              {!user 
                ? "The server cannot see your session cookie. Try logging out and back in." 
                : !adminEmail 
                  ? "Vercel (or local .env) does not have the ADMIN_EMAIL variable set."
                  : userEmail !== adminEmail 
                    ? "The emails do not match exactly. Check for spaces or capitalization." 
                    : "Unknown error."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --- FETCH DATA (Only runs if you passed the gate) ---
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .gt('rating', 0)
    .order('name', { ascending: true })

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-yellow-400">Player Database Audit</h1>
          <div className="text-slate-400">
            Scanning <strong>{players?.length}</strong> active players
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {players?.map((player) => (
            <AdminCard key={player.id} player={player} />
          ))}
        </div>
      </div>
    </div>
  )
}