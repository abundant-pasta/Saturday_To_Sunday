/**
 * Global Constants for Saturday to Sunday
 */

// Timezone offset (CST = UTC-6)
export const TIMEZONE_OFFSET_MS = 6 * 60 * 60 * 1000

// Player selection cooldown period
export const PLAYER_COOLDOWN_DAYS = 45

// Tier multipliers for scoring
export const TIER_MULTIPLIERS = {
  football: {
    1: 1.0,  // Easy
    2: 1.5,  // Medium
    3: 2.0,  // Hard
  },
  basketball: {
    1: 1.0,  // Easy
    2: 1.5,  // Medium
    3: 1.75, // Hard (reduced from 2.0 to make max score 1350)
  },
} as const

// Game configurations
export const GAME_CONFIG = {
  football: {
    rounds: 10,
    maxScore: 1350,
    pointScale: 1.0,
    distribution: [5, 3, 2], // Easy, Medium, Hard
  },
  basketball: {
    rounds: 5,
    maxScore: 1350,
    pointScale: 2.0,
    distribution: [2, 2, 1], // Easy, Medium, Hard
  },
} as const

export type Sport = 'football' | 'basketball'
