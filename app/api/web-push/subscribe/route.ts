import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const subscription = await request.json()
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'No subscription provided' }, { status: 400 })
    }

    // 🔒 ADMIN CLIENT: Bypasses RLS so Guests can subscribe
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Get User ID (Optional)
    // We still try to get the user from the cookie just to link them if possible,
    // but we don't rely on it for permission to write.
    // (We use a separate standard client just to read the cookie securely)
    let userId = null
    try {
        // Quick check for standard client just to read Auth cookie
        const { createClient: createCookieClient } = require('@/utils/supabase/server')
        const supabaseAuth = await createCookieClient()
        const { data: { user } } = await supabaseAuth.auth.getUser()
        userId = user?.id || null
    } catch (e) {
        // If this fails (e.g. running outside of Next.js context), strictly ignore it.
        // Guests remain null.
    }

    // 2. Create Unique ID
    const subscriptionId = Buffer.from(subscription.endpoint).toString('base64')

    // 3. Admin Save
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        id: subscriptionId,         
        user_id: userId,  
        subscription: subscription
      })

    if (error) {
      console.error('Subscription error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('Server error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}