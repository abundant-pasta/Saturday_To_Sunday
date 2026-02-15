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
    { name: 'Ryan Arcidiacono', college: 'Villanova', team: 'G League', position: 'G', tier: 2 },
    { name: 'Kris Jenkins', college: 'Villanova', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Donte DiVincenzo', college: 'Villanova', team: 'New York Knicks', position: 'G', tier: 2 },
    { name: 'Kyle Guy', college: 'Virginia', team: 'Tenerife', position: 'G', tier: 2 },
    { name: 'Ty Jerome', college: 'Virginia', team: 'Cleveland Cavaliers', position: 'G', tier: 3 },
    { name: 'De\'Andre Hunter', college: 'Virginia', team: 'Atlanta Hawks', position: 'F', tier: 2 },
    { name: 'Jalen Brunson', college: 'Villanova', team: 'New York Knicks', position: 'G', tier: 1 },
    { name: 'Mikal Bridges', college: 'Villanova', team: 'New York Knicks', position: 'F', tier: 1 },
    { name: 'Josh Hart', college: 'Villanova', team: 'New York Knicks', position: 'G', tier: 2 },
    { name: 'Frank Kaminsky', college: 'Wisconsin', team: 'Partizan', position: 'C', tier: 2 },
    { name: 'Sam Dekker', college: 'Wisconsin', team: 'London Lions', position: 'F', tier: 2 },
    { name: 'Nigel Hayes', college: 'Wisconsin', team: 'Fenerbahce', position: 'F', tier: 3 },
    { name: 'Bronson Koenig', college: 'Wisconsin', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Shabazz Napier', college: 'UConn', team: 'Bayern Munich', position: 'G', tier: 2 },
    { name: 'Ryan Boatright', college: 'UConn', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Russ Smith', college: 'Louisville', team: 'G League', position: 'G', tier: 2 },
    { name: 'Peyton Siva', college: 'Louisville', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Gorgui Dieng', college: 'Louisville', team: 'San Antonio Spurs', position: 'C', tier: 2 },
    { name: 'Montrezl Harrell', college: 'Louisville', team: 'Adelaide 36ers', position: 'F', tier: 2 },
    { name: 'Trey Burke', college: 'Michigan', team: 'G League', position: 'G', tier: 2 },
    { name: 'Nik Stauskas', college: 'Michigan', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Mitch McGary', college: 'Michigan', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Aaron Craft', college: 'Ohio State', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Deshaun Thomas', college: 'Ohio State', team: 'Milano', position: 'F', tier: 3 },
    { name: 'Adreian Payne', college: 'Michigan State', team: 'Deceased', position: 'C', tier: 2 }
]

async function addPlayers() {
    console.log(`Processing ${players.length} players for Survival Mode (Batch 6)...`)
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

    console.log(`Batch 6 Complete: Added ${added}, Updated (to 'both') ${updated}`)
}

addPlayers()
