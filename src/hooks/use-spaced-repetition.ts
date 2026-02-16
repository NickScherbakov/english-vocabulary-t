import { useCallback } from 'react'
import { useKV } from '@github/spark/hooks'

export interface WordSRData {
  interval: number       // days until next review
  ease: number           // ease factor (2.5 default, min 1.3)
  repetitions: number    // successful reviews in a row
  nextReview: number     // timestamp (ms) of next scheduled review
  lastReview: number     // timestamp (ms) of last review
  totalReviews: number   // lifetime review count
  lapses: number         // times forgotten (quality < 3)
}

interface SRStore {
  [word: string]: WordSRData
}

// SM-2 quality ratings
export const SR_QUALITY = {
  AGAIN: 0,   // Complete blackout, forgot
  HARD: 3,    // Recalled with serious difficulty
  GOOD: 4,    // Recalled with some hesitation
  EASY: 5,    // Perfect, instant recall
} as const

export type SRQuality = (typeof SR_QUALITY)[keyof typeof SR_QUALITY]

const DAY_MS = 24 * 60 * 60 * 1000

function computeSM2(data: WordSRData, quality: SRQuality): WordSRData {
  const result = { ...data }
  result.totalReviews++
  result.lastReview = Date.now()

  if (quality >= 3) {
    // Successful recall
    result.repetitions++
    if (result.repetitions === 1) {
      result.interval = 1
    } else if (result.repetitions === 2) {
      result.interval = 6
    } else {
      result.interval = Math.round(result.interval * result.ease)
    }

    // Adjust ease factor
    result.ease = Math.max(
      1.3,
      result.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )
  } else {
    // Failed recall — lapse
    result.repetitions = 0
    result.interval = 0 // Show again this session
    result.lapses++
    // Ease doesn't change on lapse (SM-2 spec)
  }

  // Schedule next review
  if (result.interval === 0) {
    // Due again in 10 minutes (same session)
    result.nextReview = Date.now() + 10 * 60 * 1000
  } else {
    result.nextReview = Date.now() + result.interval * DAY_MS
  }

  return result
}

function newWordData(): WordSRData {
  return {
    interval: 0,
    ease: 2.5,
    repetitions: 0,
    nextReview: 0,
    lastReview: 0,
    totalReviews: 0,
    lapses: 0,
  }
}

export function useSpacedRepetition() {
  const [srData, setSrData] = useKV<SRStore>('sr-data', {})

  const reviewWord = useCallback(
    (word: string, quality: SRQuality) => {
      setSrData((current = {}) => {
        const existing = current[word] || newWordData()
        const updated = computeSM2(existing, quality)
        return { ...current, [word]: updated }
      })
    },
    [setSrData]
  )

  const getDueWords = useCallback(
    (words: string[]): string[] => {
      const now = Date.now()
      const data = srData || {}
      return words.filter((w) => {
        const d = data[w]
        if (!d) return false
        return d.nextReview <= now
      })
    },
    [srData]
  )

  const getNewWords = useCallback(
    (words: string[]): string[] => {
      const data = srData || {}
      return words.filter((w) => !data[w])
    },
    [srData]
  )

  const getWordStatus = useCallback(
    (word: string): 'new' | 'due' | 'learning' | 'mastered' => {
      const data = (srData || {})[word]
      if (!data) return 'new'
      if (data.nextReview <= Date.now()) return 'due'
      if (data.interval >= 21) return 'mastered'
      return 'learning'
    },
    [srData]
  )

  const getWordData = useCallback(
    (word: string): WordSRData | null => {
      return (srData || {})[word] || null
    },
    [srData]
  )

  const getStats = useCallback(
    (words: string[]) => {
      const data = srData || {}
      const now = Date.now()
      let due = 0
      let newCount = 0
      let learning = 0
      let mastered = 0
      let totalReviews = 0
      let totalLapses = 0

      for (const w of words) {
        const d = data[w]
        if (!d) {
          newCount++
        } else {
          totalReviews += d.totalReviews
          totalLapses += d.lapses
          if (d.nextReview <= now) due++
          else if (d.interval >= 21) mastered++
          else learning++
        }
      }

      return { due, new: newCount, learning, mastered, totalReviews, totalLapses }
    },
    [srData]
  )

  // Build a smart study queue: due words first, then new words
  const getStudyQueue = useCallback(
    (words: string[], maxNew: number = 20): string[] => {
      const data = srData || {}
      const now = Date.now()
      const dueWords: { word: string; nextReview: number }[] = []
      const newWords: string[] = []

      for (const w of words) {
        const d = data[w]
        if (!d) {
          newWords.push(w)
        } else if (d.nextReview <= now) {
          dueWords.push({ word: w, nextReview: d.nextReview })
        }
      }

      // Sort due words: most overdue first
      dueWords.sort((a, b) => a.nextReview - b.nextReview)

      const queue = dueWords.map((d) => d.word)
      // Add limited new words
      queue.push(...newWords.slice(0, maxNew))

      return queue
    },
    [srData]
  )

  return {
    srData: srData || {},
    reviewWord,
    getDueWords,
    getNewWords,
    getWordStatus,
    getWordData,
    getStats,
    getStudyQueue,
  }
}
