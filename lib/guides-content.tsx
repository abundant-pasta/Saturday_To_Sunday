import React from 'react';

export function getGuideContent(slug: string) {
    switch (slug) {
        case 'the-ultimate-guide':
            return (
                <>
                    <p className="mb-6">
                        Welcome to the official manual for <strong>Saturday to Sunday</strong>. If you've ever found yourself watching a superstar on Sunday and wondering, <em>"Wait, where did he play on Saturdays?"</em>—this is the game for you.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-8">What is Saturday to Sunday?</h2>
                    <p className="mb-6">
                        Saturday to Sunday is a daily trivia experience that challenges your knowledge of player origins. Every day, we present a fresh roster of NFL and NBA players. Your goal is simple: identify the college or university where each athlete played their collegiate ball.
                    </p>
                    <p className="mb-6">
                        But this isn't just a simple multiple-choice quiz. We've built a high-stakes, speed-based system that rewards deep knowledge and quick thinking.
                    </p>

                    <blockquote className="border-l-4 border-[#00ff80] bg-neutral-900/50 p-6 rounded-xl italic mb-10 my-10">
                        "It's not just about knowing who the stars are; it's about knowing where they came from."
                    </blockquote>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">How to Play</h2>
                    <p className="mb-4">
                        Each daily game consists of a series of rounds (10 for Football, 5 for Basketball). In each round, you'll see:
                    </p>
                    <ul className="list-disc pl-6 space-y-4 mb-10">
                        <li><strong>The Player:</strong> A high-quality image and the player's name.</li>
                        <li><strong>The Options:</strong> Four potential colleges/universities.</li>
                        <li><strong>The Points Pot:</strong> A potential score that starts at 100 and scales with player difficulty.</li>
                    </ul>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The "Huddle" and The Decay</h2>
                    <p className="mb-6">
                        One of our unique mechanics is the <strong>1-Second Huddle</strong>. When a player appears, the timer doesn't start immediately. You have exactly one second to process the name and image. After that, the "Blitz" begins.
                    </p>
                    <p className="mb-6">
                        Once the huddle ends, your potential points begin to drain. The faster you click, the higher your score. If you wait too long, the points will bottom out at a minimum base value. Accuracy is paramount, but speed is what separates the Varsity Star from the Practice Squad.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Difficulty Tiers</h2>
                    <p className="mb-4">
                        Not all players are created equal. We categorize every player into one of three tiers:
                    </p>
                    <ul className="list-disc pl-6 space-y-4 mb-10">
                        <li><strong>Easy (1x Multiplier):</strong> Household names, superstars, and high-profile draft picks.</li>
                        <li><strong>Medium (1.5x Multiplier):</strong> Solid starters and well-known veterans.</li>
                        <li><strong>Hard (2x Multiplier):</strong> The "hidden gems"—players from smaller programs or those who have had journeyman careers.</li>
                    </ul>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Daily Streak</h2>
                    <p className="mb-6">
                        Consistency is rewarded. Every day you complete a game, your streak increases. Maintaining a long streak is the ultimate badge of honor on our global leaderboards. However, life happens. That’s why we introduced <strong>Streak Freezes</strong>—earned by engaging with the community and watching featured content—to protect your progress even when you can't play.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Why It Matters</h2>
                    <p className="mb-10">
                        Saturday to Sunday is more than a game; it's a tribute to the collegiate landscape that produces our favorite professional icons. From the lights of the SEC to the small-town fields of the MAC, every campus contribute to the sports world's tapestry.
                    </p>
                    <p className="mb-6">
                        Ready to prove your expertise? The next huddle starts now.
                    </p>
                </>
            );

        case 'mastering-the-leaderboard':
            return (
                <>
                    <p className="mb-6">
                        The spirit of <strong>Saturday to Sunday</strong> lives in competition. Whether you're racing against your friends in a private Squad or climbing the global ranks, understanding how the leaderboard works is key to legendary status.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Scoring Formula</h2>
                    <p className="mb-4">
                        Points aren't just handed out for correct answers. We use a sophisticated formula that takes into account three main factors:
                    </p>
                    <ol className="list-decimal pl-6 space-y-4 mb-10 text-neutral-300">
                        <li><strong>Base Value:</strong> Every question starts with a pool of 100 potential points.</li>
                        <li><strong>Difficulty Multiplier:</strong> We scale that 100 based on the player's tier (Easy: 1x, Medium: 1.5x, Hard: 2x).</li>
                        <li><strong>Time Decay:</strong> After your 1-second "Huddle" ends, points drain every half-second you wait to answer.</li>
                    </ol>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Rank Titles</h2>
                    <p className="mb-4">
                        As you accumulate points in a single daily game, you will earn titles that reflect your performance level. For Football, these range from:
                    </p>
                    <ul className="list-disc pl-6 space-y-4 mb-10">
                        <li><strong>Redshirt:</strong> 0-100 points. You're just getting started.</li>
                        <li><strong>Practice Squad:</strong> 101-300 points. Showing potential.</li>
                        <li><strong>Varsity Starter:</strong> 301-700 points. A solid performance.</li>
                        <li><strong>All-American:</strong> 701-1100 points. Elite sports knowledge.</li>
                        <li><strong>Heisman Hopeful:</strong> 1101+ points. Legendary status.</li>
                    </ul>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Daily vs. All-Time</h2>
                    <p className="mb-6">
                        The main leaderboard resets every 24 hours (aligned with our daily roster refresh). This gives every player a fresh chance to reach the top spot every single morning. Your all-time stats, including your highest single-game score, are preserved in your Profile and the Trophy Room.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Live Rank Display</h2>
                    <p className="mb-10">
                        While you play, look at the top of your screen. Our <strong>Live Rank Display</strong> shows you exactly where you stand against everyone else who has played that day. It updates in real-time as you answer each question, adding an extra layer of tension to every click.
                    </p>
                </>
            );

        case 'the-power-of-squads':
            return (
                <>
                    <p className="mb-6">
                        Trivia is a solitary pursuit for many, but in <strong>Saturday to Sunday</strong>, we've built a way to bring the locker room talk directly into the game. <strong>Squads</strong> are private groups where you can compete exclusively with your friends, family, or coworkers.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Creating a Squad</h2>
                    <p className="mb-6">
                        Any registered player can start a Squad. Simply navigate to the **My Squads** section on the homepage and click "Create Squad". You'll give your group a name—whether it's "The Monday Morning QBs" or "The Draft Gurus"—and you'll be ready to recruit.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Inviting Your Rivals</h2>
                    <p className="mb-4">
                        Once your Squad is live, you can invite other players using their **Username**.
                    </p>
                    <ul className="list-disc pl-6 space-y-4 mb-10">
                        <li>Search for their exact display name in the Invite section.</li>
                        <li>They will receive a notification (if enabled) and a badge in their Squads menu.</li>
                        <li>Once they accept, they are part of the team.</li>
                    </ul>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Private Leaderboard</h2>
                    <p className="mb-6">
                        Inside every Squad, you'll find a private version of our daily leaderboard. This filters the global rankings to only show the members of your group. It’s the perfect place for bragging rights and daily challenges.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Squad Chat & Interaction</h2>
                    <p className="mb-10">
                        While the primary focus is the leaderboard, being in a Squad allows you to see the "Result Squares" of your teammates. You can see who hit a "Perfect 10" or who struggled with a "Hard" tier player from a mid-major school.
                    </p>

                    <blockquote className="border-l-4 border-[#00ff80] bg-neutral-900/50 p-6 rounded-xl italic mb-10 my-10">
                        "Nothing sharpens your sports knowledge faster than the fear of finishing last in your friend group."
                    </blockquote>
                </>
            );

        case 'streak-protection':
            return (
                <>
                    <p className="mb-6">
                        Consistency is the true test of a sports fan's dedication. In <strong>Saturday to Sunday</strong>, your "Streak" represents the number of consecutive days you've completed a daily game. But we know life can sometimes throw a blitz your way.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Streak Loop</h2>
                    <p className="mb-6">
                        Every time you complete a daily game, your streak for that sport (Football or Basketball) increases by one. You'll see your streak displayed prominently on the homepage with a flame icon.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">What is a Streak Freeze?</h2>
                    <p className="mb-6">
                        A <strong>Streak Freeze</strong> is a powerful consumable item that automatically protects your streak if you miss a day. If you haven't played within 24 hours of your last game, our system will check if you have a freeze available. If you do, it will be consumed, and your streak will remain intact.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">How to Earn Freezes</h2>
                    <p className="mb-4">
                        You can only hold <strong>one freeze at a time</strong> for each sport. You can earn a freeze by:
                    </p>
                    <ul className="list-disc pl-6 space-y-4 mb-10">
                        <li>Navigating to your **Profile** page.</li>
                        <li>Clicking "Watch Ad to Earn" under the Streak Protection section.</li>
                        <li>Completing the short featured content session.</li>
                    </ul>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Daily Reset Times</h2>
                    <p className="mb-10">
                        Our games reset at a fixed time every day to ensure everyone is playing the same roster. Generally, this happens at midnight in our central timezone, but the exact hours until the next reset are always visible on the homepage and in the Earn Freeze section of your profile.
                    </p>

                    <blockquote className="border-l-4 border-[#00ff80] bg-neutral-900/50 p-6 rounded-xl italic mb-10 my-10">
                        "Don't let a vacation or a busy Monday break your 100-day flame."
                    </blockquote>
                </>
            );

        case 'the-trophy-room':
            return (
                <>
                    <p className="mb-6">
                        Every great athlete has a showcase for their achievements. In <strong>Saturday to Sunday</strong>, your showcase is the <strong>Trophy Room</strong>. It’s a permanent record of your milestones and the elite players you’ve correctly identified.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Unlocking Achievements</h2>
                    <p className="mb-4">
                        Achievements are earned through gameplay, milestones, and specific performance feats. Some are easy to acquire, while others require weeks of dedicated play. Categories include:
                    </p>
                    <ul className="list-disc pl-6 space-y-4 mb-10">
                        <li><strong>Streak Milestones:</strong> 7-day, 30-day, and the legendary 100-day "Century" badge.</li>
                        <li><strong>Performance Feats:</strong> The "Perfect 10" or "Speed Demon" (answering all questions within the huddle).</li>
                        <li><strong>Rank Trophies:</strong> Reaching the "Heisman Hopeful" or "MVP Contender" status for the first time.</li>
                    </ul>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Player Collection</h2>
                    <p className="mb-6">
                        Whenever you correctly identify a "Hard" tier player, they are added to your digital collection. This gallery allows you to revisit the players who helped you climb the leaderboard. Each card in your collection displays the player's name, their college, and the date you correctly "scouted" them.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Showcasing Your Stats</h2>
                    <p className="mb-10">
                        Your Trophy Room also acts as a public-facing resume. When other players view your profile from the leaderboard, they see your most impressive badges and your best scores. It’s the ultimate way to prove that your sports knowledge isn't just a fluke—it's a career.
                    </p>
                </>
            );

        case 'saturdays-to-sundays-legendary-paths':
            return (
                <>
                    <p className="mb-6">
                        The transition from the colorful, high-energy world of college sports to the professional grind of the NFL and NBA is one of the most difficult jumps in all of athletics. At <strong>Saturday to Sunday</strong>, we are obsessed with the "Paths"—the unique journeys that lead a student-athlete to professional stardom.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Power Five Pipeline</h2>
                    <p className="mb-6">
                        It’s no secret that schools like Alabama, Ohio State, and Kentucky are "pro factories." These programs have refined the art of scouting and development, creating a direct pipeline to the first round of the draft. When you see a player from these schools in our daily game, they are often in the <strong>Easy</strong> tier because their path is so well-documented.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Improbable Journeys</h2>
                    <p className="mb-6">
                        The real magic happens with the "walk-ons" and the "small school" stars. Think of the players who started at a community college or a Division II program before lighting up the national stage. These are the players that make our game challenging. When you correctly identify a superstar who played at a school you’ve barely heard of, you’re not just playing a game—you’re honoring an incredible journey.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Why It Stays Personalized</h2>
                    <p className="mb-10">
                        Every fan has their "guy"—the player they saw in a random Tuesday night MAC game who they knew would be a star. Our trivia rosters are designed to hit those notes of nostalgia and scouting intuition. We track these paths so you can prove you saw the talent before the rest of the world did.
                    </p>
                </>
            );

        case 'trivia-strategy-obscure-schools':
            return (
                <>
                    <p className="mb-6">
                        If you want to reach the top of the <strong>Saturday to Sunday</strong> leaderboard, you can't just rely on knowing the superstars. You need a strategy for the "Hard" tier—the players from obscure, mid-major, or historically black colleges and universities (HBCUs).
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Context Clues</h2>
                    <p className="mb-6">
                        When a name pops up that you don't immediately recognize, look for regional clues. Many players stay close to home for college before being drafted by a team across the country. If a player has a distinct "Southern" or "West Coast" style, or if their early career was spent in a specific region, use that to narrow down your options.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Conference Map</h2>
                    <p className="mb-6">
                        Experienced players often memorize the "Style of Play" associated with different conferences. A defensive powerhouse in the NFL often comes from a school known for its rigorous defensive schemes. Similarly, high-flying NBA guards often hail from "guard-oriented" mid-major programs that gave them the green light to develop their handles.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Pattern Recognition</h2>
                    <p className="mb-10">
                        Keep an eye on "Draft Steals." These are players who weren't highly recruited out of high school but developed into elite pros. They almost always come from specific non-Power Five conferences like the Mountain West or the Sun Belt. Learning these "feeder" patterns is the fastest way to master the Hard tier and maximize your multipliers.
                    </p>
                </>
            );

        case 'draft-day-patterns-college-to-pro':
            return (
                <>
                    <p className="mb-6">
                        Draft Day is the bridge between Saturday and Sunday. It’s the moment when a collegiate legacy is finalized and a professional dream begins. But how much does college performance actually predict pro success?
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Statistical Correlation</h2>
                    <p className="mb-6">
                        In our research for <strong>Saturday to Sunday</strong>, we’ve found fascinating patterns. For example, specific collegiate systems (like the "Air Raid" in football or "Small Ball" in basketball) produce high-stat college players who often have to reinvent themselves in the pros. Understanding these system-based transitions helps you identify where a player came from based on their style of play.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The "One-Year Wonder" vs. The Consistent Star</h2>
                    <p className="mb-6">
                        Some of the most difficult trivia questions involve players who had a single breakout year in college before being drafted early. These players are often harder to place than the four-year starters who became legends at their respective universities. Our game challenges you to remember those high-impact seasons that changed a player's career trajectory.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Scouting the Alma Mater</h2>
                    <p className="mb-10">
                        Pro teams often have "favorite" colleges they go back to year after year. Whether it's the 49ers' connection to specific defensive pipelines or the Raptors' penchant for international and mid-major talent, these draft patterns are a goldmine for trivia aficionados.
                    </p>
                </>
            );

        case 'evolution-of-sports-trivia':
            return (
                <>
                    <p className="mb-6">
                        Sports trivia has evolved from barroom debates to a sophisticated, global digital phenomenon. <strong>Saturday to Sunday</strong> is at the forefront of this evolution, blending the classic "Guess Who" mechanic with modern PWA technology and social competition.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">From Almanacs to Real-Time Data</h2>
                    <p className="mb-6">
                        The old days of memorizing stats from a physical almanac are gone. Today's trivia fan is connected to real-time data and high-definition highlights. This has raised the bar for what constitutes a "hard" question. Our fans don't just know the stats; they know the stories, the transfers, and the draft-day surprises.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Rise of the "Daily Loop"</h2>
                    <p className="mb-6">
                        Games like Wordle and Immaculate Grid proved that fans love a daily, shared experience. We've applied that "one-a-day" philosophy to the college-to-pro transition. By giving everyone the same roster at the same time, we create a global conversation that happens every single morning in group chats and on social media.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Community Aspect</h2>
                    <p className="mb-10">
                        Modern trivia is social. Through our Squads feature and global rankings, we've turned a test of knowledge into a high-stakes competition. It's no longer just about what you know—it's about how you rank against the thousands of other fans who are playing alongside you.
                    </p>
                </>
            );

        case 'the-steal-schools':
            return (
                <>
                    <p className="mb-6">
                        While the Alabama and Dukes of the world get all the headlines, some of the NFL and NBA's greatest "steals" come from programs that fly under the radar. Following these "Steal Schools" is the secret weapon of the elite <strong>Saturday to Sunday</strong> player.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The Non-Powerhouse Factories</h2>
                    <p className="mb-6">
                        Programs like Boise State, UCF, and San Diego State have consistently produced pro talent that outperforms their draft position. These schools often recruit "overlooked" athletes who play with a chip on their shoulder—a trait that translates perfectly to the professional level.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">The "Mid-Major" Guard</h2>
                    <p className="mb-6">
                        In the NBA, some of the most skilled ball-handlers come from small schools where they were the focal point of the offense for four years. While the blue-bloods often produce "one-and-done" stars, these "steals" bring a level of maturity and polish that makes them household names on Sundays.
                    </p>

                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#00ff80] mb-4 mt-12">Scouting the Underdog</h2>
                    <p className="mb-10">
                        Correcting the "Hard" tier questions often requires knowing these programs. If you see a lockdown cornerback who didn't play in the SEC, chances are he was a star at a school where he could get 40+ starts and refine his craft. Recognizing these programs is how you earn the highest scores in Saturday to Sunday.
                    </p>
                </>
            );

        default:
            return <p>Content coming soon. We are drafting high-quality insights for this guide.</p>;
    }
}
