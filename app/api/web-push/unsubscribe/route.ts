import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'No endpoint provided' }, { status: 400 })
    }

    // 🔒 ADMIN CLIENT: Bypasses RLS so Guests can unsubscribe
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Re-calculate the ID so we can find the correct row to delete
    const id = Buffer.from(endpoint).toString('base64')

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Unsubscribe error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}