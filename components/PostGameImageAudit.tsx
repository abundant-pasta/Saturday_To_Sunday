'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Check, ImageOff, Send, X } from 'lucide-react'
import { submitImageAuditReports } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { trackEvent } from '@/lib/analytics'

type QuestionLike = {
  id: number | string
  name: string
  image_url?: string | null
  sport?: string | null
}

type ReportSelection = {
  playerId: number | string
  playerName: string
  imageUrl?: string | null
  issueType: 'bad_photo'
}

function decodeName(value: string) {
  try {
    return atob(value)
  } catch {
    return value
  }
}

function getGuestId() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('s2s_guest_id')
}

export default function PostGameImageAudit({
  questions,
  sport,
  gameMode = 'daily',
  gameDate,
}: {
  questions: QuestionLike[]
  sport: string
  gameMode?: 'daily' | 'survival'
  gameDate?: string | null
}) {
  const [mode, setMode] = useState<'prompt' | 'reporting' | 'dismissed' | 'submitted'>('prompt')
  const [selections, setSelections] = useState<Record<string, ReportSelection>>({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submissionResult, setSubmissionResult] = useState<{ submitted: number; skippedDuplicates?: number } | null>(null)

  const reportableQuestions = useMemo(() => {
    return questions
      .filter((question) => question?.id != null)
      .map((question) => ({
        ...question,
        decodedName: decodeName(String(question.name || 'Unknown player')),
      }))
  }, [questions])

  const selectedReports = Object.values(selections)

  if (reportableQuestions.length === 0 || mode === 'dismissed') return null

  if (mode === 'submitted') {
    return (
      <div className="rounded-lg border border-[#00ff80]/30 bg-[#00ff80]/10 p-3 text-left">
        <div className="flex items-center gap-2 text-[#00ff80]">
          <Check className="h-4 w-4" />
          <p className="text-xs font-black uppercase tracking-widest">Image report sent</p>
        </div>
        <p className="mt-1 text-xs text-neutral-300">
          {submissionResult?.submitted === 0
            ? 'Thanks. This player is already in the admin review queue.'
            : 'Thanks. This is in the admin review queue.'}
        </p>
      </div>
    )
  }

  const toggleBadPhoto = (question: (typeof reportableQuestions)[number]) => {
    const key = String(question.id)
    setSelections((current) => {
      if (current[key]) {
        const next = { ...current }
        delete next[key]
        return next
      }

      return {
        ...current,
        [key]: {
          playerId: question.id,
          playerName: question.decodedName,
          imageUrl: question.image_url || null,
          issueType: 'bad_photo',
        },
      }
    })
  }

  const submitReports = async () => {
    if (selectedReports.length === 0) return
    setSubmitting(true)
    setError(null)

    try {
      const result = await submitImageAuditReports({
        reports: selectedReports,
        sport,
        gameMode,
        gameDate,
        guestId: getGuestId(),
        notes,
      })

      trackEvent('image_audit_reported', {
        game_mode: gameMode,
        report_count: result.submitted,
        skipped_duplicate_count: result.skippedDuplicates || 0,
      })

      setSubmissionResult(result)
      setMode('submitted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit image report')
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'prompt') {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-left">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Image Check</p>
            <p className="text-sm font-black text-white">Were any photos bad?</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMode('dismissed')}
              className="h-9 px-3 text-xs font-black uppercase text-neutral-400 hover:text-white"
            >
              No
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setMode('reporting')}
              className="h-9 bg-white px-3 text-xs font-black uppercase text-black hover:bg-neutral-200"
            >
              Yes
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-white/10 bg-white/[0.04] text-left">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Image Report</p>
            <h3 className="text-sm font-black text-white">Tap any bad photo</h3>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setMode('prompt')}
            className="h-8 w-8 text-neutral-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {reportableQuestions.map((question) => {
            const selected = !!selections[String(question.id)]

            return (
              <button
                key={String(question.id)}
                type="button"
                onClick={() => toggleBadPhoto(question)}
                className={`w-full rounded-lg border p-2 text-left transition-colors ${
                  selected
                    ? 'border-amber-400 bg-amber-400/15'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-900">
                    {question.image_url ? (
                      <Image
                        src={question.image_url}
                        alt={question.decodedName}
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                    ) : (
                      <ImageOff className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-neutral-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{question.decodedName}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                      {question.sport || sport}
                    </p>
                  </div>
                  <div className={`ml-auto shrink-0 rounded-md px-3 py-1.5 text-[10px] font-black uppercase ${
                    selected ? 'bg-amber-400 text-black' : 'bg-neutral-900 text-neutral-500'
                  }`}>
                    {selected ? 'Bad' : 'Mark Bad'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional note..."
          maxLength={500}
          className="min-h-16 w-full rounded-md border border-white/10 bg-black/40 p-2 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-white/30"
        />

        {error && <p className="text-xs font-bold text-red-400">{error}</p>}

        <Button
          type="button"
          onClick={submitReports}
          disabled={selectedReports.length === 0 || submitting}
          className="h-11 w-full bg-amber-500 text-sm font-black uppercase text-black hover:bg-amber-400 disabled:opacity-50"
        >
          <Send className="mr-2 h-4 w-4" />
          {submitting ? 'Sending...' : `Send ${selectedReports.length || ''} Report${selectedReports.length === 1 ? '' : 's'}`}
        </Button>
      </CardContent>
    </Card>
  )
}
