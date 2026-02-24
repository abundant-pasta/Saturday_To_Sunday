
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function listGames() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: games, error } = await supabase
        .from('daily_games')
        .select('date, sport, created_at')
        .eq('sport', 'survival_basketball')
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching games:', error);
        return;
    }

    console.log('Survival Games List:');
    games.forEach(g => {
        console.log(`Date: ${g.date} | Created: ${g.created_at}`);
    });
}

listGames();
