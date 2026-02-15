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
    { name: 'Juan Dixon', college: 'Maryland', team: 'Coppin State (Coach)', position: 'G', tier: 2 },
    { name: 'Steve Blake', college: 'Maryland', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Lonny Baxter', college: 'Maryland', team: 'Retired', position: 'F', tier: 3 },
    { name: 'T.J. Sorrentine', college: 'Vermont', team: 'Brown (Coach)', position: 'G', tier: 3 },
    { name: 'Taylor Coppenrath', college: 'Vermont', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Gerry McNamara', college: 'Syracuse', team: 'Siena (Coach)', position: 'G', tier: 2 },
    { name: 'Hakim Warrick', college: 'Syracuse', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Rashad McCants', college: 'North Carolina', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Sean May', college: 'North Carolina', team: 'North Carolina (Coach)', position: 'F', tier: 2 },
    { name: 'Raymond Felton', college: 'North Carolina', team: 'Retired', position: 'G', tier: 1 },
    { name: 'Acie Law', college: 'Texas A&M', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Joseph Jones', college: 'Texas A&M', team: 'Tarleton State (Coach)', position: 'C', tier: 3 },
    { name: 'Alando Tucker', college: 'Wisconsin', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Mike Wilkinson', college: 'Wisconsin', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Dee Brown', college: 'Illinois', team: 'Roosevelt (Coach)', position: 'G', tier: 2 },
    { name: 'Luther Head', college: 'Illinois', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Roger Powell', college: 'Illinois', team: 'Valparaiso (Coach)', position: 'F', tier: 3 },
    { name: 'JamesAugustine', college: 'Illinois', team: 'Retired', position: 'F', tier: 3 },
    { name: 'Salim Stoudamire', college: 'Arizona', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Hassan Adams', college: 'Arizona', team: 'Retired', position: 'G', tier: 3 },
    { name: 'Chris Lofton', college: 'Tennessee', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Tylerado Hansbrough', college: 'North Carolina', team: 'Retired', position: 'F', tier: 1 }, // Tyler Hansbrough is already in Batch 4
    { name: 'Wayne Simien', college: 'Kansas', team: 'Retired', position: 'F', tier: 2 },
    { name: 'Keith Langford', college: 'Kansas', team: 'Retired', position: 'G', tier: 2 },
    { name: 'Aaron Miles', college: 'Kansas', team: 'Houston Rockets (Coach)', position: 'G', tier: 3 }
]

async function addPlayers() {
    console.log(`Processing ${players.length} players for Survival Mode (Batch 7)...`)
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

    console.log(`Batch 7 Complete: Added ${added}, Updated (to 'both') ${updated}`)
}

addPlayers()
