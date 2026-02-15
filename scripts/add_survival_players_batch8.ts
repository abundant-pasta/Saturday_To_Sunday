import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const players = [
    { name: 'Kevin Pittsnogle', college: 'West Virginia', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Mike Gansey', college: 'West Virginia', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Lee Humphrey', college: 'Florida', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Taurean Green', college: 'Florida', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Chris Richard', college: 'Florida', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Ali Farokhmanesh', college: 'Northern Iowa', team: 'Colorado State (Coach)', position: 'G', tier: 3 },
    { name: 'Thomas Walkup', college: 'Stephen F. Austin', team: 'Olympiacos', position: 'G', tier: 3 },
    { name: 'Doran Lamb', college: 'Kentucky', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Darius Miller', college: 'Kentucky', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Marquis Teague', college: 'Kentucky', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Marshall Henderson', college: 'Ole Miss', team: 'Ole Miss (Coach)', position: 'G', tier: 3 },
    { name: 'Robbie Hummel', college: 'Purdue', team: 'Retired', position: 'F', tier: 2 },
    { name: 'E\'Twaun Moore', college: 'Purdue', team: 'Retired', position: 'G', tier: 2 },
    { name: 'JaJuan Johnson', college: 'Purdue', team: 'Brindisi', position: 'F', tier: 2 },
    { name: 'Kalin Lucas', college: 'Michigan State', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Durrell Summers', college: 'Michigan State', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Raymar Morgan', college: 'Michigan State', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Jon Scheyer', college: 'Duke', team: 'Duke (Coach)', position: 'G', tier: 2 },
    { name: 'Nolan Smith', college: 'Duke', team: 'Louisville (Coach)', position: 'G', tier: 2 },
    { name: 'Kyle Singler', college: 'Duke', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Jacob Pullen', college: 'Kansas State', team: 'Napoli', position: 'G', tier: 3 },
    { name: 'Denis Clemente', college: 'Kansas State', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Sherron Collins', college: 'Kansas', team: 'Free State HS (Coach)', position: 'G', tier: 2 },
    { name: 'Tyshawn Taylor', college: 'Kansas', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Cole Aldrich', college: 'Kansas', team: 'Retired', position: 'C', tier: 2 }
]

async function addPlayers() {
    console.log(`Processing ${players.length} players for Survival Mode (Batch 8)...`)
    let added = 0
    let updated = 0

    for (const p of players) {
        const { data: existing } = await supabase.from('players').select('*').eq('name', p.name).single()

        if (existing) {
            if (existing.game_mode !== 'both' && existing.game_mode !== 'survival') {
                await supabase.from('players').update({ game_mode: 'both' }).eq('id', existing.id)
                updated++
            }
        } else {
            await supabase.from('players').insert({ ...p, game_mode: 'survival' })
            added++
        }
    }

    console.log(`Batch 8 Complete: Added ${added}, Updated (to 'both') ${updated}`)
}

addPlayers()
