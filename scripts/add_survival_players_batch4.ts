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
    { name: 'Kevin Durant', college: 'Texas', team: 'Phoenix Suns', position: 'F', tier: 1 },
    { name: 'Stephen Curry', college: 'Davidson', team: 'Golden State Warriors', position: 'G', tier: 1 },
    { name: 'Blake Griffin', college: 'Oklahoma', team: 'Retired', position: 'F', tier: 1 },
    { name: 'James Harden', college: 'Arizona State', team: 'Los Angeles Clippers', position: 'G', tier: 1 },
    { name: 'Derrick Rose', college: 'Memphis', team: 'Retired', position: 'G', tier: 1 },
    { name: 'Russell Westbrook', college: 'UCLA', team: 'Denver Nuggets', position: 'G', tier: 1 },
    { name: 'Kevin Love', college: 'UCLA', team: 'Miami Heat', position: 'F', tier: 1 },
    { name: 'Tyler Hansbrough', college: 'North Carolina', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Joakim Noah', college: 'Florida', team: 'Retired', position: 'C', tier: 2 },
    { name: 'Al Horford', college: 'Florida', team: 'Boston Celtics', position: 'C', tier: 1 },
    { name: 'JJ Redick', college: 'Duke', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Adam Morrison', college: 'Gonzaga', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Greg Oden', college: 'Ohio State', team: 'Retired', position: 'C', tier: 2 },
    { name: 'Mike Conley', college: 'Ohio State', team: 'Minnesota Timberwolves', position: 'G', tier: 1 },
    { name: 'DeMar DeRozan', college: 'USC', team: 'Sacramento Kings', position: 'G', tier: 1 },
    { name: 'Jrue Holiday', college: 'UCLA', team: 'Boston Celtics', position: 'G', tier: 1 },
    { name: 'Brook Lopez', college: 'Stanford', team: 'Milwaukee Bucks', position: 'C', tier: 2 },
    { name: 'Robin Lopez', college: 'Stanford', team: 'Free Agent', position: 'C', tier: 3 },
    { name: 'Jeff Green', college: 'Georgetown', team: 'Houston Rockets', position: 'F', tier: 2 },
    { name: 'Roy Hibbert', college: 'Georgetown', team: 'Retired', position: 'C', tier: 2 },
    { name: 'Hasheem Thabeet', college: 'UConn', team: 'Retired', position: 'C', tier: 3 },
    { name: 'Ty Lawson', college: 'North Carolina', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Eric Gordon', college: 'Indiana', team: 'Phoenix Suns', position: 'G', tier: 2 },
    { name: 'Brandon Roy', college: 'Washington', team: 'Retired', position: 'G', tier: 1 },
    { name: 'Rajon Rondo', college: 'Kentucky', team: 'Retired', position: 'G', tier: 1 }
]

async function addPlayers() {
    console.log(`Processing ${players.length} players for Survival Mode (Batch 4)...`)
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

    console.log(`Batch 4 Complete: Added ${added}, Updated (to 'both') ${updated}`)
}

addPlayers()
