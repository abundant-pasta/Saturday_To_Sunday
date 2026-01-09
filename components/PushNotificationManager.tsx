'use client'

import { useState, useEffect } from 'react'
import { Bell, Loader2, Share, BellOff, Download, CheckCircle2 } from 'lucide-react'

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
  
  // New state to track if we *just* clicked the button in this session
  const [justSubscribed, setJustSubscribed] = useState(false)

  useEffect(() => {
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

  // --- STATE 1: BROWSER (NOT INSTALLED) ---
  if (!isSupported) {
    return (
      <div className="p-4 w-full bg-neutral-900/50 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[#00ff80]">
           <Download className="w-4 h-4" />
           <span className="text-xs font-bold uppercase tracking-wider">Install App</span>
        </div>
        <p className="text-[11px] leading-relaxed text-neutral-400">
          Install to home screen for easy access and daily notifications.
        </p>
        
        {/* Updated Instructions List */}
        <div className="flex flex-col gap-2 text-[10px] text-white font-bold bg-neutral-800 p-3 rounded-lg border border-neutral-700">
           <div className="flex items-center gap-2">
             <span className="bg-neutral-700 text-neutral-400 w-4 h-4 flex items-center justify-center rounded-full text-[9px]">1</span>
             <span>Tap</span> <Share className="w-3 h-3 text-blue-400" /> <span>Share</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="bg-neutral-700 text-neutral-400 w-4 h-4 flex items-center justify-center rounded-full text-[9px]">2</span>
             <span>Scroll down (or tap "More")</span>
           </div>
           <div className="flex items-center gap-2">
             <span className="bg-neutral-700 text-neutral-400 w-4 h-4 flex items-center justify-center rounded-full text-[9px]">3</span>
             <span>Select "Add to Home Screen"</span>
           </div>
        </div>
      </div>
    )
  }

  // --- STATE 2: HOME PAGE SUCCESS MESSAGE ---
  if (hideOnSubscribed && isSubscribed) {
    if (justSubscribed) {
      return (
        <div className="flex items-center gap-3 p-4 w-full bg-[#00ff80]/10">
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

  // --- STATE 3: STANDARD TOGGLE ---
  return (
    <div className="flex items-center justify-between p-4 w-full">
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