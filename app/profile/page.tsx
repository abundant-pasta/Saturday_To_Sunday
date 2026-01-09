'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { ChevronLeft, LogOut, Mail, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PushNotificationManager from '@/components/PushNotificationManager'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/') // Redirect if not logged in
        return
      }
      setUser(session.user)
      setLoading(false)
    }
    getUser()
  }, [router, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return null

  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-white font-sans p-4">
      
      {/* HEADER */}
      <div className="max-w-md mx-auto flex items-center mb-8 pt-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-neutral-800">
            <ChevronLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-black uppercase tracking-widest ml-4">My Profile</h1>
      </div>

      <div className="max-w-md mx-auto flex flex-col gap-6">
        
        {/* USER CARD */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col items-center text-center gap-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-neutral-800 relative">
            {user?.user_metadata?.avatar_url ? (
              <Image src={user.user_metadata.avatar_url} alt="Profile" fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                <UserIcon className="w-10 h-10 text-neutral-600" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{user?.user_metadata?.full_name || 'Player'}</h2>
            <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm font-medium mt-1">
              <Mail className="w-3 h-3" />
              {user?.email}
            </div>
          </div>
        </div>

        {/* SETTINGS SECTION */}
        <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 pl-2">Settings</h3>
            
            {/* NOTIFICATION MANAGER */}
            {/* We do NOT pass hideOnSubscribed here, so it remains visible for toggling off */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <PushNotificationManager />
            </div>
        </div>

        {/* DANGER ZONE */}
        <div className="pt-8">
            <Button 
                onClick={handleSignOut}
                variant="outline" 
                className="w-full border-red-900/30 text-red-500 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/50"
            >
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
        </div>

      </div>
    </div>
  )
}