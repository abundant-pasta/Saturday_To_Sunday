'use client'

import { useState, useEffect, Suspense, useRef, useMemo } from 'react'
import { useUI } from '@/context/UIContext'
import { useSearchParams } from 'next/navigation'
import { claimGuestDailyResults, getDailyGame } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Home, Share2, Loader2, Trophy, Star, Skull, Dribbble, Target } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import IntroScreen from '@/components/IntroScreen'
import { createBrowserClient } from '@supabase/ssr'
import Leaderboard from '@/components/Leaderboard'
import LiveRankDisplay from '@/components/LiveRankDisplay'
import { TIMEZONE_OFFSET_MS, TIER_MULTIPLIERS, GAME_CONFIG, type Sport } from '@/lib/constants'
import { RewardedAdProvider } from '@/components/RewardedAdProvider'
import InstallPWA from '@/components/InstallPWA'
import PushNotificationManager from '@/components/PushNotificationManager'
import PostGameImageAudit from '@/components/PostGameImageAudit'
import { matchesQuestionAnswer } from '@/lib/player-trust'
import { getRankTitle } from '@/lib/utils'
import { trackEvent, trackGrowthEvent } from '@/lib/analytics'
import type { ChallengeKind, DailyQuestion } from '@/lib/personalization'
import { getFallbackTargetScore } from '@/lib/personalization'
import { getSurvivalStats } from '@/app/actions/survival'
import { buildCampaignLandingCopy } from '@/lib/growth'

const THEMES = {
  football: {
    primary: 'text-[#00ff80]',
    bgPrimary: 'bg-[#00ff80]',
    borderPrimary: 'border-[#00ff80]',
    cardBg: 'bg-neutral-900',
    ring: 'ring-[#00ff80]',
    icon: Star,
    label: 'Football'
  },
  basketball: {
    primary: 'text-amber-400',
    bgPrimary: 'bg-amber-600',
    borderPrimary: 'border-amber-600',
    cardBg: 'bg-gradient-to-br from-amber-950 to-black',
    ring: 'ring-amber-500',
    icon: Dribbble,
    label: 'Basketball'
  }
}

const getGameDate = () => {
  return new Date(Date.now() - TIMEZONE_OFFSET_MS).toISOString().split('T')[0]
}

const getMultiplier = (tier: number, sport: Sport) => {
  const multipliers = TIER_MULTIPLIERS[sport]
  return multipliers[tier as keyof typeof multipliers] || 1.0
}

const cleanText = (text: string) => text ? text.replace(/&amp;/g, '&') : ''

const getGuestId = () => {
  if (typeof window === 'undefined') return null
  let id = localStorage.getItem('s2s_guest_id')
  if (!id) {
    id = 'guest_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    localStorage.setItem('s2s_guest_id', id)
  }
  return id
}

type ResultEntry = { player_id: number | string; result: 'correct' | 'wrong' | 'pending'; player_name: string } | 'correct' | 'wrong' | 'pending'

type ChallengeRequest = {
  kind: ChallengeKind
  value: string
  label: string
}

type ChallengeStatus = {
  title: string
  introSubtitle: string
  finishSubtitle: string
  progressLabel: string
  isCompleted: boolean
  kind: ChallengeKind
  completedCount: number
  targetCount: number
}

const safeDecodeName = (value: string) => {
  try {
    return atob(value)
  } catch {
    return value
  }
}

function parseChallengeRequest(
  sport: 'football' | 'basketball',
  challengeKind: string | null,
  challengeValue: string | null,
  challengeLabel: string | null
): ChallengeRequest | null {
  if (!challengeKind) return null

  if (
    challengeKind !== 'school' &&
    challengeKind !== 'conference' &&
    challengeKind !== 'team' &&
    challengeKind !== 'preferred_sport'
  ) {
    return null
  }

  if (challengeKind === 'preferred_sport') {
    if (challengeValue && challengeValue !== sport) return null
    return {
      kind: challengeKind,
      value: sport,
      label: challengeLabel || `Beat your best ${sport} day`,
    }
  }

  if (!challengeValue) return null

  return {
    kind: challengeKind,
    value: challengeValue,
    label: challengeLabel || challengeValue,
  }
}

function buildChallengeStatus(
  challenge: ChallengeRequest | null,
  questions: DailyQuestion[],
  results: ResultEntry[],
  score: number,
  sport: 'football' | 'basketball',
  recentBestScore: number | null
): ChallengeStatus | null {
  if (!challenge) return null

  if (challenge.kind === 'preferred_sport') {
    const targetScore = getFallbackTargetScore(sport, recentBestScore)
    return {
      title: challenge.label,
      introSubtitle: `Finish with ${targetScore.toLocaleString()} points or better in today's ${sport} grid.`,
      finishSubtitle: `You finished with ${score.toLocaleString()} points against a ${targetScore.toLocaleString()} target.`,
      progressLabel: `${score.toLocaleString()} / ${targetScore.toLocaleString()}`,
      isCompleted: score >= targetScore,
      kind: challenge.kind,
      completedCount: score,
      targetCount: targetScore,
    }
  }

  const matchingIndexes = questions.reduce<number[]>((indexes, question, index) => {
    if (challenge.kind === 'school' && question.college === challenge.value) indexes.push(index)
    if (challenge.kind === 'conference' && question.conference === challenge.value) indexes.push(index)
    if (challenge.kind === 'team' && question.team === challenge.value) indexes.push(index)
    return indexes
  }, [])

  if (matchingIndexes.length === 0) return null

  const completedCount = matchingIndexes.reduce((count, index) => {
    const result = results[index]
    const isCorrect = typeof result === 'string' ? result === 'correct' : result?.result === 'correct'
    return isCorrect ? count + 1 : count
  }, 0)

  const introSubtitle = challenge.kind === 'school'
    ? `Go ${matchingIndexes.length}/${matchingIndexes.length} on today’s ${challenge.value} alumni.`
    : challenge.kind === 'conference'
      ? `Go ${matchingIndexes.length}/${matchingIndexes.length} on today’s ${challenge.value} players.`
      : `Go ${matchingIndexes.length}/${matchingIndexes.length} on today’s ${challenge.value} players.`

  return {
    title: challenge.label,
    introSubtitle,
    finishSubtitle: `You got ${completedCount}/${matchingIndexes.length} matching players correct.`,
    progressLabel: `${completedCount} / ${matchingIndexes.length}`,
    isCompleted: completedCount === matchingIndexes.length,
    kind: challenge.kind,
    completedCount,
    targetCount: matchingIndexes.length,
  }
}


export default function DailyGameWrapper({ sport = 'football' }: { sport?: 'football' | 'basketball' }) {
  return (
    <RewardedAdProvider>
      <Suspense fallback={<div className="bg-neutral-950 min-h-screen flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>}>
        <DailyGame sport={sport} />
      </Suspense>
    </RewardedAdProvider>
  )
}

function DailyGame({ sport }: { sport: 'football' | 'basketball' }) {
  const { setHeaderHidden } = useUI()
  const searchParams = useSearchParams()
  const challengerScore = searchParams.get('s')
  const shouldClaimGuest = searchParams.get('claim_guest') === '1'
  const guestIdToClaim = searchParams.get('guest_id')
  const utmSource = searchParams.get('utm_source')
  const utmMedium = searchParams.get('utm_medium')
  const utmCampaign = searchParams.get('utm_campaign')
  const utmContent = searchParams.get('utm_content')
  const schoolCampaign = searchParams.get('school')
  const themeCampaign = searchParams.get('theme') || utmCampaign
  const outreachTarget = searchParams.get('outreach_target')
  const socialPostId = searchParams.get('social_post_id')
  const hasCampaignParams = !!(utmSource || utmMedium || utmCampaign || utmContent || schoolCampaign || themeCampaign || outreachTarget || socialPostId)
  const landedFromShare = utmSource === 'share' || !!challengerScore
  const campaignLanding = buildCampaignLandingCopy({
    school: schoolCampaign,
    themeKey: themeCampaign,
    sport,
  })
  const campaignMetadata = useMemo(() => ({
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    school: schoolCampaign,
    theme: themeCampaign,
    outreach_target: outreachTarget,
    social_post_id: socialPostId,
  }), [outreachTarget, schoolCampaign, socialPostId, themeCampaign, utmCampaign, utmContent, utmMedium, utmSource])
  const requestedChallenge = parseChallengeRequest(
    sport,
    searchParams.get('challenge_kind'),
    searchParams.get('challenge_value'),
    searchParams.get('challenge_label')
  )
  const theme = THEMES[sport]
  const config = GAME_CONFIG[sport]

  const [questions, setQuestions] = useState<DailyQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [gameState, setGameState] = useState<'loading' | 'intro' | 'playing' | 'finished'>('loading')

  // Update header visibility based on game state
  useEffect(() => {
    setHeaderHidden(gameState === 'playing')
    // Reset on unmount
    return () => setHeaderHidden(false)
  }, [gameState, setHeaderHidden])
  const [results, setResults] = useState<ResultEntry[]>([])
  const [potentialPoints, setPotentialPoints] = useState(100)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [isImageReady, setIsImageReady] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [receivedBonus, setReceivedBonus] = useState<number | null>(null)
  const [bonusReason, setBonusReason] = useState<string | null>(null)
  const [lastEarnedPoints, setLastEarnedPoints] = useState<number>(0)
  const [correctOption, setCorrectOption] = useState<string | null>(null)
  const [freezeConsumed, setFreezeConsumed] = useState(false)
  const [recentBestScore, setRecentBestScore] = useState<number | null>(null)
  const [survivalCtaLabel, setSurvivalCtaLabel] = useState('Join Monday Survival')
  const [claimStatus, setClaimStatus] = useState<'idle' | 'claiming' | 'claimed' | 'error'>('idle')
  const [claimSummary, setClaimSummary] = useState<{ claimed: number; upgraded: number; skipped: number } | null>(null)
  const startedTrackedRef = useRef(false)
  const finishedTrackedRef = useRef(false)
  const claimPromptTrackedRef = useRef(false)
  const claimAttemptedRef = useRef(false)
  const sharedLandingTrackedRef = useRef(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (gameState === 'playing' && !isImageReady) {
      const timer = setTimeout(() => {
        console.log("Image load timeout hit - forcing ready state")
        setIsImageReady(true)
      }, 3000) // 3 second timeout
      return () => clearTimeout(timer)
    }
  }, [gameState, currentIndex, isImageReady])

  useEffect(() => {
    const loadGame = async () => {
      try {
        const data = await getDailyGame(sport)
        if (data && data.length > 0) {
          const gameData = data.slice(0, config.rounds)
          setQuestions(gameData)
          const savedScore = localStorage.getItem(`s2s_${sport}_today_score`)
          const savedDate = localStorage.getItem(`s2s_${sport}_last_played_date`)
          const savedResults = localStorage.getItem(`s2s_${sport}_daily_results`)
          const today = getGameDate()

          if (savedScore && savedDate === today) {
            setScore(parseInt(savedScore))
            try {
              setResults(savedResults ? JSON.parse(savedResults) : new Array(gameData.length).fill('pending'))
            } catch (e) {
              setResults(new Array(gameData.length).fill('pending'))
            }
            setGameState('finished')
            setIsSaved(true)
          } else {
            setResults(new Array(gameData.length).fill('pending'))
            setGameState('intro')
            setGameState('intro')
          }
        }
      } catch (err) { console.error(err) }
    }
    loadGame()
  }, [sport, config.rounds])

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) setUser(session.user)
    }
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Auth Handlers
  const handleGoogleLogin = async (nextPath?: string) => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath || window.location.pathname)}`
      }
    })
  }

  const getClaimRedirectPath = () => {
    const guestId = getGuestId()
    const basePath = sport === 'basketball' ? '/daily/basketball' : '/daily'
    const params = new URLSearchParams(searchParams.toString())
    params.set('claim_guest', '1')
    if (guestId) params.set('guest_id', guestId)
    if (score > 0) params.set('s', String(score))
    params.set('utm_source', 'claim_score')
    params.set('utm_medium', utmMedium || 'auth')
    params.set('utm_campaign', utmCampaign || themeCampaign || 'guest_claim')
    params.set('utm_content', utmContent || sport)
    return `${basePath}?${params.toString()}`
  }

  const handleClaimScore = async () => {
    const guestId = getGuestId()
    trackGrowthEvent('claim_started', {
      score,
      ...campaignMetadata,
    }, { guestId, sport })
    await handleGoogleLogin(getClaimRedirectPath())
  }

  // Auto-consume freeze if user missed a day
  useEffect(() => {
    const checkAndConsumeFreeze = async () => {
      if (!user || freezeConsumed || gameState !== 'loading') return

      try {
        const lastPlayedColumn = sport === 'football' ? 'last_played_football_at' : 'last_played_basketball_at'
        const freezesAvailableColumn = sport === 'football' ? 'football_freezes_available' : 'basketball_freezes_available'
        const streakColumn = sport === 'football' ? 'streak_football' : 'streak_basketball'

        // Check last played time and freeze status
        const { data: profile } = await supabase
          .from('profiles')
          .select(`${lastPlayedColumn}, ${freezesAvailableColumn}, ${streakColumn}`)
          .eq('id', user.id)
          .single()

        if (profile) {
          const lastPlayed = (profile as any)[lastPlayedColumn]
          const freezesAvailable = (profile as any)[freezesAvailableColumn] || 0
          const currentStreak = (profile as any)[streakColumn] || 0

          if (lastPlayed && currentStreak > 0) {
            const now = new Date()
            const lastPlayedDate = new Date(lastPlayed)
            const hoursInactive = (now.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60)

            // If inactive > 24h and has freeze, auto-consume it
            if (hoursInactive > 24 && freezesAvailable > 0) {
              const response = await fetch('/api/consume-streak-freeze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, sport })
              })

              if (response.ok) {
                // Show success notification
                console.log(`Streak freeze consumed! ${currentStreak}-day streak preserved.`)
                setFreezeConsumed(true)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking/consuming freeze:', error)
      }
    }

    checkAndConsumeFreeze()
  }, [user, gameState, sport, freezeConsumed, supabase])

  // Check for existing DB result (Cross-device sync)
  useEffect(() => {
    const checkDbResult = async () => {
      if (!user || gameState === 'finished') return

      const today = getGameDate()
      const { data } = await supabase
        .from('daily_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_date', today)
        .eq('sport', sport)
        .single()

      if (data) {
        // Sync to local state
        setScore(data.score)
        setResults(data.results_json || [])
        setGameState('finished')
        setIsSaved(true)

        // Sync to localStorage
        localStorage.setItem(`s2s_${sport}_today_score`, data.score.toString())
        localStorage.setItem(`s2s_${sport}_last_played_date`, today)
        if (data.results_json) {
          localStorage.setItem(`s2s_${sport}_daily_results`, JSON.stringify(data.results_json))
        }
      }
    }

    checkDbResult()
  }, [user, sport, gameState])

  useEffect(() => {
    const getStreak = async () => {
      if (!user) return
      const column = sport === 'basketball' ? 'streak_basketball' : 'streak_football'
      const { data } = await supabase.from('profiles').select(column).eq('id', user.id).single()
      if (data) setStreak((data as any)[column] || 0)
    }
    if (user) getStreak()
    if (isSaved) getStreak()
  }, [user, sport, isSaved])

  useEffect(() => {
    const loadRecentBestScore = async () => {
      if (requestedChallenge?.kind !== 'preferred_sport' || !user) {
        setRecentBestScore(null)
        return
      }

      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data } = await supabase
        .from('daily_results')
        .select('score')
        .eq('user_id', user.id)
        .eq('sport', sport)
        .gte('game_date', since)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle()

      setRecentBestScore(data?.score || null)
    }

    loadRecentBestScore()
  }, [requestedChallenge?.kind, sport, supabase, user])

  useEffect(() => {
    const loadSurvivalCta = async () => {
      try {
        const stats = await getSurvivalStats()
        if (!stats) {
          setSurvivalCtaLabel('Next Survival starts Monday')
          return
        }

        if (stats.isStarted) {
          setSurvivalCtaLabel('Enter Today’s Survival Round')
        } else {
          setSurvivalCtaLabel('Join Monday Survival')
        }
      } catch {
        setSurvivalCtaLabel('Join Monday Survival')
      }
    }

    if (gameState === 'finished') loadSurvivalCta()
  }, [gameState])

  useEffect(() => {
    if (!hasCampaignParams && !landedFromShare) return
    if (sharedLandingTrackedRef.current) return
    sharedLandingTrackedRef.current = true
    const metadata = {
      has_score: !!challengerScore,
      ...campaignMetadata,
    }
    const landingEvent = landedFromShare ? 'shared_link_landed' : (socialPostId || utmMedium === 'social' ? 'social_link_landed' : 'campaign_landed')
    trackGrowthEvent(landingEvent, metadata, { guestId: getGuestId(), sport })
  }, [campaignMetadata, challengerScore, hasCampaignParams, landedFromShare, socialPostId, sport, utmMedium])

  useEffect(() => {
    if (gameState !== 'playing' || startedTrackedRef.current) return
    startedTrackedRef.current = true
    trackGrowthEvent('game_started', {
      ...campaignMetadata,
    }, { guestId: user ? null : getGuestId(), sport })
  }, [campaignMetadata, gameState, sport, user])

  useEffect(() => {
    if (gameState !== 'finished' || finishedTrackedRef.current) return
    finishedTrackedRef.current = true
    trackGrowthEvent('game_finished', {
      score,
      ...campaignMetadata,
    }, { guestId: user ? null : getGuestId(), sport })
  }, [campaignMetadata, gameState, score, sport, user])

  useEffect(() => {
    if (gameState !== 'finished' || user || claimPromptTrackedRef.current) return
    claimPromptTrackedRef.current = true
    trackGrowthEvent('claim_prompt_shown', {
      score,
      ...campaignMetadata,
    }, { guestId: getGuestId(), sport })
  }, [campaignMetadata, gameState, score, sport, user])

  useEffect(() => {
    const claimGuestScores = async () => {
      if (!user || !shouldClaimGuest || !guestIdToClaim || claimAttemptedRef.current) return

      claimAttemptedRef.current = true
      setClaimStatus('claiming')

      try {
        const result = await claimGuestDailyResults(guestIdToClaim)
        setClaimSummary(result)
        setClaimStatus('claimed')
        setIsSaved(true)
        trackGrowthEvent('claim_completed', {
          claimed: result.claimed,
          upgraded: result.upgraded,
          skipped: result.skipped,
          ...campaignMetadata,
        }, { guestId: guestIdToClaim, sport })

        const cleanPath = sport === 'basketball' ? '/daily/basketball' : '/daily'
        window.history.replaceState(null, '', cleanPath)
      } catch (error) {
        console.error('Failed to claim guest scores:', error)
        setClaimStatus('error')
      }
    }

    claimGuestScores()
  }, [campaignMetadata, guestIdToClaim, shouldClaimGuest, sport, user])

  useEffect(() => {
    const saveScore = async () => {
      if (gameState !== 'finished' || isSaved) return

      // SURVIVAL MODE HANDLING
      if (sport.startsWith('survival')) {
        try {
          // Dynamic import to avoid server-action issues in client component if needed, 
          // or just assume it's imported. I need to add the import to the top of file.
          // For now, I'll assume I add the import in a separate step or included here.
          // Just using the logic here.
          const { recoverLegacySurvivalScore } = await import('@/app/actions/survival')
          const result = await recoverLegacySurvivalScore(score)
          if (result?.success) {
            setIsSaved(true)
          } else {
            console.error("Survival save error:", result?.error)
          }
        } catch (e) {
          console.error("Survival save exception:", e)
        }
        return
      }

      // STANDARD DAILY GAME HANDLING
      const todayISO = getGameDate()
      let upsertPayload: any = { score, game_date: todayISO, results_json: results, sport }
      let conflictTarget = user ? 'user_id,game_date,sport' : 'guest_id,game_date,sport'
      if (user) upsertPayload.user_id = user.id
      else upsertPayload.guest_id = getGuestId()
      const { error } = await supabase.from('daily_results').upsert(upsertPayload, { onConflict: conflictTarget })
      if (!error) {
        setIsSaved(true)
        // Update last_played_at timestamp
        if (user) {
          const column = sport === 'football' ? 'last_played_football_at' : 'last_played_basketball_at'
          await supabase.from('profiles').update({ [column]: new Date().toISOString() }).eq('id', user.id)
        }
      } else {
        console.error("Score save error:", error)
        // FALLBACK: If the 3-column constraint doesn't exist, try the 2-column one
        // This handles cases where the migration hasn't been run yet.
        if (error.message?.includes('onConflict')) {
          const backupTarget = user ? 'user_id,game_date' : 'guest_id,game_date'
          const { error: retryError } = await supabase.from('daily_results').upsert(upsertPayload, { onConflict: backupTarget })
          if (!retryError) {
            setIsSaved(true)
          } else {
            console.error("Fallback score save error:", retryError)
          }
        }
      }
    }
    saveScore()
  }, [gameState, user, score, isSaved, results, sport])

  const challengeStatus = buildChallengeStatus(
    requestedChallenge,
    questions,
    results,
    score,
    sport,
    recentBestScore
  )

  useEffect(() => {
    if (!challengeStatus) return

    trackEvent('challenge_shown', {
      kind: challengeStatus.kind,
      sport,
    })
  }, [challengeStatus?.kind, sport])

  useEffect(() => {
    if (gameState !== 'finished' || !challengeStatus?.isCompleted) return

    trackEvent('challenge_completed', {
      kind: challengeStatus.kind,
      sport,
    })
  }, [challengeStatus?.isCompleted, challengeStatus?.kind, gameState, sport])

  // --- RESTORED TIMER LOGIC ---
  useEffect(() => {
    if (gameState !== 'playing' || showResult || !isImageReady) return
    const currentQ = questions[currentIndex]
    const multiplier = getMultiplier(currentQ?.tier || 1, sport)

    // Lose 5 final points per half second (scaled by tier multiplier)
    const decayAmount = 5 / multiplier
    let decayInterval: any

    const startTimer = setTimeout(() => {
      decayInterval = setInterval(() => {
        setPotentialPoints((prev) => (prev <= 10 ? 10 : prev - decayAmount))
      }, 500) // Half-second interval
    }, 1000) // 1 second initial pause

    return () => { clearTimeout(startTimer); if (decayInterval) clearInterval(decayInterval) }
  }, [gameState, showResult, isImageReady, currentIndex, questions, sport])

  const handleGuess = async (option: string) => {
    if (showResult) return
    setSelectedOption(option)
    const currentQ = questions[currentIndex]

    // Verify answer
    let isCorrect = false
    let foundCorrectOption: string | null = null

    if ((currentQ.answer_hash || currentQ.answer_hashes) && currentQ.salt) {
      // Secure mode
      isCorrect = await matchesQuestionAnswer(currentQ, option)

      if (isCorrect) {
        foundCorrectOption = option
      } else {
        // Find the correct option to show the user
        for (const opt of currentQ.options) {
          if (await matchesQuestionAnswer(currentQ, opt)) {
            foundCorrectOption = opt
            break
          }
        }
      }
    } else {
      // Legacy mode
      isCorrect = option === currentQ.correct_answer
      foundCorrectOption = currentQ.correct_answer || null
    }

    setCorrectOption(foundCorrectOption)

    // Calculate new streak (locally, before state update)

    // Calculate new streak (locally, before state update)
    // We only care about consecutive 'correct' up to this point + this one
    let currentStreakCount = 0
    // Check backwards from current index - 1
    for (let i = currentIndex - 1; i >= 0; i--) {
      const res = results[i]
      const isCorrectResult = typeof res === 'string' ? res === 'correct' : res.result === 'correct'
      if (isCorrectResult) currentStreakCount++
      else break
    }
    if (isCorrect) currentStreakCount++
    else currentStreakCount = 0

    let newScore = score
    let pointsEarned = 0
    let bonus = 0

    if (isCorrect) {
      const basePoints = Math.round(potentialPoints * getMultiplier(currentQ.tier || 1, sport) * config.pointScale)

      // BONUS LOGIC
      if (sport === 'football') {
        if (currentStreakCount === 6) { bonus = 50; setBonusReason("6 IN A ROW!") }
        if (currentStreakCount === 10) { bonus = 100; setBonusReason("PERFECT 10!") }
      } else {
        // Basketball (5 rounds)
        if (currentStreakCount === 5) { bonus = 150; setBonusReason("PERFECT 5!") }
      }

      pointsEarned = basePoints + bonus
      newScore += pointsEarned

      setScore(newScore)
      setReceivedBonus(bonus > 0 ? bonus : null)
      setLastEarnedPoints(pointsEarned)
    } else {
      setReceivedBonus(null)
      setBonusReason(null)
      setLastEarnedPoints(0)
    }

    const newResults = [...results]
    newResults[currentIndex] = {
      player_id: currentQ.id,
      result: isCorrect ? 'correct' : 'wrong',
      player_name: safeDecodeName(currentQ.name)
    }
    setResults(newResults)
    setShowResult(true)

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setSelectedOption(null)
        setShowResult(false)
        setPotentialPoints(100)
        setIsImageReady(false)
        setReceivedBonus(null)
        setBonusReason(null)
        setLastEarnedPoints(0)
        setCorrectOption(null)
      } else {
        localStorage.setItem(`s2s_${sport}_today_score`, newScore.toString())
        localStorage.setItem(`s2s_${sport}_last_played_date`, getGameDate())
        localStorage.setItem(`s2s_${sport}_daily_results`, JSON.stringify(newResults))
        setGameState('finished')
      }
    }, 1500)
  }

  const handleShare = async () => {
    trackGrowthEvent('share_started', { score }, { sport })
    const squares = results.map(r => {
      const status = typeof r === 'string' ? r : r.result
      return status === 'correct' ? '🟩' : '🟥'
    }).join('')
    const dateObj = new Date(Date.now() - TIMEZONE_OFFSET_MS)
    const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const rankInfo = getRankTitle(score, sport)
    const streakEmoji = streak > 0 ? ` | 🔥 ${streak}` : ''
    const challengePath = sport === 'basketball' ? '/daily/basketball' : '/daily'
    const shareParams = new URLSearchParams({
      s: String(score),
      utm_source: 'share',
      utm_medium: 'social',
      utm_campaign: themeCampaign || 'daily_challenge',
      utm_content: sport,
    })
    if (schoolCampaign) shareParams.set('school', schoolCampaign)
    if (themeCampaign) shareParams.set('theme', themeCampaign)
    if (outreachTarget) shareParams.set('outreach_target', outreachTarget)
    if (socialPostId) shareParams.set('social_post_id', socialPostId)
    const challengeUrl = `https://playsaturdaytosunday.com${challengePath}?${shareParams.toString()}`
    const text = `Saturday to Sunday (${shortDate})\nScore: ${score.toLocaleString()} (${rankInfo.title})${streakEmoji}\n\n${squares}\n\nCan you beat my score? Challenge me here: 👇\n${challengeUrl}`

    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        alert('Score copied to clipboard! Paste it to challenge your friends.')
      }
      trackGrowthEvent('share_completed', {
        score,
        utm_campaign: themeCampaign || 'daily_challenge',
        utm_content: sport,
        school: schoolCampaign,
        theme: themeCampaign,
        outreach_target: outreachTarget,
        social_post_id: socialPostId,
      }, { sport })
    } catch (err: any) {
      // If user just cancelled the share sheet, do nothing
      if (err.name === 'AbortError') return;

      try {
        await navigator.clipboard.writeText(text)
        alert('Score copied to clipboard! Paste it to challenge your friends.')
        trackGrowthEvent('share_completed', {
          score,
          fallback: true,
          utm_campaign: themeCampaign || 'daily_challenge',
          utm_content: sport,
          school: schoolCampaign,
          theme: themeCampaign,
          outreach_target: outreachTarget,
          social_post_id: socialPostId,
        }, { sport })
      } catch (clipboardErr) {
        console.error('Failed to copy to clipboard', clipboardErr)
      }
    }
  }

  if (gameState === 'loading') return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading...</div>

  if (gameState === 'intro') return (
    <div className="h-[100dvh] bg-neutral-950 overflow-y-auto overflow-x-hidden relative">
      <IntroScreen
        onStart={() => setGameState('playing')}
        challengerScore={challengerScore}
        sport={sport}
        challengeTitle={challengeStatus?.title || null}
        challengeSubtitle={challengeStatus?.introSubtitle || null}
        campaignBadge={campaignLanding?.badge || null}
        campaignTitle={campaignLanding?.title || null}
        campaignSubtitle={campaignLanding?.subtitle || null}
      />
    </div>
  )

  if (gameState === 'finished') {
    const rankInfo = getRankTitle(score, sport)
    return (
      <div className="min-h-[100dvh] bg-neutral-950 text-white flex flex-col items-center justify-start p-4 space-y-4 animate-in fade-in duration-500 relative overflow-y-auto">
        <Link href="/" className="absolute top-4 left-4 z-20">
          <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-white rounded-full"><Home className="w-6 h-6" /></Button>
        </Link>

        <div className="text-center space-y-2 mb-2 mt-8">
          <Trophy className={`w-16 h-16 ${theme.primary} mx-auto animate-bounce mb-2`} />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Daily Complete</h1>
        </div>

        <Card className={`w-full max-w-md ${theme.cardBg} border-neutral-800 shadow-2xl relative overflow-hidden shrink-0`}>
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-6 relative">

            {/* RANK BADGE (Top Left) - Only show after save for rank accuracy */}
            {isSaved && (
              <div className="absolute top-6 left-6">
                <LiveRankDisplay key={`${sport}-${score}`} score={score} sport={sport} />
              </div>
            )}

            {/* CENTERED SCORE AND TITLE */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="flex flex-col items-center">
                <span className="text-neutral-500 text-[10px] uppercase tracking-[0.15em] font-black mb-1">Final Score</span>
                <div className={`text-6xl font-black ${theme.primary} font-mono tracking-tighter leading-none`}>
                  {score}<span className="text-2xl text-neutral-600">/{config.maxScore}</span>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-black/40 ${theme.primary} ${theme.borderPrimary} border-opacity-30 shadow-lg mt-2`}>
                <rankInfo.icon className="w-4 h-4 fill-current" />
                <span className="text-xs font-black uppercase tracking-widest">{rankInfo.title}</span>
              </div>
            </div>

            <div className="flex justify-center gap-1 mt-4">
              {results.map((r, i) => {
                const isCorrect = typeof r === 'string' ? r === 'correct' : r.result === 'correct'
                const isWrong = typeof r === 'string' ? r === 'wrong' : r.result === 'wrong'
                return (
                  <div key={i} className={`w-6 h-6 rounded-sm ${isCorrect ? 'bg-[#00ff80]' : isWrong ? 'bg-red-500' : 'bg-neutral-800'}`} />
                )
              })}
            </div>

              {challengeStatus && (
                <div className={`rounded-2xl border p-4 text-left ${challengeStatus.isCompleted ? 'border-[#00ff80]/40 bg-[#00ff80]/10' : 'border-neutral-800 bg-black/30'}`}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${challengeStatus.isCompleted ? 'bg-[#00ff80]/15 text-[#00ff80]' : 'bg-neutral-900 text-neutral-400'}`}>
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Side Quest</p>
                      <h3 className="text-sm font-black uppercase tracking-tight text-white">{challengeStatus.title}</h3>
                    </div>
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-widest ${challengeStatus.isCompleted ? 'text-[#00ff80]' : 'text-neutral-500'}`}>
                    {challengeStatus.isCompleted ? 'Complete' : 'Missed'}
                  </div>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed">{challengeStatus.finishSubtitle}</p>
                <p className={`mt-2 text-xs font-black uppercase tracking-widest ${challengeStatus.isCompleted ? theme.primary : 'text-neutral-500'}`}>
                  {challengeStatus.progressLabel}
                </p>
                </div>
              )}

              <PostGameImageAudit
                questions={questions}
                sport={sport}
                gameMode="daily"
                gameDate={getGameDate()}
              />

            <div className="flex flex-col gap-3 mt-6 w-full">
              {!user && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Claim This Run</p>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">Save your score and streak</h3>
                    <p className="mt-1 text-sm text-neutral-400 leading-relaxed">
                      Keep today’s result, show up on the leaderboard, and carry your history across devices.
                    </p>
                  </div>
                  <Button
                    onClick={handleClaimScore}
                    className="w-full h-12 text-md font-black bg-white text-black hover:bg-neutral-200 shadow-xl border border-white transition-all active:scale-95 px-2"
                  >
                    Claim Score with Google
                  </Button>
                </div>
              )}

              {user && claimStatus !== 'idle' && (
                <div className={`rounded-2xl border p-4 text-left ${claimStatus === 'error' ? 'border-red-500/30 bg-red-500/10' : 'border-[#00ff80]/30 bg-[#00ff80]/10'}`}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Score Claim</p>
                  <p className="text-sm font-bold text-white">
                    {claimStatus === 'claiming' && 'Claiming your guest scores...'}
                    {claimStatus === 'claimed' && `Claimed ${claimSummary?.claimed || 0} score${claimSummary?.claimed === 1 ? '' : 's'}${claimSummary?.upgraded ? ` and upgraded ${claimSummary.upgraded}` : ''}.`}
                    {claimStatus === 'error' && 'We could not claim that score. Your local result is still safe.'}
                  </p>
                </div>
              )}

              <PushNotificationManager hideOnSubscribed promptContext="post_game" sport={sport} />

              <Button onClick={handleShare} className={`w-full h-12 text-lg font-bold ${theme.bgPrimary} text-black hover:opacity-90 shadow-lg`}>
                <Share2 className="mr-2 w-5 h-5" /> Challenge Your Friends
              </Button>

              <div className="relative w-full group">
                {sport === 'football' && (
                  <div className="absolute -top-2 -right-1 z-10 bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm tracking-widest shadow-md rotate-3 group-hover:rotate-6 transition-transform">
                    New
                  </div>
                )}
                <Button asChild className={`w-full h-14 text-lg font-bold tracking-wide shadow-xl transition-all hover:scale-[1.01] active:scale-95 border-0 ${sport === 'football' ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-[#00ff80] border border-[#00ff80]/30'}`}>
                  <Link href={sport === 'football' ? '/daily/basketball' : '/daily'} className="flex items-center justify-center gap-2">
                    {sport === 'football' ? (
                      <>
                        <span>Play Basketball Mode</span> <Dribbble className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        <span>Play Football Mode</span> <Star className="w-5 h-5" />
                      </>
                    )}
                  </Link>
                </Button>
              </div>

              <Button
                asChild
                className="w-full h-12 text-sm font-black tracking-widest uppercase bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white shadow-xl border border-red-400/30"
              >
                <Link href="/survival" className="flex items-center justify-center gap-2">
                  <Skull className="w-4 h-4" />
                  <span>{survivalCtaLabel}</span>
                </Link>
              </Button>

              <div className="w-full">
                <InstallPWA mode="button" />
              </div>
            </div>
          </CardContent>
        </Card>

        {isSaved && (
          <div className="w-full max-w-md pb-8">
            <Leaderboard currentUserId={user?.id} defaultSport={sport} />
          </div>
        )}

        <InstallPWA mode="banner" />
      </div>
    )
  }

  const q = questions[currentIndex]
  if (!q) return null

  return (
    <div className="h-[100dvh] bg-neutral-950 text-white flex flex-col font-sans overflow-hidden">
      <div className="w-full max-w-md mx-auto pt-2 px-2 shrink-0 z-50">
        <div className={`flex items-center justify-between ${theme.cardBg} backdrop-blur-md rounded-full px-4 py-2 border border-white/5 shadow-2xl`}>
          {currentIndex === 0 ? (
            <Link href="/"><button className="text-neutral-400 hover:text-white"><Home className="w-4 h-4" /></button></Link>
          ) : (
            <div className="w-4" />
          )}
          <div className="flex items-center gap-2">
            <div className={`text-lg font-black ${theme.primary} tabular-nums leading-none`}>{score}</div>
          </div>
          <div className="text-[10px] font-bold text-neutral-500 tracking-widest"><span className="text-white">{currentIndex + 1}</span>/{config.rounds}</div>
        </div>
        <div className="mt-2 px-1">
          <Progress value={((currentIndex) / config.rounds) * 100} className={`h-1 bg-neutral-800 rounded-full [&>div]:${theme.bgPrimary}`} />
        </div>
      </div>

      <main className="flex-1 w-full max-w-md mx-auto p-2 pb-4 flex flex-col gap-2 overflow-hidden h-full">
        <div className={`flex-1 relative ${theme.cardBg} rounded-xl overflow-hidden border ${theme.borderPrimary} border-opacity-20 shadow-2xl min-h-0`}>
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
            <div className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-lg bg-white text-black flex items-center gap-1">
              <theme.icon className="w-3 h-3 text-black" /> {theme.label}
            </div>
            <div className={`px-3 py-1 rounded-full font-black text-sm shadow-xl transition-all flex items-center gap-2 ${showResult ? ((correctOption && selectedOption === correctOption) || selectedOption === q.correct_answer ? `bg-[#00ff80] text-black` : 'bg-red-500 text-white') : 'bg-white text-black'}`}>
              {showResult ? ((correctOption && selectedOption === correctOption) || selectedOption === q.correct_answer ? (
                <>
                  <span>+{lastEarnedPoints}</span>
                  {receivedBonus && <span className="text-[10px] bg-black text-[#00ff80] px-1.5 rounded animate-pulse whitespace-nowrap">{bonusReason}</span>}
                </>
              ) : '+0') : `+${Math.round(potentialPoints * getMultiplier(q.tier || 1, sport) * config.pointScale)}`}
            </div>
          </div>
          {q.image_url && <Image src={q.image_url} alt="Player" fill className={`object-cover transition-opacity duration-500 ${isImageReady ? 'opacity-100' : 'opacity-0'}`} onLoadingComplete={() => setIsImageReady(true)} priority={true} />}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 pt-16 z-10">
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{safeDecodeName(q.name)}</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 shrink-0 h-32 md:h-40">
          {q.options.map((opt: string) => {
            let btnClass = `bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800`
            if (showResult) {
              const isCorrectOpt = correctOption ? opt === correctOption : opt === q.correct_answer
              if (isCorrectOpt) btnClass = `bg-[#00ff80] text-black ring-2 ring-[#00ff80]`
              else if (opt === selectedOption) btnClass = "bg-red-500 text-white"
              else btnClass = "bg-neutral-950 text-neutral-600 opacity-30"
            }
            return (<Button key={opt} onClick={() => handleGuess(opt)} disabled={showResult || !isImageReady} className={`h-full text-xs md:text-sm font-bold uppercase transition-all ${btnClass}`}> {cleanText(opt)} </Button>)
          })}
        </div>
      </main>
    </div>
  )
}
