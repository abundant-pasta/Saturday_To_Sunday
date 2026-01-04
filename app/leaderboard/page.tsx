'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Home, Trophy } from 'lucide-react'
import Leaderboard from '@/components/Leaderboard'

export default function LeaderboardPage() {
  const [userId, setUserId] = useState<string | undefined>()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user?.id)
    }
    getUser()
  }, [])

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center p-4 pt-12">
       <div className="text-center space-y-2 mb-8">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Daily Leaderboard</h1>
            <p className="text-slate-400 text-sm">See who is leading the pack today.</p>
        </div>

        <div className="w-full max-w-md">
            <Leaderboard currentUserId={userId} />
        </div>

        <Link href="/" className="mt-8 text-slate-500 hover:text-white flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
            <Home className="w-4 h-4" /> Back to Home
        </Link>
    </div>
  )
}