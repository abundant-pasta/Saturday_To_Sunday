import { getSimilarDistractors } from '@/lib/conferences'
import { generateSalt, hashAnswer } from '@/utils/crypto'

export type SportMode = 'basketball' | 'football' | 'mixed'

export const BLOCKED_IMAGE_STATUSES = ['spoiler', 'wrong_person', 'missing'] as const

type PlayerAnswerFields = {
  college?: string | null
  accepted_colleges?: string[] | null
}

export function normalizeCollege(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function getAcceptedCollegeAnswers(player: PlayerAnswerFields) {
  const answers = [player.college, ...(player.accepted_colleges || [])]
    .filter((college): college is string => typeof college === 'string' && college.trim().length > 0)
    .map(normalizeCollege)

  return Array.from(new Set(answers))
}

export function getTransferSafeDistractors(player: PlayerAnswerFields, collegeList: string[]) {
  const accepted = new Set(getAcceptedCollegeAnswers(player).map((college) => college.toLowerCase()))
  const eligibleColleges = collegeList.filter((college) => !accepted.has(normalizeCollege(college).toLowerCase()))
  return getSimilarDistractors(player.college || '', eligibleColleges)
}

export async function buildAnswerSecurity(answers: string[]) {
  const salt = generateSalt()
  const answerHashes = await Promise.all(answers.map((answer) => hashAnswer(answer, salt)))

  return {
    salt,
    answer_hash: answerHashes[0],
    answer_hashes: answerHashes,
  }
}

export async function matchesQuestionAnswer(question: any, answer: string) {
  if (question.correct_answer) {
    const acceptedAnswers = getAcceptedCollegeAnswers({
      college: question.correct_answer,
      accepted_colleges: Array.isArray(question.accepted_colleges) ? question.accepted_colleges : [],
    })
    return acceptedAnswers.some((college) => normalizeCollege(college).toLowerCase() === normalizeCollege(answer).toLowerCase())
  }
  if (!question.salt) return false

  const answerHashes = Array.isArray(question.answer_hashes)
    ? question.answer_hashes
    : question.answer_hash
      ? [question.answer_hash]
      : []

  if (answerHashes.length === 0) return false

  const guessHash = await hashAnswer(answer, question.salt)
  return answerHashes.includes(guessHash)
}

export function getSurvivalSportKey(sportMode?: string | null) {
  const mode = sportMode === 'football' || sportMode === 'mixed' ? sportMode : 'basketball'
  return `survival_${mode}`
}

export function getSurvivalModeLabel(sportMode?: string | null) {
  if (sportMode === 'football') return 'Football Gauntlet'
  if (sportMode === 'mixed') return 'Mixed Gauntlet'
  return 'Basketball Gauntlet'
}

export function getRotatingSurvivalSportMode(startDate: Date): SportMode {
  const rotation: SportMode[] = ['basketball', 'football', 'mixed']
  const weekIndex = Math.floor(startDate.getTime() / (7 * 24 * 60 * 60 * 1000))
  return rotation[weekIndex % rotation.length]
}
