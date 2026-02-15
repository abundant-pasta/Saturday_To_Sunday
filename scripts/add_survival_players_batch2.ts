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
    { name: 'Ben Simmons', college: 'LSU', team: 'Brooklyn Nets', position: 'G', tier: 1 },
    { name: 'Buddy Hield', college: 'Oklahoma', team: 'Golden State Warriors', position: 'G', tier: 1 },
    { name: 'Denzel Valentine', college: 'Michigan State', team: 'Free Agent', position: 'G', tier: 2 },
    { name: 'Kris Dunn', college: 'Providence', team: 'Los Angeles Clippers', position: 'G', tier: 2 },
    { name: 'Jamal Murray', college: 'Kentucky', team: 'Denver Nuggets', position: 'G', tier: 1 },
    { name: 'Jaylen Brown', college: 'California', team: 'Boston Celtics', position: 'F', tier: 1 },
    { name: 'Frank Mason III', college: 'Kansas', team: 'Free Agent', position: 'G', tier: 3 },
    { name: 'Lonzo Ball', college: 'UCLA', team: 'Chicago Bulls', position: 'G', tier: 1 },
    { name: 'Jayson Tatum', college: 'Duke', team: 'Boston Celtics', position: 'F', tier: 1 },
    { name: 'De\'Aaron Fox', college: 'Kentucky', team: 'Sacramento Kings', position: 'G', tier: 1 },
    { name: 'Josh Jackson', college: 'Kansas', team: 'Free Agent', position: 'F', tier: 2 },
    { name: 'Malik Monk', college: 'Kentucky', team: 'Sacramento Kings', position: 'G', tier: 1 },
    { name: 'Jalen Brunson', college: 'Villanova', team: 'New York Knicks', position: 'G', tier: 1 },
    { name: 'Trae Young', college: 'Oklahoma', team: 'Atlanta Hawks', position: 'G', tier: 1 },
    { name: 'Marvin Bagley III', college: 'Duke', team: 'Washington Wizards', position: 'F', tier: 2 },
    { name: 'Mikal Bridges', college: 'Villanova', team: 'New York Knicks', position: 'F', tier: 1 },
    { name: 'Donte DiVincenzo', college: 'Villanova', team: 'New York Knicks', position: 'G', tier: 2 },
    { name: 'Zion Williamson', college: 'Duke', team: 'New Orleans Pelicans', position: 'F', tier: 1 },
    { name: 'RJ Barrett', college: 'Duke', team: 'Toronto Raptors', position: 'G', tier: 1 },
    { name: 'Ja Morant', college: 'Murray State', team: 'Memphis Grizzlies', position: 'G', tier: 1 },
    { name: 'Carsen Edwards', college: 'Purdue', team: 'Bayern Munich', position: 'G', tier: 3 },
    { name: 'Grant Williams', college: 'Tennessee', team: 'Charlotte Hornets', position: 'F', tier: 2 },
    { name: 'Rui Hachimura', college: 'Gonzaga', team: 'Los Angeles Lakers', position: 'F', tier: 2 },
    { name: 'Brandon Clarke', college: 'Gonzaga', team: 'Memphis Grizzlies', position: 'F', tier: 2 },
    { name: 'Cam Reddish', college: 'Duke', team: 'Los Angeles Lakers', position: 'F', tier: 2 }
]

async function addPlayers() {
    console.log(`Processing ${players.length} players for Survival Mode (Batch 2)...`)
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

    console.log(`Batch 2 Complete: Added ${added}, Updated (to 'both') ${updated}`)
}

addPlayers()
