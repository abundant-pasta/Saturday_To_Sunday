'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Home, User as UserIcon, Loader2 } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { useUI } from '@/context/UIContext'
import { Button } from '@/components/ui/button'

export default function GlobalHeader() {
    const { isHeaderHidden } = useUI()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setUser(session?.user ?? null)
            setLoading(false)
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })
        return () => subscription.unsubscribe()
    }, [supabase.auth])

    if (isHeaderHidden) return null

    return (
        <header className="fixed top-0 left-0 right-0 z-[100] h-16 flex items-center justify-between px-4 pointer-events-none">
            <div className="flex items-center pointer-events-auto">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-neutral-800/50 rounded-full w-10 h-10 backdrop-blur-sm bg-black/10 transition-all border border-white/5">
                        <Home className="w-5 h-5" />
                    </Button>
                </Link>
            </div>

            <div className="flex items-center pointer-events-auto">
                {loading ? (
                    <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-neutral-600 animate-spin" />
                    </div>
                ) : user ? (
                    <Link href="/profile">
                        <button className="w-10 h-10 rounded-full overflow-hidden border border-neutral-800 hover:border-[#00ff80] transition-all relative block shadow-lg bg-black/50 backdrop-blur-sm">
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
                    <Button
                        onClick={() => supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: { redirectTo: `${window.location.origin}/auth/callback` }
                        })}
                        variant="ghost"
                        size="icon"
                        className="text-neutral-400 hover:text-[#00ff80] hover:bg-neutral-800/50 rounded-full w-10 h-10 backdrop-blur-sm bg-black/10 transition-all border border-white/5"
                    >
                        <UserIcon className="w-5 h-5" />
                    </Button>
                )}
            </div>
        </header>
    )
}
