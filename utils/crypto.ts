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

    // In Edge Runtimes or modern Node where crypto global is available but might need different access
    // This is usually covered by the above.
    // If we are in a purely server environment without Web Crypto global (very old Node), we might fail.
    // But Next.js Edge and Node 18+ have global crypto.
    return ''
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
