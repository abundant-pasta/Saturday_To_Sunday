'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getConference } from '@/lib/conferences'
import { GAME_CONFIG, PLAYER_COOLDOWN_DAYS, TIMEZONE_OFFSET_MS } from '@/lib/constants'
import { hashAnswer, generateSalt } from '@/utils/crypto'
import { enrichQuestionsWithPlayerMetadata } from '@/lib/personalization'
import { buildAnswerSecurity, getAcceptedCollegeAnswers, getTransferSafeDistractors } from '@/lib/player-trust'

type ImageAuditIssueType = 'bad_photo' | 'wrong_person' | 'college_spoiler' | 'broken_image' | 'other'
type ImageAuditStatus = 'open' | 'reviewing' | 'fixed' | 'ignored'

const IMAGE_AUDIT_ISSUES = new Set<ImageAuditIssueType>(['bad_photo', 'wrong_person', 'college_spoiler', 'broken_image', 'other'])
const IMAGE_AUDIT_STATUSES = new Set<ImageAuditStatus>(['open', 'reviewing', 'fixed', 'ignored'])

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || '').trim().slice(0, maxLength)
}

function toNullablePlayerId(value: unknown) {
  const clean = String(value || '').trim()
  if (!/^\d+$/.test(clean)) return null
  const numeric = Number(clean)
  return Number.isSafeInteger(numeric) ? numeric : null
}

function normalizeImageAuditKeyPart(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function imageAuditDedupeKey(row: {
  player_id?: number | null
  player_name?: string | null
  sport?: string | null
  game_mode?: string | null
}) {
  const playerKey = row.player_id != null
    ? `id:${row.player_id}`
    : `name:${normalizeImageAuditKeyPart(row.player_name)}`

  return `${playerKey}|${normalizeImageAuditKeyPart(row.sport)}|${normalizeImageAuditKeyPart(row.game_mode)}`
}

// --- Helper: Generate Random Room Code ---

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// --- 6. ADMIN FUNCTIONS ---
export async function deletePlayer(playerId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('players').delete().eq('id', playerId)
  if (error) {
    console.error('Error deleting player:', error)
    throw new Error('Failed to delete player')
  }
  revalidatePath('/admin')
}

export async function updatePlayerImage(playerId: string, imageUrl: string) {
  const supabase = await createClient()

  // Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const isAuthorized = user && adminEmail && user.email?.toLowerCase() === adminEmail?.toLowerCase()

  if (!isAuthorized) {
    throw new Error('Unauthorized')
  }

  // Use Admin Client (Service Role) to bypass RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin.from('players').update({
    image_url: imageUrl,
    is_image_verified: true,
    image_status: 'approved',
    image_context: 'pro',
  }).eq('id', playerId)

  if (error) {
    console.error('Error updating player image:', error)
    throw new Error('Failed to update player image')
  }
  revalidatePath('/admin')
  revalidatePath('/admin/images')
}

export async function verifyPlayerImage(playerId: string, isVerified: boolean) {
  const supabase = await createClient()

  // Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const isAuthorized = user && adminEmail && user.email?.toLowerCase() === adminEmail?.toLowerCase()

  if (!isAuthorized) {
    throw new Error('Unauthorized')
  }

  // Use Admin Client (Service Role) to bypass RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin.from('players').update({
    is_image_verified: isVerified,
    image_status: isVerified ? 'approved' : 'unreviewed',
  }).eq('id', playerId)

  if (error) {
    console.error('Error verifying player image:', error)
    throw new Error('Failed to verify player image')
  }
  revalidatePath('/admin/images')
}

export async function updatePlayerImageStatus(
  playerId: string,
  status: 'unreviewed' | 'approved' | 'spoiler' | 'wrong_person' | 'missing',
  context: 'unknown' | 'pro' | 'college' | 'headshot' = 'unknown',
  notes: string = ''
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const isAuthorized = user && adminEmail && user.email?.toLowerCase() === adminEmail?.toLowerCase()

  if (!isAuthorized) {
    throw new Error('Unauthorized')
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from('players')
    .update({
      image_status: status,
      image_context: context,
      image_notes: notes.trim() || null,
      is_image_verified: status === 'approved',
    })
    .eq('id', playerId)

  if (error) {
    console.error('Error updating image status:', error)
    throw new Error('Failed to update image status')
  }

  revalidatePath('/admin/images')
}

export async function submitImageAuditReports(input: {
  reports: Array<{
    playerId: number | string
    playerName: string
    imageUrl?: string | null
    issueType: ImageAuditIssueType
  }>
  sport: string
  gameMode?: 'daily' | 'survival'
  gameDate?: string | null
  guestId?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const reports = Array.isArray(input?.reports) ? input.reports.slice(0, 10) : []
  if (reports.length === 0) {
    throw new Error('No image reports selected')
  }

  const sport = sanitizeText(input?.sport, 32).toLowerCase()
  const gameMode = input?.gameMode === 'survival' ? 'survival' : 'daily'
  const guestId = sanitizeText(input?.guestId, 128) || null
  const notes = sanitizeText(input?.notes, 500) || null
  const gameDate = input?.gameDate && /^\d{4}-\d{2}-\d{2}$/.test(input.gameDate) ? input.gameDate : null

  if (!sport || !/^[a-z][a-z0-9_]{1,31}$/.test(sport)) {
    throw new Error('Invalid sport')
  }

  const rows = reports
    .filter((report) => IMAGE_AUDIT_ISSUES.has(report.issueType))
    .map((report) => ({
      player_id: toNullablePlayerId(report.playerId),
      reporter_user_id: user?.id || null,
      guest_id: guestId,
      game_date: gameDate,
      sport,
      game_mode: gameMode,
      player_name: sanitizeText(report.playerName, 120) || 'Unknown player',
      image_url: sanitizeText(report.imageUrl, 1000) || null,
      issue_type: report.issueType,
      notes,
      metadata: {
        source: 'post_game_prompt',
      },
    }))

  if (rows.length === 0) {
    throw new Error('No valid image reports selected')
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const seenInputKeys = new Set<string>()
  const uniqueRows = rows.filter((row) => {
    const key = imageAuditDedupeKey(row)
    if (seenInputKeys.has(key)) return false
    seenInputKeys.add(key)
    return true
  })

  const { data: existingReports, error: existingReportsError } = await supabaseAdmin
    .from('image_audit_reports')
    .select('player_id, player_name, sport, game_mode')
    .in('status', ['open', 'reviewing'])
    .eq('sport', sport)
    .eq('game_mode', gameMode)
    .limit(1000)

  if (existingReportsError) {
    console.error('Image audit report dedupe error:', existingReportsError)
    throw new Error('Failed to check existing image reports')
  }

  const existingKeys = new Set((existingReports || []).map((report) => imageAuditDedupeKey(report)))
  const rowsToInsert = uniqueRows.filter((row) => !existingKeys.has(imageAuditDedupeKey(row)))
  let skippedDuplicates = rows.length - rowsToInsert.length
  const insertedRows: typeof rowsToInsert = []

  for (const row of rowsToInsert) {
    const { error } = await supabaseAdmin
      .from('image_audit_reports')
      .insert(row)

    if (error) {
      if (error.code === '23505') {
        skippedDuplicates += 1
        continue
      }

      console.error('Image audit report insert error:', error)
      throw new Error('Failed to submit image report')
    }

    insertedRows.push(row)
  }

  await supabaseAdmin.from('growth_events').insert({
    user_id: user?.id || null,
    guest_id: guestId,
    event_name: 'image_audit_reported',
    sport,
    metadata: {
      game_mode: gameMode,
      game_date: gameDate,
      report_count: insertedRows.length,
      skipped_duplicate_count: skippedDuplicates,
      issue_types: Array.from(new Set(insertedRows.map((row) => row.issue_type))).join(','),
    },
  })

  revalidatePath('/admin/images')

  return { submitted: insertedRows.length, skippedDuplicates }
}

export async function updateImageAuditReportStatus(reportId: string, status: ImageAuditStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const isAuthorized = user && adminEmail && user.email?.toLowerCase() === adminEmail?.toLowerCase()

  if (!isAuthorized) {
    throw new Error('Unauthorized')
  }

  const cleanReportId = sanitizeText(reportId, 64)
  if (!cleanReportId || !IMAGE_AUDIT_STATUSES.has(status)) {
    throw new Error('Invalid report update')
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from('image_audit_reports')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cleanReportId)

  if (error) {
    console.error('Image audit report status error:', error)
    throw new Error('Failed to update report')
  }

  revalidatePath('/admin/images')
  return { success: true }
}

// --- 7. DAILY GAME (MULTI-SPORT SUPPORT) ---
// Note: We accept a 'sport' parameter now.
export async function getDailyGame(sport: string = 'football') {
  const supabase = await createClient()

  // 1. DATE LOGIC
  const adjustedTime = new Date(Date.now() - TIMEZONE_OFFSET_MS)
  const today = adjustedTime.toISOString().split('T')[0]

  // 2. FETCH GAME (Filtered by Sport)
  // Ensure your 'daily_games' table has a 'sport' column, or this filter will fail.
  // If you haven't added it yet, run: ALTER TABLE daily_games ADD COLUMN sport TEXT DEFAULT 'football';
  const { data: existingGames } = await supabase
    .from('daily_games')
    .select('content')
    .eq('date', today)
    .eq('sport', sport) // <--- The Logic Wall
    .limit(1)

  if (existingGames && existingGames.length > 0) {
    const questions = existingGames[0].content as any[]

    // Check if the first question is already secured (has answer_hash and NO plain name)
    // Actually, check for 'correct_answer' since that's what we want to REMOVE.
    const needsSecurity = questions.some(q => q.correct_answer || (!q.answer_hash && !q.answer_hashes) || !q.name.includes('=') && q.name.length < 50) // Basic heuristic

    if (!needsSecurity) {
      return enrichQuestionsWithPlayerMetadata(supabase, questions, sport as 'football' | 'basketball')
    }

    console.log(`Securing legacy ${sport} game on-the-fly...`)
    const safeQuestions = await Promise.all(questions.map(async (q) => {
      const answer = q.correct_answer || q.answer // Support both legacy key names
      const extraAnswers = Array.isArray(q.accepted_colleges) ? q.accepted_colleges : []
      const answers = Array.from(new Set([answer, ...extraAnswers].filter(Boolean)))
      const salt = q.salt || generateSalt()
      const answerHashes = q.answer_hashes || await Promise.all(answers.map((college) => hashAnswer(college, salt)))

      // Determine if name needs obfuscation (if it's plain text)
      // A simple check: if it contains spaces, it's likely plain text
      const name = (q.name.includes(' ') || !q.name.includes('='))
        ? Buffer.from(q.name).toString('base64')
        : q.name

      return {
        ...q,
        name,
        answer_hash: q.answer_hash || answerHashes[0],
        answer_hashes: answerHashes,
        salt: salt,
        correct_answer: undefined, // Eviscerate the plain text answer
        answer: undefined
      }
    }))

    return enrichQuestionsWithPlayerMetadata(supabase, safeQuestions, sport as 'football' | 'basketball')
  }

  // 3. EMERGENCY FALLBACK
  console.log(`CRON MISS: Generating emergency ${sport} game for today...`)

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const dailySport = sport === 'basketball' ? 'basketball' : 'football'
  const gameConfig = dailySport === 'basketball' ? GAME_CONFIG.basketball : GAME_CONFIG.football
  const distribution = gameConfig.distribution
  const cooldownDate = new Date()
  cooldownDate.setDate(cooldownDate.getDate() - PLAYER_COOLDOWN_DAYS)
  const cutoffString = cooldownDate.toISOString()

  const fetchTier = (tier: number, limit: number) => supabaseAdmin
    .from('players')
    .select('*')
    .eq('sport', dailySport)
    .eq('tier', tier)
    .in('game_mode', ['daily', 'both'])
    .not('image_url', 'is', null)
    .not('image_status', 'in', '("spoiler","wrong_person","missing")')
    .gt('rating', 0)
    .or(`last_selected.is.null,last_selected.lt.${cutoffString}`)
    .order('rating', { ascending: false })
    .limit(limit)

  const [easyRes, mediumRes, hardRes] = await Promise.all([
    fetchTier(1, 50),
    fetchTier(2, 30),
    fetchTier(3, 20),
  ])

  if (
    !easyRes.data || easyRes.data.length < distribution[0] ||
    !mediumRes.data || mediumRes.data.length < distribution[1] ||
    !hardRes.data || hardRes.data.length < distribution[2]
  ) {
    return null
  }

  const selectedPlayers = [
    ...shuffleArray(easyRes.data).slice(0, distribution[0]),
    ...shuffleArray(mediumRes.data).slice(0, distribution[1]),
    ...shuffleArray(hardRes.data).slice(0, distribution[2]),
  ]

  // Get colleges for distractors (Filtered by Sport)
  const { data: allCollegesData } = await supabase
    .from('players')
    .select('college')
    .eq('sport', dailySport) // <--- Distractors must match the sport
    .not('college', 'is', null)

  const collegeList = Array.from(new Set(allCollegesData?.map((c: any) => c.college) || [])) as string[]

  const questions = await Promise.all(selectedPlayers.map(async (p: any) => {
    const wrong = getTransferSafeDistractors(p, collegeList)
    const options = [p.college, ...wrong].sort(() => 0.5 - Math.random())

    // Security: Hash the answer so it's not visible in network tab
    const answers = getAcceptedCollegeAnswers(p)
    const security = await buildAnswerSecurity(answers)

    return {
      id: p.id,
      name: Buffer.from(p.name).toString('base64'),
      image_url: p.image_url,
      // correct_answer: p.college, // REMOVED FOR SECURITY
      answer_hash: security.answer_hash,
      answer_hashes: security.answer_hashes,
      salt: security.salt,
      options: options,
      tier: p.tier,
      sport: p.sport, // Useful for UI
      team: p.team,
      college: p.college,
      accepted_colleges: p.accepted_colleges || [],
      college_answer_note: p.college_answer_note || null,
      conference: getConference(p.college)
    }
  }))

  // Save it immediately with the Sport tag
  await supabaseAdmin.from('daily_games').insert({
    date: today,
    content: questions,
    sport: dailySport // <--- Save with sport tag
  })

  await supabaseAdmin
    .from('players')
    .update({ last_selected: new Date().toISOString() })
    .in('id', selectedPlayers.map((p: any) => p.id))

  return questions
}

export async function claimGuestDailyResults(guestId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const cleanGuestId = String(guestId || '').trim()
  if (!cleanGuestId || cleanGuestId.length > 128) {
    throw new Error('Invalid guest id')
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: guestRows, error: guestError } = await supabaseAdmin
    .from('daily_results')
    .select('id, score, game_date, results_json, sport, created_at')
    .eq('guest_id', cleanGuestId)
    .order('created_at', { ascending: true })

  if (guestError) {
    console.error('Guest claim lookup error:', guestError)
    throw new Error('Failed to load guest scores')
  }

  let claimed = 0
  let upgraded = 0
  let skipped = 0

  for (const row of guestRows || []) {
    const sport = row.sport || 'football'
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('daily_results')
      .select('id, score')
      .eq('user_id', user.id)
      .eq('game_date', row.game_date)
      .eq('sport', sport)
      .maybeSingle()

    if (existingError) {
      console.error('Guest claim existing lookup error:', existingError)
      skipped++
      continue
    }

    if (existing) {
      if ((row.score || 0) > (existing.score || 0)) {
        const { error: updateError } = await supabaseAdmin
          .from('daily_results')
          .update({
            score: row.score,
            results_json: row.results_json,
          })
          .eq('id', existing.id)

        if (updateError) {
          console.error('Guest claim upgrade error:', updateError)
          skipped++
          continue
        }

        upgraded++
      } else {
        skipped++
      }

      await supabaseAdmin.from('daily_results').delete().eq('id', row.id)
      continue
    }

    const { error: transferError } = await supabaseAdmin
      .from('daily_results')
      .update({
        user_id: user.id,
        guest_id: null,
      })
      .eq('id', row.id)

    if (transferError) {
      console.error('Guest claim transfer error:', transferError)
      skipped++
      continue
    }

    claimed++
  }

  const today = new Date(Date.now() - TIMEZONE_OFFSET_MS).toISOString().split('T')[0]
  const claimedTodaySports = new Set(
    (guestRows || [])
      .filter((row) => row.game_date === today)
      .map((row) => row.sport || 'football')
  )

  const profileUpdate: Record<string, string> = {}
  if (claimedTodaySports.has('football')) profileUpdate.last_played_football_at = new Date().toISOString()
  if (claimedTodaySports.has('basketball')) profileUpdate.last_played_basketball_at = new Date().toISOString()

  if (Object.keys(profileUpdate).length > 0) {
    await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', user.id)
  }

  await supabaseAdmin.from('growth_events').insert({
    user_id: user.id,
    guest_id: cleanGuestId,
    event_name: 'claim_completed',
    metadata: { claimed, upgraded, skipped },
  })

  revalidatePath('/daily')
  revalidatePath('/daily/basketball')
  revalidatePath('/profile')
  revalidatePath('/leaderboard')

  return { claimed, upgraded, skipped }
}

// --- 8. ADMIN FIX TOOL ---

function serverDecodeName(name: any) {
  if (!name) return 'Unknown'
  const nameStr = String(name)
  // If it's base64 encoded by the game secure logic
  if (!nameStr.includes(' ') && (nameStr.includes('=') || nameStr.length > 12)) {
    try {
      return Buffer.from(nameStr, 'base64').toString('utf-8')
    } catch {
      return nameStr
    }
  }
  return nameStr
}

export async function getUpcomingPlayers() {
  const supabase = await createClient()

  const sports = ['football', 'basketball', 'survival_basketball', 'survival_football', 'survival_mixed']
  const playersMap = new Map()

  for (const sport of sports) {
    const { data: latestGame, error } = await supabase
      .from('daily_games')
      .select('sport, content, date')
      .eq('sport', sport)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestGame && !error) {
      const questions = latestGame.content as any[]
      questions.forEach(q => {
        const key = `${q.id}-${latestGame.date}`
        if (!playersMap.has(key)) {
          playersMap.set(key, {
            id: q.id,
            name: serverDecodeName(q.name), // Decode on server
            image_url: q.image_url,
            sport: latestGame.sport,
            date: latestGame.date
          })
        }
      })
    }
  }

  return Array.from(playersMap.values())
}

export async function fixPlayerPhoto(playerId: string, newImageUrl: string, targetDate: string) {
  const supabase = await createClient()

  // 1. Auth Check (Same as other admin actions)
  const { data: { user } } = await supabase.auth.getUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const isAuthorized = user && adminEmail && user.email?.toLowerCase() === adminEmail?.toLowerCase()

  if (!isAuthorized) {
    throw new Error('Unauthorized')
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Global Update in 'players'
  // Try both string and numeric match to be safe
  const { error: globalError } = await supabaseAdmin
    .from('players')
    .update({
      image_url: newImageUrl,
      is_image_verified: true,
      image_status: 'approved',
      image_context: 'pro',
    })
    .or(`id.eq.${playerId},id.eq.${parseInt(playerId) || -1}`)

  if (globalError) console.error('Global player update error:', globalError)

  // 3. Surgical Update in 'daily_games' for specified date
  const { data: games } = await supabaseAdmin
    .from('daily_games')
    .select('id, content')
    .eq('date', targetDate)

  if (games) {
    for (const game of games) {
      const content = game.content as any[]
      let modified = false

      const newContent = content.map(q => {
        // Type-safe comparison (handles numeric vs string IDs in JSONB)
        if (String(q.id) === String(playerId)) {
          modified = true
          return { ...q, image_url: newImageUrl }
        }
        return q
      })

      if (modified) {
        await supabaseAdmin
          .from('daily_games')
          .update({ content: newContent })
          .eq('id', game.id)
      }
    }
  }

  revalidatePath('/admin/fix')
  return { success: true }
}
