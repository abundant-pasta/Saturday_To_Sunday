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
    { name: 'Carmelo Anthony', college: 'Syracuse', team: 'Retired', position: 'F', tier: 1 },
    { name: 'Dwyane Wade', college: 'Marquette', team: 'Retired', position: 'G', tier: 1 },
    { name: 'Chris Bosh', college: 'Georgia Tech', team: 'Retired', position: 'F', tier: 1 },
    { name: 'Emeka Okafor', college: 'UConn', team: 'Retired', position: 'C', tier: 2 },
    { name: 'Ben Gordon', college: 'UConn', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Deron Williams', college: 'Illinois', team: 'Retired', position: 'G', tier: 1 },
    { name: 'Kirk Hinrich', college: 'Kansas', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Nick Collison', college: 'Kansas', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Shane Battier', college: 'Duke', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Jay Williams', college: 'Duke', team: 'Retired', position: 'G', tier: 1 },
    { name: 'Carlos Boozer', college: 'Duke', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Mike Dunleavy Jr.', college: 'Duke', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Caron Butler', college: 'UConn', team: 'Retired', position: 'F', tier: 2 },
    { name: 'T.J. Ford', college: 'Texas', team: 'Retired', position: 'G', tier: 2 },
    { name: 'David West', college: 'Xavier', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Jameer Nelson', college: 'Saint Joseph\'s', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Delonte West', college: 'Saint Joseph\'s', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Devin Harris', college: 'Wisconsin', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Luol Deng', college: 'Duke', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Andre Iguodala', college: 'Arizona', team: 'Retired', position: 'F', tier: 1 },
    { name: 'Channing Frye', college: 'Arizona', team: 'Retired', position: 'C', tier: 2 },
    { name: 'Ike Diogu', college: 'Arizona State', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Hakim Warrick', college: 'Syracuse', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Gerry McNamara', college: 'Syracuse', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Raymond Felton', college: 'North Carolina', team: 'Retired', position: 'G', tier: 2 }
]

async function addPlayers() {
    console.log(`Processing ${players.length} players for Survival Mode (Batch 5)...`)
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

    console.log(`Batch 5 Complete: Added ${added}, Updated (to 'both') ${updated}`)
}

addPlayers()
