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
    { name: 'Anthony Davis', college: 'Kentucky', team: 'Los Angeles Lakers', position: 'F', tier: 1 },
    { name: 'Kemba Walker', college: 'UConn', team: 'Retired', position: 'G', tier: 1 },
    { name: 'Jimmer Fredette', college: 'BYU', team: 'Shanghai Sharks', position: 'G', tier: 2 },
    { name: 'Doug McDermott', college: 'Creighton', team: 'Indiana Pacers', position: 'F', tier: 2 },
    { name: 'Trey Burke', college: 'Michigan', team: 'G League', position: 'G', tier: 3 },
    { name: 'Victor Oladipo', college: 'Indiana', team: 'Free Agent', position: 'G', tier: 2 },
    { name: 'Shabazz Napier', college: 'UConn', team: 'Bayern Munich', position: 'G', tier: 2 },
    { name: 'Jared Sullinger', college: 'Ohio State', team: 'Cangrejeros de Santurce', position: 'F', tier: 3 },
    { name: 'Harrison Barnes', college: 'North Carolina', team: 'San Antonio Spurs', position: 'F', tier: 2 },
    { name: 'Kyrie Irving', college: 'Duke', team: 'Dallas Mavericks', position: 'G', tier: 1 },
    { name: 'Draymond Green', college: 'Michigan State', team: 'Golden State Warriors', position: 'F', tier: 1 },
    { name: 'Damian Lillard', college: 'Weber State', team: 'Milwaukee Bucks', position: 'G', tier: 1 },
    { name: 'Klay Thompson', college: 'Washington State', team: 'Dallas Mavericks', position: 'G', tier: 1 },
    { name: 'Jimmy Butler', college: 'Marquette', team: 'Miami Heat', position: 'F', tier: 1 },
    { name: 'CJ McCollum', college: 'Lehigh', team: 'New Orleans Pelicans', position: 'G', tier: 1 },
    { name: 'Gordon Hayward', college: 'Butler', team: 'Oklahoma City Thunder', position: 'F', tier: 2 },
    { name: 'Kawhi Leonard', college: 'San Diego State', team: 'Los Angeles Clippers', position: 'F', tier: 1 },
    { name: 'Marcus Smart', college: 'Oklahoma State', team: 'Memphis Grizzlies', position: 'G', tier: 2 },
    { name: 'Cody Zeller', college: 'Indiana', team: 'New Orleans Pelicans', position: 'C', tier: 3 },
    { name: 'Michael Kidd-Gilchrist', college: 'Kentucky', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Julius Randle', college: 'Kentucky', team: 'Minnesota Timberwolves', position: 'F', tier: 1 },
    { name: 'Andrew Wiggins', college: 'Kansas', team: 'Golden State Warriors', position: 'F', tier: 2 },
    { name: 'Kelly Olynyk', college: 'Gonzaga', team: 'Toronto Raptors', position: 'F', tier: 2 },
    { name: 'Otto Porter Jr.', college: 'Georgetown', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Isaiah Thomas', college: 'Washington', team: 'Free Agent', position: 'G', tier: 2 }
]

async function addPlayers() {
    console.log(`Processing ${players.length} players for Survival Mode (Batch 3)...`)
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

    console.log(`Batch 3 Complete: Added ${added}, Updated (to 'both') ${updated}`)
}

addPlayers()
