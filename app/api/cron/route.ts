import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSimilarDistractors } from '@/lib/conferences'

// FORCE DYNAMIC: Ensures this isn't cached
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // 1. Initialize Admin Client (Service Role to bypass RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Calculate Date (Mountain Time)
  const offset = 6 * 60 * 60 * 1000 
  const adjustedTime = new Date(Date.now() - offset)
  const today = adjustedTime.toISOString().split('T')[0]

  // 3. Check if game exists (Idempotency)
  const { data: existing } = await supabase
    .from('daily_games')
    .select('id')
    .eq('date', today)
    .single()

  if (existing) {
    return NextResponse.json({ message: 'Game already exists for today.' })
  }

  // 4. Generate Questions
  // Fetch a pool of 300 players to randomize from
  const { data: pool } = await supabase
    .from('players')
    .select('*')
    .gt('rating', 0)
    .limit(300)

  if (!pool || pool.length < 10) {
    return NextResponse.json({ error: 'Not enough players in DB' }, { status: 500 })
  }

  // Shuffle and pick 10
  const selectedPlayers = pool.sort(() => 0.5 - Math.random()).slice(0, 10)

  // 5. Build Options (Right Answer + Wrong Answers)
  const { data: allColleges } = await supabase.from('players').select('college').not('college', 'is', null)
  const collegeList = Array.from(new Set(allColleges?.map((c: any) => c.college) || [])) as string[]

  const content = selectedPlayers.map((p: any) => {
    const wrong = getSimilarDistractors(p.college, collegeList)
    const options = [p.college, ...wrong].sort(() => 0.5 - Math.random())
    return {
      id: p.id,
      name: p.name,
      image_url: p.image_url,
      correct_answer: p.college,
      options: options,
      tier: p.tier 
    }
  })

  // 6. Save to DB
  const { error } = await supabase
    .from('daily_games')
    .insert({ date: today, content })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, date: today })
}