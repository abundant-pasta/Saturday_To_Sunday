import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSimilarDistractors } from '@/lib/conferences'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

// --- HELPER: FISHER-YATES SHUFFLE (Unbiased Randomization) ---
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export async function GET(request: Request) {
  // ==========================================
  // 🔒 SECURITY CHECK (TEMPORARILY DISABLED)
  // ==========================================
  // const authHeader = request.headers.get('authorization')
  // if (
  //   process.env.NODE_ENV === 'production' && 
  //   authHeader !== `Bearer ${process.env.CRON_SECRET}`
  // ) {
  //   return new NextResponse('Unauthorized', { status: 401 })
  // }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'generate'

  // ==========================================
  // MODE A: GENERATE
  // ==========================================
  if (action === 'generate') {
    
    // 1. DATE LOGIC
    const overrideDate = searchParams.get('date')
    let targetDate = ''

    if (overrideDate) {
        targetDate = overrideDate
        console.log(`Manual Override: Generating games for ${targetDate}`)
    } else {
        const offset = 6 * 60 * 60 * 1000 
        const now = new Date(Date.now() - offset)
        now.setDate(now.getDate() + 1)
        targetDate = now.toISOString().split('T')[0]
    }

    // 2. CALCULATE 45-DAY CUTOFF
    const cooldownDate = new Date()
    cooldownDate.setDate(cooldownDate.getDate() - 45)
    const cutoffString = cooldownDate.toISOString()

    // 3. DEFINE CONFIGS
    const sportConfigs = [
      { 
        sport: 'football', 
        total: 10, 
        distribution: [5, 3, 2] // 5 Easy, 3 Med, 2 Hard
      },
      { 
        sport: 'basketball', 
        total: 5, 
        distribution: [2, 2, 1] // 2 Easy, 2 Med, 1 Hard
      }
    ]

    const results = []

    // 4. GENERATION LOOP
    for (const config of sportConfigs) {
      const { sport, distribution } = config

      // A. Check Idempotency
      const { data: existing } = await supabase
        .from('daily_games')
        .select('date')
        .eq('date', targetDate)
        .eq('sport', sport)
        .single()

      if (existing) {
        results.push(`${sport}: Already exists`)
        continue
      }

      // B. Fetch Pools
      const [easyRes, mediumRes, hardRes] = await Promise.all([
        supabase.from('players').select('*')
          .eq('sport', sport)
          .eq('tier', 1)
          .not('image_url', 'is', null)
          .or(`last_selected.is.null,last_selected.lt.${cutoffString}`)
          .limit(50),
        supabase.from('players').select('*')
          .eq('sport', sport)
          .eq('tier', 2)
          .not('image_url', 'is', null)
          .or(`last_selected.is.null,last_selected.lt.${cutoffString}`)
          .limit(30),
        supabase.from('players').select('*')
          .eq('sport', sport)
          .eq('tier', 3)
          .not('image_url', 'is', null)
          .or(`last_selected.is.null,last_selected.lt.${cutoffString}`)
          .limit(20)
      ])

      // Validation
      if (!easyRes.data || easyRes.data.length < distribution[0] || 
          !mediumRes.data || mediumRes.data.length < distribution[1] || 
          !hardRes.data || hardRes.data.length < distribution[2]) {
        console.error(`Not enough ${sport} players available (checked 45-day cooldown).`)
        results.push(`${sport}: Failed - Not enough players`)
        continue
      }

      // C. Compile Ordered Roster (Applied Shuffle Logic Here Too)
      const rosterPool = [
        ...shuffleArray(easyRes.data).slice(0, distribution[0]),
        ...shuffleArray(mediumRes.data).slice(0, distribution[1]),
        ...shuffleArray(hardRes.data).slice(0, distribution[2])
      ]
      
      // Shuffle the final roster order so tiers are mixed (optional, but good for gameplay)
      // If you want them strictly ordered Easy -> Hard, remove this line.
      // currently your UI seems to present them sequentially, so keeping original order might be better?
      // I will keep the tiers ordered (Easy first) but randomized *within* tiers as done above.
      const orderedRoster = rosterPool; 

      // D. Build Content
      const { data: allColleges } = await supabase
        .from('players')
        .select('college')
        .eq('sport', sport)
        .not('college', 'is', null)

      const collegeList = Array.from(new Set(allColleges?.map((c: any) => c.college) || [])) as string[]

      const content = orderedRoster.map((p: any) => {
        const wrong = getSimilarDistractors(p.college, collegeList)
        
        // --- THE FIX IS HERE ---
        // Old: .sort(() => 0.5 - Math.random()) -> Biased
        // New: shuffleArray() -> Perfectly random
        const options = shuffleArray([p.college, ...wrong])

        return {
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          correct_answer: p.college,
          options: options,
          tier: p.tier || 1,
          sport: p.sport 
        }
      })

      // E. Save to DB
      const { error } = await supabase
        .from('daily_games')
        .insert({ 
          date: targetDate, 
          content,
          sport: sport 
        })

      if (error) {
        results.push(`${sport}: DB Error - ${error.message}`)
      } else {
        // F. Update last_selected
        const playerIds = orderedRoster.map((p: any) => p.id)
        await supabase
          .from('players')
          .update({ last_selected: new Date().toISOString() })
          .in('id', playerIds)
        
        results.push(`${sport}: Generated successfully`)
      }
    }

    return NextResponse.json({ success: true, date: targetDate, results })
  }

  // ==========================================
  // MODE B: NOTIFY
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
          body: 'New Daily Grids are live! Check out today\'s Football and Basketball challenges. 🏈 🏀',
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