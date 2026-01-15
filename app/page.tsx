'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trophy, Calendar, User as UserIcon, Loader2, Share2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import InstallPWA from '@/components/InstallPWA' 
import PushNotificationManager from '@/components/PushNotificationManager'
import { createBrowserClient } from '@supabase/ssr'

// Wrapper for Suspense (Best Practice)
export default function HomePage() {
    return (
        <Suspense fallback={<div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center"><Loader2 className="animate-spin text-neutral-600" /></div>}>
            <HomeContent />
        </Suspense>
    )
}

function HomeContent() {
  const router = useRouter()
  
  // Auth State
  const [user, setUser] = useState<any>(null)
  
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

  // 3. Share Handler 
  const handleShareApp = async () => {
    const text = `🏈 Saturday to Sunday\n\nGuess the college for 10 NFL players.\n\nPlay today's grid: 👇\nhttps://www.playsaturdaytosunday.com`
    
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        alert('Link copied to clipboard!')
      }
    } catch (err) {
      console.error("Error sharing:", err)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center p-4 font-sans overflow-hidden relative">
      
      {/* --- TOP RIGHT PROFILE ICON --- */}
      <div className="absolute top-4 right-4 z-50">
        {user ? (
            // LOGGED IN: Go to Profile
            <Link href="/profile">
                <button 
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-neutral-800 hover:border-[#00ff80] transition-colors relative block shadow-lg"
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
                className="text-neutral-500 hover:text-[#00ff80] hover:bg-neutral-800 rounded-full w-10 h-10 transition-all"
            >
                <UserIcon className="w-6 h-6" />
            </Button>
        )}
      </div>

      <div className="w-full max-w-md flex flex-col gap-8">
        
        {/* LOGO AREA */}
        <div className="text-center space-y-4 py-4">
          <div className="flex justify-center">
            <Trophy className="w-16 h-16 text-yellow-400 animate-in zoom-in duration-700" />
          </div>
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white leading-tight drop-shadow-2xl">
              Saturday To Sunday
            </h1>
            <p className="text-neutral-400 font-bold text-sm tracking-wide mt-2 uppercase">Guess the college. Beat your friends.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
            
            {/* 1. DAILY CHALLENGE CARD */}
            <Link href="/daily" className="block group">
                <div className="bg-gradient-to-r from-neutral-900 to-emerald-950 border border-emerald-500/30 group-hover:border-[#00ff80] p-1 rounded-xl hover:scale-[1.02] transition-all cursor-pointer shadow-2xl">
                    <div className="bg-neutral-900/80 rounded-lg p-6 flex flex-col items-center justify-center gap-4 text-center h-48 backdrop-blur-sm">
                        <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                           <Calendar className="w-10 h-10 text-[#00ff80]" />
                        </div>
                        <div>
                            <div className="text-[#00ff80] font-black uppercase text-xs tracking-[0.2em] mb-1">Play Now</div>
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

            {/* --- NOTIFICATION BUTTON --- */}
            <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors empty:hidden">
              <PushNotificationManager hideOnSubscribed={true} />
            </div>

            {/* INSTALL PWA BUTTON */}
            <InstallPWA />

            {/* --- NEW SHARE BUTTON --- */}
            <Button 
                onClick={handleShareApp}
                variant="outline" 
                className="w-full h-14 text-sm font-bold tracking-widest uppercase border-neutral-800 bg-neutral-900/30 text-neutral-500 hover:bg-neutral-800 hover:text-white transition-all hover:border-neutral-700"
            >
                <Share2 className="mr-2 w-4 h-4" /> Share with Friends
            </Button>

            {/* --- FOOTER: ABOUT / LEGAL --- */}
            <div className="pt-8 pb-4 flex flex-col items-center gap-3 border-t border-neutral-900 mt-4">
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