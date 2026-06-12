# Saturday To Sunday Growth Operating System

This is the solo-founder operating model for the next 6 months. It keeps the app organic-first, low-spend, and focused on turning daily play into a sports-trivia habit.

## Goals

- Build a visible daily habit across college football, NFL, NBA, and college basketball fans.
- Grow starts, registered active players, shares, push subscribers, and Survival joins before monetization.
- Keep spend at $0 by default and cap experiments at $100/month.

## Fractional Org

| Function | Owner | Weekly Output |
| --- | --- | --- |
| Founder/GM | Founder | Picks priorities, theme, outreach targets, and content judgment. |
| Product/Growth Engineering | Founder + Codex | Ships one retention, sharing, analytics, or player-pool improvement. |
| Content Programming | Founder | Selects weekly theme, daily hooks, prompts, and Survival wrapper. |
| Social/Community | Founder | Posts daily, replies to sports conversations, and seeds community threads. |
| Data/CRM | Founder + `/admin/growth` | Reviews funnel metrics every Monday and updates the playbook. |
| Partnerships | Founder | Contacts small creators, alumni pages, campus fan accounts, podcasts, and newsletters. |

## Weekly Cadence

| Day | Operating Block |
| --- | --- |
| Monday | 30-minute metrics review in `/admin/growth`; choose the weekly theme and school spotlight. |
| Tuesday | Ship or polish one product/growth improvement; post Format A and Format B. |
| Wednesday | Publish a school or rivalry prompt; reply to 10 sports/trivia/community threads. |
| Thursday | Record and schedule short-form posts; review claim/share/push events. |
| Friday | Outreach block: contact 10 small accounts and offer a custom school challenge. |
| Saturday | Live sports-calendar posts and creator follow-ups. |
| Sunday | Survival join reminder, next-week content prep, and campaign link QA. |

## Daily Social Engine

Post two short-form pieces per day. Reuse the same core asset across TikTok, Instagram Reels, YouTube Shorts, and X, but rewrite captions for the platform.

| Format | Hook | CTA |
| --- | --- | --- |
| A | "Do you know where this NFL/NBA player went to college?" with 3 fast reveals. | Play today. |
| B | "Today's Saturday to Sunday challenge: beat ___ points." | Challenge a friend. |
| C | "Only real college sports sickos know this one." | Join Monday Survival. |

Every link should include UTM params:

```text
/daily?utm_source=tiktok&utm_medium=social&utm_campaign=daily_challenge&utm_content=football
/daily/basketball?school=Duke&utm_source=instagram&utm_medium=social&utm_campaign=school_spotlight&utm_content=duke
/survival?utm_source=x&utm_medium=social&utm_campaign=weekly_survival&utm_content=sunday_join
```

## Weekly Theme System

The app now has a rotating theme library in `lib/growth.ts`. Themes add campaign copy and tracking metadata without changing gameplay logic.

| Theme | Best Use |
| --- | --- |
| NFL Draft Schools | Draft, recruiting, and NFL prospect discourse. |
| March Madness Alumni | Tournament weeks and college hoops nostalgia. |
| NBA Playoffs Alumni | Playoff rotations and player-origin hooks. |
| Rivalry Week | Fan-base arguments and bragging-rights score shares. |
| Heisman Week | Award-season and college football history. |
| HBCU Legends | History-forward player spotlights. |
| Blue Blood Basketball Week | Duke, Kentucky, UNC, Kansas, UConn, UCLA, and similar accounts. |
| Small-School Stars | "You know the player, not the school" challenge posts. |
| School Spotlight | Custom creator, alumni, or campus campaign links. |

## Outreach Playbook

Daily community work:

- Reply to 10 relevant X/Reddit sports trivia, roster, college sports, or alumni conversations.
- Avoid link-dumping. Give the answer, add a short observation, and only link when it naturally fits.

Weekly creator/community outreach:

- Contact 10 accounts with 1k-50k followers.
- Prioritize Alabama, Georgia, Ohio State, Michigan, Texas, LSU, Duke, Kentucky, UNC, Kansas, and UConn.
- Ask for one simple collaboration:
  - "Want a custom school challenge?"
  - "Can I make a [School] alumni grid for your followers?"
  - "I'll build a rivalry challenge for your page."

Track manually until it hurts:

| Date | Account | Platform | Audience | Ask | Reply | Post Date | Link | Starts | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Monday Metrics Review

Use `/admin/growth` first, then the SQL report if deeper reconciliation is needed.

Core questions:

- Which platform or post created real game starts, not just impressions?
- Did guest starts become guest finishes?
- Did claims increase after share or school campaigns?
- Which links produced Survival joins?
- Did active registered players and 2+ day returners move?
- Which campaign should become next week's repeatable template?

## Spending Rules

- Spend $0 unless an organic format shows traction.
- Spend $25-$50 only for creator bounties after a creator or school format already produced starts.
- Do not hire until posting volume or editing becomes the bottleneck.
