// ─── Word pools for anonymous username generation ──────────────────────────
// Water/washroom-themed to match the app's personality

const ADJECTIVES = [
  'Silent', 'Swift', 'Sneaky', 'Urgent', 'Brave', 'Clever', 'Dashing',
  'Quiet', 'Bold', 'Sly', 'Nimble', 'Hasty', 'Stealth', 'Rapid', 'Crisp',
  'Lucky', 'Calm', 'Shady', 'Proud', 'Sharp',
]

const NOUNS = [
  'Runner', 'Dasher', 'Hopper', 'Sprinter', 'Wanderer', 'Explorer',
  'Seeker', 'Walker', 'Rusher', 'Drifter', 'Pacer', 'Strider',
  'Rambler', 'Roamer', 'Prowler',
]

/**
 * Generates `count` distinct random username suggestions in the format
 * `AdjectiveNoun##` (e.g. "SwiftDasher42").
 */
export function generateUsernameSuggestions(count: number): string[] {
  const results: string[] = []
  let attempts = 0
  while (results.length < count && attempts < count * 20) {
    attempts++
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
    const num = Math.floor(Math.random() * 99) + 1
    const suggestion = `${adj}${noun}${num}`
    if (!results.includes(suggestion)) results.push(suggestion)
  }
  return results
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username)
}

/**
 * Returns a human-readable error string, or `null` if the username is valid.
 */
export function getUsernameError(username: string): string | null {
  if (username.length < 3) return 'Must be at least 3 characters'
  if (username.length > 20) return 'Must be 20 characters or fewer'
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Letters, numbers, and underscores only'
  return null
}
