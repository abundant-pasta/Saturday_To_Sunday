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
    { name: 'Zach Edey', college: 'Purdue', team: 'Memphis Grizzlies', position: 'C', tier: 2 },
    { name: 'Oscar Tshiebwe', college: 'Kentucky', team: 'Utah Jazz', position: 'F', tier: 2 },
    { name: 'Luka Garza', college: 'Iowa', team: 'Minnesota Timberwolves', position: 'C', tier: 2 },
    { name: 'Obi Toppin', college: 'Dayton', team: 'Indiana Pacers', position: 'F', tier: 1 },
    { name: 'Trayce Jackson-Davis', college: 'Indiana', team: 'Golden State Warriors', position: 'F', tier: 2 },
    { name: 'Cade Cunningham', college: 'Oklahoma State', team: 'Detroit Pistons', position: 'G', tier: 1 },
    { name: 'Evan Mobley', college: 'USC', team: 'Cleveland Cavaliers', position: 'F', tier: 1 },
    { name: 'Jalen Suggs', college: 'Gonzaga', team: 'Orlando Magic', position: 'G', tier: 2 },
    { name: 'Chet Holmgren', college: 'Gonzaga', team: 'Oklahoma City Thunder', position: 'C', tier: 1 },
    { name: 'Paolo Banchero', college: 'Duke', team: 'Orlando Magic', position: 'F', tier: 1 },
    { name: 'Jabari Smith Jr.', college: 'Auburn', team: 'Houston Rockets', position: 'F', tier: 1 },
    { name: 'Keegan Murray', college: 'Iowa', team: 'Sacramento Kings', position: 'F', tier: 2 },
    { name: 'Jaden Ivey', college: 'Purdue', team: 'Detroit Pistons', position: 'G', tier: 2 },
    { name: 'Bennedict Mathurin', college: 'Arizona', team: 'Indiana Pacers', position: 'G', tier: 2 },
    { name: 'Ochai Agbaji', college: 'Kansas', team: 'Toronto Raptors', position: 'G', tier: 2 },
    { name: 'Christian Braun', college: 'Kansas', team: 'Denver Nuggets', position: 'G', tier: 2 },
    { name: 'Walker Kessler', college: 'Auburn', team: 'Utah Jazz', position: 'C', tier: 2 },
    { name: 'Jalen Williams', college: 'Santa Clara', team: 'Oklahoma City Thunder', position: 'G', tier: 3 },
    { name: 'Jeremy Sochan', college: 'Baylor', team: 'San Antonio Spurs', position: 'F', tier: 2 },
    { name: 'Scottie Barnes', college: 'Florida State', team: 'Toronto Raptors', position: 'F', tier: 1 },
    { name: 'Franz Wagner', college: 'Michigan', team: 'Orlando Magic', position: 'F', tier: 1 },
    { name: 'Ayo Dosunmu', college: 'Illinois', team: 'Chicago Bulls', position: 'G', tier: 2 },
    { name: 'Corey Kispert', college: 'Gonzaga', team: 'Washington Wizards', position: 'F', tier: 2 },
    { name: 'Jared Butler', college: 'Baylor', team: 'Washington Wizards', position: 'G', tier: 3 },
    { name: 'Dalton Knecht', college: 'Tennessee', team: 'Los Angeles Lakers', position: 'G', tier: 2 }
]

async function addPlayers() {
    console.log(`Processing ${players.length} players for Survival Mode (Batch 1)...`)
    let added = 0
    let updated = 0

    for (const p of players) {
        // Check if exists
        const { data: existing } = await supabase.from('players').select('*').eq('name', p.name).single()

        if (existing) {
            if (existing.game_mode !== 'both' && existing.game_mode !== 'survival') {
                // Update to both
                await supabase.from('players').update({ game_mode: 'both' }).eq('id', existing.id)
                updated++
            }
        } else {
            // Insert as survival
            await supabase.from('players').insert({ ...p, game_mode: 'survival' })
            added++
        }
    }

    console.log(`Batch 1 Complete: Added ${added}, Updated (to 'both') ${updated}`)
}

addPlayers()
