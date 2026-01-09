'use client'

import { useState, useEffect } from 'react'
import { Bell, Loader2, Share, BellOff } from 'lucide-react'

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

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

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
        // 1. Tell Server to delete
        await fetch('/api/web-push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        })

        // 2. Tell Browser to unsubscribe
        await sub.unsubscribe()
      }

      setIsSubscribed(false)
    } catch (error) {
      console.error(error)
      alert('Failed to unsubscribe.')
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between p-4 w-full bg-neutral-900 border border-neutral-800 rounded-xl">
        <div className="flex flex-col gap-2">
           <span className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-neutral-500" /> Daily Reminders
           </span>
           <p className="text-[10px] leading-tight text-neutral-400 max-w-[200px]">
             To enable, tap <Share className="w-3 h-3 inline mx-1" /> <span className="font-bold text-white">Share</span> then <span className="font-bold text-white">Add to Home Screen</span>.
           </p>
        </div>
      </div>
    )
  }

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