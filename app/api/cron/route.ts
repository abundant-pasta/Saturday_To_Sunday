import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSimilarDistractors } from '@/lib/conferences'

// FORCE DYNAMIC: Ensures this isn't cached
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // 1. Initialize Admin Client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Calculate "Tomorrow's" Date
  // We explicitly add 1 day. This allows the Cron to run at Midday (today)
  // and generate the game for Tomorrow.
  const offset = 6 * 60 * 60 * 1000 
  const now = new Date(Date.now() - offset)
  now.setDate(now.getDate() + 1) // Target: Tomorrow
  const targetDate = now.toISOString().split('T')[0]

  // 3. Check Idempotency (Does game already exist?)
  const { data: existing } = await supabase
    .from('daily_games')
    .select('date') 
    .eq('date', targetDate)
    .single()

  if (existing) {
    return NextResponse.json({ message: `Game already exists for ${targetDate}.` })
  }

  // 4. FETCH POOLS (5-3-2 Split)
  const [easyRes, mediumRes, hardRes] = await Promise.all([
    supabase.from('players').select('*').eq('tier', 1).limit(50),
    supabase.from('players').select('*').eq('tier', 2).limit(30),
    supabase.from('players').select('*').eq('tier', 3).limit(20)
  ])

  if (!easyRes.data || easyRes.data.length < 5 || 
      !mediumRes.data || mediumRes.data.length < 3 || 
      !hardRes.data || hardRes.data.length < 2) {
      return NextResponse.json({ error: 'Not enough players in DB tiers.' }, { status: 500 })
  }

  // 5. COMPILE ORDERED ROSTER (5 Easy -> 3 Medium -> 2 Hard)
  const orderedRoster = [
    // Pick 5 random EASY players
    ...easyRes.data.sort(() => 0.5 - Math.random()).slice(0, 5),
    
    // Then 3 random MEDIUM players
    ...mediumRes.data.sort(() => 0.5 - Math.random()).slice(0, 3),
    
    // Then 2 random HARD players
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

  // 7. Save to DB (Silent Insert)
  const { error } = await supabase
    .from('daily_games')
    .insert({ date: targetDate, content })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, date: targetDate, distribution: "Ordered: 5 Easy, 3 Med, 2 Hard" })
}