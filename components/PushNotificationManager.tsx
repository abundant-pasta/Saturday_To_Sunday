'use client'

import { useState, useEffect } from 'react'
import { Bell, Loader2, BellOff, CheckCircle2 } from 'lucide-react'

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
}

export default function PushNotificationManager({ hideOnSubscribed = false }: PushManagerProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [justSubscribed, setJustSubscribed] = useState(false)
  
  // NEW: Track if we are in the app
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // 1. CHECK IF INSTALLED (Standalone Mode)
    const checkStandalone = () => {
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
        setIsStandalone(!!isStandaloneMode)
    }
    checkStandalone()

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

  // --- CRITICAL CHANGE: HIDE IF NOT INSTALLED ---
  // If we are in the browser, return NULL so the Install Button is the only thing visible.
  if (!isStandalone) return null

  // --- SAFETY CHECK ---
  if (!isSupported) return null

  // --- STATE 2: HOME PAGE SUCCESS MESSAGE ---
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

  // --- STATE 3: STANDARD TOGGLE (Only visible inside the App) ---
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