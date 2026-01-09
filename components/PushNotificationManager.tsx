'use client'

import { useState, useEffect } from 'react'
import { Bell, Check } from 'lucide-react'

// Boilerplate utility to convert your VAPID key
// (The browser requires the key in this specific weird format)
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
  const [loading, setLoading] = useState(false)

  // 1. On load, check if the user is ALREADY subscribed
  useEffect(() => {
    // Check if browser supports Service Workers and Push
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
    }
  }, [])

  async function checkSubscription() {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      setIsSubscribed(true)
    }
  }

  // 2. The Logic to Subscribe
  async function subscribeToPush() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready

      // A. Ask the browser for permission & get the ticket
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        )
      })

      // B. Send that ticket to our database
      const res = await fetch('/api/web-push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      })

      if (!res.ok) throw new Error('Failed to save to DB')

      setIsSubscribed(true)
      alert("Success! You'll get a notification when the new game drops.")
    } catch (error) {
      console.error(error)
      alert('Could not enable notifications. You might have blocked them in your browser settings.')
    } finally {
      setLoading(false)
    }
  }

  // Don't show anything if the browser (e.g. older Safari) doesn't support it
  if (!isSupported) return null

  if (isSubscribed) {
    return (
      <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800 text-neutral-400 rounded-lg font-medium cursor-not-allowed border border-neutral-700">
        <Check className="w-4 h-4" />
        Notifications Active
      </button>
    )
  }

  return (
    <button
      onClick={subscribeToPush}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#00ff80] hover:bg-[#00cc66] text-black rounded-lg font-bold transition-colors"
    >
      {loading ? (
        <span>Activating...</span>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          Get Daily Reminders
        </>
      )}
    </button>
  )
}