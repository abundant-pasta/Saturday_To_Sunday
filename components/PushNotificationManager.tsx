'use client'

import { useState, useEffect } from 'react'
import { Bell, Loader2, BellOff, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

interface PushManagerProps {
  hideOnSubscribed?: boolean
  compact?: boolean
}

export default function PushNotificationManager({ hideOnSubscribed = false, compact = false }: PushManagerProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [justSubscribed, setJustSubscribed] = useState(false)

  // NEW: Track if we are in the app
  const [isStandalone, setIsStandalone] = useState(false)

  // NEW STATE: Auto-Prompt Modal
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // 1. CHECK IF INSTALLED (Standalone Mode)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
      setIsStandalone(!!isStandaloneMode)
      return !!isStandaloneMode
    }
    const isApp = checkStandalone()

    // 2. CHECK SERVICE WORKER SUPPORT
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)

      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          return registration.pushManager.getSubscription()
        })
        .then((subscription) => {
          if (subscription) {
            setIsSubscribed(true)
          } else {
            // 3. AUTO-PROMPT LOGIC (If installed + not subscribed + not dismissed)
            const hasDismissed = localStorage.getItem('s2s_notification_prompt_dismissed')
            if (isApp && !hasDismissed) {
              // Small delay to not be jarring
              setTimeout(() => setShowPrompt(true), 1500)
            }
          }
        })
        .catch((err) => console.error("SW Error:", err))
        .finally(() => setLoading(false))

    } else {
      setIsSupported(false)
      setLoading(false)
    }
  }, [])

  async function subscribeToPush() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        )
      })

      const res = await fetch('/api/web-push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      })

      if (!res.ok) throw new Error('Failed to save to DB')

      setIsSubscribed(true)
      setJustSubscribed(true)
      setShowPrompt(false) // Close modal if open

    } catch (error: any) {
      console.error(error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribeFromPush() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/web-push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        })
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
      setJustSubscribed(false)
    } catch (error) {
      console.error(error)
      alert('Failed to unsubscribe.')
    } finally {
      setLoading(false)
    }
  }

  const handleDismissPrompt = () => {
    setShowPrompt(false)
    localStorage.setItem('s2s_notification_prompt_dismissed', 'true')
  }

  // --- CRITICAL CHANGE: HIDE IF NOT INSTALLED ---
  // If we are in the browser, return NULL so the Install Button is the only thing visible.
  if (!isStandalone) return null

  // --- SAFETY CHECK ---
  if (!isSupported) return null

  // --- RENDER AUTO-PROMPT MODAL ---
  if (showPrompt && !isSubscribed) {
    return (
      <>
        {/* Overlay */}
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-300 relative">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-[#00ff80]/10 rounded-full flex items-center justify-center border border-[#00ff80]/20 animate-pulse">
                <Bell className="w-8 h-8 text-[#00ff80]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Stay in the loop</h2>
                <p className="text-neutral-400 text-sm mt-2 leading-relaxed">
                  Enable notifications to get your daily grid delivered fresh every morning.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={handleDismissPrompt}
                  className="flex-1 py-3 text-neutral-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors"
                >
                  Not Now
                </button>
                <Button
                  onClick={subscribeToPush}
                  disabled={loading}
                  className="flex-1 bg-[#00ff80] text-black font-black uppercase tracking-widest hover:bg-[#05ff84]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enable"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // --- STATE 2: HOME PAGE SUCCESS MESSAGE (Just subscribed) ---
  if (hideOnSubscribed && isSubscribed) {
    if (justSubscribed) {
      return (
        <div className="flex items-center gap-3 p-4 w-full bg-[#00ff80]/10 rounded-xl mb-4 border border-[#00ff80]/20 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-[#00ff80]" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Daily notifications enabled.</span>
            <span className="text-[10px] text-neutral-400">Change this setting in your Profile.</span>
          </div>
        </div>
      )
    }
    return null
  }

  // --- STATE 3: COMPACT TOGGLE (New) ---
  if (compact) {
    return (
      <div className="flex items-center justify-between px-4 py-2 w-full bg-neutral-900/50 hover:bg-neutral-900/80 transition-colors cursor-pointer group rounded-xl border border-neutral-800" onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}>
        <div className="flex items-center gap-2">
          <Bell className={`w-3.5 h-3.5 ${isSubscribed ? 'text-[#00ff80]' : 'text-neutral-500'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isSubscribed ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-400'}`}>
            {isSubscribed ? 'Reminders On' : 'Reminders Off'}
          </span>
        </div>

        {loading ? (
          <Loader2 className="animate-spin w-3 h-3 text-neutral-500" />
        ) : isSubscribed ? (
          <div className="w-2 h-2 rounded-full bg-[#00ff80] shadow-[0_0_8px_rgba(0,255,128,0.5)]" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-neutral-700 group-hover:bg-neutral-600" />
        )}
      </div>
    )
  }

  // --- STATE 4: STANDARD TOGGLE (Only visible inside the App) ---
  return (
    <div className="flex items-center justify-between p-4 w-full bg-neutral-900/50 border border-neutral-800 rounded-xl mb-4">
      <div className="flex flex-col text-left">
        <span className="text-sm font-bold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#00ff80]" /> Daily Reminders
        </span>
        <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide">
          Get alerted at 9:00 AM
        </span>
      </div>

      {loading ? (
        <Loader2 className="animate-spin w-5 h-5 text-neutral-500" />
      ) : isSubscribed ? (
        <button
          onClick={unsubscribeFromPush}
          className="px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-widest rounded border border-red-500/20 transition-colors flex items-center gap-2"
        >
          <BellOff className="w-3 h-3" /> Turn Off
        </button>
      ) : (
        <button
          onClick={subscribeToPush}
          className="px-4 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-black uppercase tracking-widest rounded transition-colors"
        >
          Turn On
        </button>
      )}
    </div>
  )
}