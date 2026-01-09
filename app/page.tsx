'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trophy, Calendar, User as UserIcon, LogOut } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import InstallPWA from '@/components/InstallPWA'
import { createBrowserClient } from '@supabase/ssr'

export default function Home() {
  const router = useRouter()
  
  // Auth State
  const [user, setUser] = useState<any>(null)
  const [showSignOut, setShowSignOut] = useState(false)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 1. Check Session on Mount
  useEffect(() => {
    const getUser = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 2. Auth Handlers
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`
        }
    })
  }

  const handleSignOut = async () => {
      await supabase.auth.signOut()
      setShowSignOut(false)
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center p-4 font-sans overflow-hidden relative">
      
      {/* --- TOP RIGHT PROFILE ICON --- */}
      <div className="absolute top-4 right-4 z-50">
        {user ? (
            // LOGGED IN: Go to Profile
            <Link href="/profile">
                <button 
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-neutral-800 hover:border-[#00ff80] transition-colors relative block"
                >
                    {user.user_metadata?.avatar_url ? (
                        <Image src={user.user_metadata.avatar_url} alt="User" fill className="object-cover" />
                    ) : (
                        <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                             <UserIcon className="w-5 h-5 text-neutral-400" />
                        </div>
                    )}
                </button>
            </Link>
        ) : (
            // LOGGED OUT: Google Login
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleGoogleLogin}
                className="text-neutral-500 hover:text-[#00ff80] hover:bg-neutral-800 rounded-full w-10 h-10"
            >
                <UserIcon className="w-6 h-6" />
            </Button>
        )}
      </div>

      <div className="w-full max-w-md flex flex-col gap-8">
        
        {/* LOGO AREA */}
        <div className="text-center space-y-4 py-4">
          <div className="flex justify-center">
            <Trophy className="w-16 h-16 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-tight">
              Saturday To Sunday
            </h1>
            <p className="text-neutral-400 font-bold text-sm tracking-wide mt-2">Guess the college. Beat your friends.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
            
            {/* 1. DAILY CHALLENGE CARD */}
            <Link href="/daily" className="block group">
                <div className="bg-gradient-to-r from-neutral-900 to-emerald-950 border border-emerald-500/30 group-hover:border-[#00ff80] p-1 rounded-xl hover:scale-[1.02] transition-all cursor-pointer shadow-2xl">
                    <div className="bg-neutral-900/80 rounded-lg p-6 flex flex-col items-center justify-center gap-4 text-center h-48">
                        <div className="p-4 bg-emerald-500/10 rounded-full">
                           <Calendar className="w-10 h-10 text-[#00ff80]" />
                        </div>
                        <div>
                            <div className="text-[#00ff80] font-black uppercase text-sm tracking-widest mb-1">Play Now</div>
                            <div className="text-white font-black text-3xl uppercase italic tracking-tighter">Daily Challenge</div>
                        </div>
                    </div>
                </div>
            </Link>

            {/* LEADERBOARD BUTTON */}
            <Link href="/leaderboard" className="w-full">
              <Button 
                variant="outline" 
                className="w-full h-16 text-lg font-black tracking-widest uppercase border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all hover:border-neutral-600"
              >
                <Trophy className="mr-3 w-5 h-5 text-yellow-500" /> View Leaderboard
              </Button>
            </Link>
            
             {/* INSTALL PWA BUTTON */}
            <InstallPWA />

            {/* --- FOOTER: ABOUT / LEGAL --- */}
            <div className="pt-12 pb-4 flex flex-col items-center gap-3 border-t border-neutral-900 mt-8">
                <div className="flex flex-wrap justify-center gap-4 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                    <span className="text-neutral-800">•</span>
                    <Link href="/termsofservice" className="hover:text-white transition-colors">Terms</Link>
                    <span className="text-neutral-800">•</span>
                    <a href="mailto:support@playsaturdaytosunday.com" className="hover:text-white transition-colors">Support</a>
                </div>
                <p className="text-neutral-800 text-[10px] font-black uppercase tracking-widest">v1.0.0</p>
            </div>

        </div>
      </div>
    </div>
  )
}