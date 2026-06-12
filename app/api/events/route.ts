import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]{1,63}$/
const SPORT_PATTERN = /^[a-z][a-z0-9_]{1,31}$/

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 25)
      .filter(([, entry]) => (
        typeof entry === 'string' ||
        typeof entry === 'number' ||
        typeof entry === 'boolean'
      ))
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const eventName = String(body?.event_name || '').trim()
    const guestId = body?.guest_id ? String(body.guest_id).slice(0, 128) : null
    const sport = body?.sport ? String(body.sport).trim() : null

    if (!EVENT_NAME_PATTERN.test(eventName)) {
      return NextResponse.json({ error: 'Invalid event_name' }, { status: 400 })
    }

    if (sport && !SPORT_PATTERN.test(sport)) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }

    let userId: string | null = null
    try {
      const supabaseAuth = await createServerClient()
      const { data: { user } } = await supabaseAuth.auth.getUser()
      userId = user?.id || null
    } catch {
      userId = null
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabaseAdmin
      .from('growth_events')
      .insert({
        user_id: userId,
        guest_id: guestId,
        event_name: eventName,
        sport,
        metadata: sanitizeMetadata(body?.metadata),
      })

    if (error) {
      console.error('Growth event error:', error)
      return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Growth event route error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
