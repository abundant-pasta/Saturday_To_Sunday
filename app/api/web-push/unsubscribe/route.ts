import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: 'No endpoint provided' }, { status: 400 })
    }

    const supabase = await createClient()

    // Re-calculate the ID so we can find the correct row to delete
    const id = Buffer.from(endpoint).toString('base64')

    const { error } = await supabase
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