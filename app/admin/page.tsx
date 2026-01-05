import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation' // <--- 1. Import Redirect
import AdminCard from '@/components/AdminCard'

export default async function AdminPage() {
  const supabase = await createClient()

  // --- 2. SECURITY GATE (The Bouncer) ---
  const { data: { user } } = await supabase.auth.getUser()

  // Check if user exists AND matches your generic ADMIN_EMAIL variable
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/') // Kick them out immediately
  }

  // --- 3. FETCH DATA (Only runs if you passed the gate) ---
  // Fetch ALL active players
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