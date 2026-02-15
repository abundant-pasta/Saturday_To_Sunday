/**
 * Hashes an answer with a salt using SHA-256.
 * This is used to obscure the correct answer on the client side while allowing verification.
 * 
 * @param answer The answer string to hash (will be normalized)
 * @param salt The salt string
 * @returns The hex string of the hash
 */
export async function hashAnswer(answer: string, salt: string): Promise<string> {
    const normalized = answer.trim().toLowerCase()
    const data = new TextEncoder().encode(normalized + salt)

    // Use Web Crypto API (Standard in browsers and modern Node.js)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    // Fallback for older Node.js environments (if needed, though Next.js usually has global crypto)
    // Dynamic import to avoid bundling issues on client
    try {
        const { createHash } = await import('node:crypto')
        return createHash('sha256').update(normalized + salt).digest('hex')
    } catch (e) {
        console.error('Crypto API not available', e)
        return ''
    }
}

/**
 * Generates a random salt string.
 */
export function generateSalt(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    return Math.random().toString(36).substring(2, 15)
}
