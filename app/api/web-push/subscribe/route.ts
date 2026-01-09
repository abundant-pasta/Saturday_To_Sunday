import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const subscription = await request.json()
  const supabase = await createClient()

  // Optional: If the user is logged in, grab their ID so we know WHO this device belongs to
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('push_subscriptions')
    .insert({
      user_id: user?.id || null, // If they are a guest, user_id is null
      subscription: subscription
    })

  // We ignore "duplicate key" errors.
  // Why? If a user clears their cache and clicks "Subscribe" again, 
  // the browser sends the SAME keys. We don't want to crash, we just want to say "Ok, got it."
  if (error && !error.message.includes('unique constraint')) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}