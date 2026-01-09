import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const subscription = await request.json()
  
  if (!subscription || !subscription.endpoint) {
    return NextResponse.json({ error: 'No subscription provided' }, { status: 400 })
  }

  // 1. Init Client (captures cookies for secure Auth)
  const supabase = await createClient()

  // 2. Get Current User (if any)
  const { data: { user } } = await supabase.auth.getUser()

  // 3. Create a unique ID for this device
  // We use the endpoint URL as the unique key because it is unique per browser instance.
  // This allows us to find the existing row and UPDATE the user_id if they just logged in.
  const subscriptionId = Buffer.from(subscription.endpoint).toString('base64')

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      id: subscriptionId,         // Forces deduplication by ID
      user_id: user?.id || null,  // Updates the owner to the current user
      subscription: subscription
    })

  if (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}