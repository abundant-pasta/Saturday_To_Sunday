'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@supabase/ssr'
import { ChevronLeft, LogOut, Mail, User as UserIcon, Pencil, Check, Loader2, X, Trophy, Flame, Zap, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PushNotificationManager from '@/components/PushNotificationManager'
import EarnFreezeButton from '@/components/EarnFreezeButton'
import { RewardedAdProvider } from '@/components/RewardedAdProvider'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // --- STATS STATE ---
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    bestScore: 0,
    footballStreak: 0,
    basketballStreak: 0
  })

  // --- EDITING STATE ---
  const [username, setUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [showAvatar, setShowAvatar] = useState(true)
  const [saving, setSaving] = useState(false)

  // Freeze status state
  const [freezeStatus, setFreezeStatus] = useState<any>({
    football: { hasFreeze: false, canEarnFreeze: false, hoursUntilReset: 0 },
    basketball: { hasFreeze: false, canEarnFreeze: false, hoursUntilReset: 0 }
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const getUserAndProfile = async () => {
      // 1. Get Auth User
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }
      setUser(session.user)

      // 2. Get Public Profile Data
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, show_avatar, streak_football, streak_basketball')
        .eq('id', session.user.id)
        .single()

      // 3. Get Game Stats (Aggregate from daily_results)
      const { data: results, count } = await supabase
        .from('daily_results')
        .select('score', { count: 'exact' })
        .eq('user_id', session.user.id)

      // Calculate Stats
      const gamesPlayed = count || 0
      const bestScore = results ? Math.max(...results.map(r => r.score), 0) : 0

      // Update State
      if (profile) {
        setUsername(profile.username || session.user.email?.split('@')[0] || 'Player')
        setNewUsername(profile.username || session.user.email?.split('@')[0] || 'Player')
        if (profile.show_avatar !== null) setShowAvatar(profile.show_avatar)

        setStats({
          gamesPlayed,
          bestScore,
          footballStreak: profile.streak_football || 0,
          basketballStreak: profile.streak_basketball || 0
        })
      }

      setLoading(false)
    }
    getUserAndProfile()
  }, [router, supabase])

  // Fetch freeze status
  useEffect(() => {
    const fetchFreezeStatus = async () => {
      if (!user) return

      const fetchSportStatus = async (sport: 'football' | 'basketball') => {
        const response = await fetch('/api/check-streak-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, sport })
        })
        return response.json()
      }

      const [footballStatus, basketballStatus] = await Promise.all([
        fetchSportStatus('football'),
        fetchSportStatus('basketball')
      ])

      setFreezeStatus({
        football: footballStatus,
        basketball: basketballStatus
      })
    }

    fetchFreezeStatus()
  }, [user])

  // --- HANDLER: Save Name ---
  const handleUpdateName = async () => {
    if (!user || !newUsername.trim()) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ username: newUsername.trim() })
      .eq('id', user.id)

    if (!error) {
      setUsername(newUsername.trim())
      setIsEditingName(false)
    }
    setSaving(false)
  }

  // --- HANDLER: Toggle Avatar ---
  const toggleAvatar = async () => {
    if (!user) return
    const newValue = !showAvatar
    setShowAvatar(newValue)
    await supabase.from('profiles').update({ show_avatar: newValue }).eq('id', user.id)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-[100dvh] bg-neutral-950 flex items-center justify-center text-white">
      <Loader2 className="animate-spin text-neutral-600" />
    </div>
  )

  return (
    <RewardedAdProvider>
      <div className="min-h-[100dvh] bg-neutral-950 text-white font-sans p-4 pb-12">

        {/* HEADER */}
        <div className="max-w-md mx-auto flex items-center mb-6 pt-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-neutral-800">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-black uppercase tracking-widest ml-4">My Career</h1>
        </div>

        <div className="max-w-md mx-auto flex flex-col gap-6">

          {/* USER CARD */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col items-center text-center gap-4 shadow-xl">
            <div className={`w-24 h-24 rounded-full overflow-hidden border-4 relative transition-all duration-300 ${showAvatar ? 'border-neutral-800' : 'border-neutral-800 opacity-50 grayscale'}`}>
              {user?.user_metadata?.avatar_url ? (
                <Image src={user.user_metadata.avatar_url} alt="Profile" fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <UserIcon className="w-10 h-10 text-neutral-600" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-2xl font-bold text-white">{username}</h2>
              <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm font-medium">
                <Mail className="w-3 h-3" />
                {user?.email}
              </div>
            </div>
          </div>

          {/* --- STATS GRID --- */}
          <div className="grid grid-cols-2 gap-3">
            {/* BEST SCORE */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center gap-1 hover:border-[#00ff80]/30 transition-colors">
              <div className="flex items-center gap-2 text-yellow-500 mb-1">
                <Trophy className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Best Score</span>
              </div>
              <span className="text-3xl font-black text-white font-mono">{stats.bestScore.toLocaleString()}</span>
            </div>

            {/* GAMES PLAYED */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center gap-1 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Hash className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Games</span>
              </div>
              <span className="text-3xl font-black text-white font-mono">{stats.gamesPlayed}</span>
            </div>

            {/* FOOTBALL STREAK */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center gap-1 hover:border-[#00ff80]/30 transition-colors">
              <div className="flex items-center gap-2 text-[#00ff80] mb-1">
                <Flame className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">🏈 Streak</span>
              </div>
              <span className="text-3xl font-black text-white font-mono">{stats.footballStreak}</span>
            </div>

            {/* BASKETBALL STREAK */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center gap-1 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Flame className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">🏀 Streak</span>
              </div>
              <span className="text-3xl font-black text-white font-mono">{stats.basketballStreak}</span>
            </div>
          </div>

          {/* STREAK FREEZES SECTION */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 px-1">Streak Protection</h3>

            <EarnFreezeButton
              sport="football"
              userId={user?.id || ''}
              hasFreeze={freezeStatus.football.hasFreeze}
              canEarnFreeze={freezeStatus.football.canEarnFreeze}
              hoursUntilReset={freezeStatus.football.hoursUntilReset}
              onFreezeEarned={() => {
                setFreezeStatus(prev => ({
                  ...prev,
                  football: { ...prev.football, hasFreeze: true, canEarnFreeze: false }
                }))
              }}
            />

            <EarnFreezeButton
              sport="basketball"
              userId={user?.id || ''}
              hasFreeze={freezeStatus.basketball.hasFreeze}
              canEarnFreeze={freezeStatus.basketball.canEarnFreeze}
              hoursUntilReset={freezeStatus.basketball.hoursUntilReset}
              onFreezeEarned={() => {
                setFreezeStatus(prev => ({
                  ...prev,
                  basketball: { ...prev.basketball, hasFreeze: true, canEarnFreeze: false }
                }))
              }}
            />
          </div>

          {/* TROPHY ROOM LINK */}
          <Link href="/trophy-room" className="block">
            <div className="bg-gradient-to-r from-amber-950/50 to-neutral-900 border border-amber-900/30 rounded-xl p-4 flex items-center justify-between hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/10 p-3 rounded-lg">
                  <Trophy className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-amber-400">Trophy Room</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wide">View your achievements</div>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-amber-500 rotate-180" />
            </div>
          </Link>

          {/* SETTINGS SECTION */}
          <div className="space-y-3 mt-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500 pl-2">Account Settings</h3>

            {/* DISPLAY NAME */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden px-4 py-3 flex items-center justify-between min-h-[72px]">
              {!isEditingName ? (
                <>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-neutral-200">Display Name</span>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Visible on leaderboard</span>
                  </div>
                  <Button onClick={() => setIsEditingName(true)} variant="ghost" size="sm" className="text-neutral-400 hover:text-[#00ff80] hover:bg-neutral-800 gap-2 h-8">
                    <span className="text-xs font-bold">{username}</span>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 w-full animate-in fade-in duration-200">
                  <input
                    type="text"
                    className="bg-neutral-950 border border-neutral-700 text-white px-3 py-1.5 rounded-lg w-full text-sm focus:outline-none focus:ring-1 focus:ring-[#00ff80] font-bold"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    autoFocus
                    placeholder="Enter username"
                  />
                  <div className="flex items-center gap-1">
                    <Button onClick={() => { setIsEditingName(false); setNewUsername(username); }} size="icon" className="h-8 w-8 bg-neutral-800 hover:bg-neutral-700 text-neutral-400">
                      <X className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleUpdateName} disabled={saving} size="icon" className="h-8 w-8 bg-[#00ff80] hover:bg-[#05ff84] text-black">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* AVATAR TOGGLE */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden px-4 py-3 flex items-center justify-between min-h-[72px]">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-neutral-200">Public Avatar</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Show photo on leaderboard</span>
              </div>
              <button
                onClick={toggleAvatar}
                className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:ring-offset-2 focus:ring-offset-neutral-900 ${showAvatar ? 'bg-[#00ff80]' : 'bg-neutral-700'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${showAvatar ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* PUSH NOTIFICATIONS */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <PushNotificationManager />
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="pt-4">
            <Button onClick={handleSignOut} variant="outline" className="w-full border-red-900/30 text-red-500 bg-red-950/10 hover:bg-red-950/30 hover:text-red-400 hover:border-red-900/50 h-12 font-bold">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>

        </div>
      </div>
    </RewardedAdProvider>
  )
}