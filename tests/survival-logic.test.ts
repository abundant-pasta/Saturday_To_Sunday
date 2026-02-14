import { strict as assert } from 'assert'

// Mock Types
interface Participant {
    id: string
    score: number
    submitted_at: number // timestamp
    status: string
}

// Logic Function (Mirrors Edge Function implementation)
function eliminate(participants: Participant[]): string[] {
    // Sort: Score ASC (Lower is worse), Timestamp DESC (Later is worse)
    // We want the WORST players at the beginning of the array.
    const sorted = [...participants].sort((a, b) => {
        if (a.score !== b.score) {
            return a.score - b.score // ASC
        }
        return b.submitted_at - a.submitted_at // DESC
    })

    const count = participants.length
    const eliminateCount = Math.ceil(count * 0.25)

    const victims = sorted.slice(0, eliminateCount)
    return victims.map(v => v.id)
}

async function runTests() {
    console.log('Running Survival Logic Tests...')

    // Test 1: Basic 40 players, clear cut scores
    const players40 = Array.from({ length: 40 }, (_, i) => ({
        id: `p-${i + 1}`,
        score: i + 1, // Scores 1 to 40
        submitted_at: 1000,
        status: 'active'
    })).sort(() => Math.random() - 0.5) // Shuffle input to ensure sort works

    const victims1 = eliminate(players40)

    // Expected: 25% of 40 = 10 eliminated.
    // Lowest scores are 1,2,3,4,5,6,7,8,9,10.
    // IDs p-1 to p-10.

    console.log(`Test 1: 40 Players. Eliminated count: ${victims1.length}`)
    assert.equal(victims1.length, 10, 'Should eliminate exactly 10 players')

    const expectedIds = Array.from({ length: 10 }, (_, i) => `p-${i + 1}`)
    const extractedIds = victims1.sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))

    assert.deepEqual(extractedIds, expectedIds, 'Lowest 10 scores should be eliminated')
    console.log('Test 1 (Basic 40 Players): PASSED')

    // Test 2: Tie Break Logic
    // Scenario: Cutoff falls in the middle of a tie.
    // 8 players. Elim count = 2.
    // Scores: 4 players with 10, 4 players with 20.
    // Tie at score 10. We need to cut 2 of the 4 who have score 10.
    // Rule: "Prioritize earlier timestamp" -> Earlier is SAFE. Later is ELIMINATED.

    const playersTie = [
        { id: 'A', score: 10, submitted_at: 100 }, // Earliest (Safe)
        { id: 'B', score: 10, submitted_at: 200 }, // Safe
        { id: 'C', score: 10, submitted_at: 300 }, // Later (Elim?)
        { id: 'D', score: 10, submitted_at: 400 }, // Latest (Elim!)
        { id: 'E', score: 20, submitted_at: 100 },
        { id: 'F', score: 20, submitted_at: 100 },
        { id: 'G', score: 20, submitted_at: 100 },
        { id: 'H', score: 20, submitted_at: 100 },
    ]

    const victimsTie = eliminate(playersTie)
    console.log(`Test 2: Tie Break. Eliminated: ${victimsTie.join(', ')}`)

    assert.equal(victimsTie.length, 2, 'Should eliminate 2 players')

    // D is latest (400), should be eliminated first.
    // C is next latest (300), should be eliminated second.
    // A (100) and B (200) should be safe.

    assert.ok(victimsTie.includes('D'), 'D (latest) must be eliminated')
    assert.ok(victimsTie.includes('C'), 'C (2nd latest) must be eliminated')
    assert.ok(!victimsTie.includes('A'), 'A (earliest) must be safe')
    assert.ok(!victimsTie.includes('B'), 'B (2nd earliest) must be safe')

    console.log('Test 2 (Tie Break): PASSED')

    console.log('ALL TESTS PASSED ✅')
}

runTests().catch(e => {
    console.error('TEST FAILED ❌', e)
    process.exit(1)
})
