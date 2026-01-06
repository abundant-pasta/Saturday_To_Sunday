'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Home, Trophy } from 'lucide-react'
import Leaderboard from '@/components/Leaderboard'
import { Button } from '@/components/ui/button'

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
    <div className="min-h-[100dvh] bg-neutral-950 text-white flex flex-col items-center p-4 pt-12 font-sans relative">
       
       {/* --- TOP LEFT HOME BUTTON --- */}
       <div className="absolute top-4 left-4 z-20">
            <Link href="/">
                <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-full">
                    <Home className="w-6 h-6" />
                </Button>
            </Link>
        </div>

       <div className="text-center space-y-2 mb-8">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]" />
            <h1 className="text-3xl font-black italic uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(0,255,128,0.3)]">
              Daily <span className="text-[#00ff80]">Leaderboard</span>
            </h1>
            <p className="text-neutral-400 text-sm font-mono uppercase tracking-widest font-bold">See who is leading the pack today.</p>
        </div>

        <div className="w-full max-w-md">
            <Leaderboard currentUserId={userId} />
        </div>
    </div>
  )
}