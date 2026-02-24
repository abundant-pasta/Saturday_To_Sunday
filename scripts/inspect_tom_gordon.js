
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function inspectUser() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const userId = '63719211-dc3a-4801-8295-3465c9b6d5f0';

    // 1. Get participant
    const { data: participant } = await supabase
        .from('survival_participants')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

    console.log('Participant:', participant);

    if (participant && participant.length > 0) {
        const pId = participant[0].id;

        // 2. Get scores
        const { data: scores } = await supabase
            .from('survival_scores')
            .select('*')
            .eq('participant_id', pId)
            .order('day_number', { ascending: true });

        console.log('Scores:', scores);
    }
}

inspectUser();
