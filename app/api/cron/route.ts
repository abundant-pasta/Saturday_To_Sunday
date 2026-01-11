import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSimilarDistractors } from '@/lib/conferences'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // ==========================================
  // 🔒 SECURITY CHECK
  // ==========================================
  const authHeader = request.headers.get('authorization')
  if (
    process.env.NODE_ENV === 'production' && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'generate'

  // ==========================================
  // MODE A: GENERATE (Midday - Silent)
  // ==========================================
  if (action === 'generate') {
    // 1. Calculate Tomorrow's Date
    const offset = 6 * 60 * 60 * 1000 
    const now = new Date(Date.now() - offset)
    now.setDate(now.getDate() + 1)
    const targetDate = now.toISOString().split('T')[0]

    // 2. Check Idempotency
    const { data: existing } = await supabase
      .from('daily_games')
      .select('date')
      .eq('date', targetDate)
      .single()

    if (existing) {
      return NextResponse.json({ message: `Game already exists for ${targetDate}.` })
    }

    // --- 3. NEW: CALCULATE 7-DAY CUTOFF ---
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const cutoffString = sevenDaysAgo.toISOString()

    // --- 4. FETCH POOLS WITH COOLDOWN FILTER ---
    // We filter for players who have NEVER played (null) OR played before the cutoff
    const [easyRes, mediumRes, hardRes] = await Promise.all([
      supabase.from('players').select('*')
        .eq('tier', 1)
        .not('image_url', 'is', null)
        .or(`last_selected.is.null,last_selected.lt.${cutoffString}`) // <--- THE FILTER
        .limit(50),
      supabase.from('players').select('*')
        .eq('tier', 2)
        .not('image_url', 'is', null)
        .or(`last_selected.is.null,last_selected.lt.${cutoffString}`) // <--- THE FILTER
        .limit(30),
      supabase.from('players').select('*')
        .eq('tier', 3)
        .not('image_url', 'is', null)
        .or(`last_selected.is.null,last_selected.lt.${cutoffString}`) // <--- THE FILTER
        .limit(20)
    ])

    if (!easyRes.data || easyRes.data.length < 5 || 
        !mediumRes.data || mediumRes.data.length < 3 || 
        !hardRes.data || hardRes.data.length < 2) {
      return NextResponse.json({ error: 'Not enough players available (checked 7-day cooldown).' }, { status: 500 })
    }

    // 5. COMPILE ORDERED ROSTER
    const orderedRoster = [
      ...easyRes.data.sort(() => 0.5 - Math.random()).slice(0, 5),
      ...mediumRes.data.sort(() => 0.5 - Math.random()).slice(0, 3),
      ...hardRes.data.sort(() => 0.5 - Math.random()).slice(0, 2)
    ]

    // 6. Build Content
    const { data: allColleges } = await supabase.from('players').select('college').not('college', 'is', null)
    const collegeList = Array.from(new Set(allColleges?.map((c: any) => c.college) || [])) as string[]

    const content = orderedRoster.map((p: any) => {
      const wrong = getSimilarDistractors(p.college, collegeList)
      const options = [p.college, ...wrong].sort(() => 0.5 - Math.random())
      return {
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        correct_answer: p.college,
        options: options,
        tier: p.tier || 1 
      }
    })

    // 7. Save to DB
    const { error } = await supabase
      .from('daily_games')
      .insert({ date: targetDate, content })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 8. UPDATE LAST_SELECTED (Locks them out for next 7 days)
    const playerIds = orderedRoster.map((p: any) => p.id)
    await supabase
      .from('players')
      .update({ last_selected: new Date().toISOString() })
      .in('id', playerIds)

    return NextResponse.json({ success: true, date: targetDate, action: 'Generated (with 7-day cooldown)' })
  }

  // ==========================================
  // MODE B: NOTIFY (Morning - Loud)
  // ==========================================
  if (action === 'notify') {
    try {
      if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) {
        throw new Error('Missing VAPID_PRIVATE_KEY or VAPID_SUBJECT env vars')
      }

      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY
      )

      const { data: subs } = await supabase.from('push_subscriptions').select('subscription')
      
      if (subs && subs.length > 0) {
        const payload = JSON.stringify({
          title: 'Saturday to Sunday',
          body: 'The new daily challenge is live! Can you keep your streak alive? 🏈',
          icon: '/icon-192x192.png'
        })

        await Promise.allSettled(
          subs.map(sub => webpush.sendNotification(sub.subscription as any, payload))
        )
      }
      
      return NextResponse.json({ success: true, action: 'Notified' })

    } catch (e: any) {
      console.error("Cron Notify Error:", e)
      return NextResponse.json({ error: e.message || 'Notification failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 })
}