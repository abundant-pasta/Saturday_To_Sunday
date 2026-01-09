'use client'

import { useState, useEffect } from 'react'
import { Bell, Loader2 } from 'lucide-react'

// Boilerplate utility to convert your VAPID key
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
  const [loading, setLoading] = useState(true) // Start loading to prevent flash

  // 1. On load, check if the user is ALREADY subscribed
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
    } else {
      setLoading(false) // Stop loading if not supported
    }
  }, [])

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        setIsSubscribed(true)
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  // 2. The Logic to Subscribe
  async function subscribeToPush() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready

      // A. Ask browser for permission
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        )
      })

      // B. Send to DB
      // Note: Keeping your endpoint '/api/web-push/subscribe'
      const res = await fetch('/api/web-push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      })

      if (!res.ok) throw new Error('Failed to save to DB')

      setIsSubscribed(true)
      // Removed alert for a smoother UI experience, the button state change is enough feedback
    } catch (error) {
      console.error(error)
      alert('Could not enable notifications. Please check your browser settings.')
    } finally {
      setLoading(false)
    }
  }

  // If not supported, we hide the component entirely (or you could show a "Not supported" text)
  if (!isSupported) return null

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
        <div className="px-3 py-1 bg-[#00ff80]/10 text-[#00ff80] text-xs font-black uppercase tracking-widest rounded border border-[#00ff80]/20 cursor-default select-none">
          On
        </div>
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