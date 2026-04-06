from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_PATH = OUTPUT_DIR / "saturday_to_sunday_growth_roadmap.pdf"


def build_styles():
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="TitleHero",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=29,
            textColor=colors.HexColor("#111827"),
            alignment=TA_CENTER,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SubHero",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#475569"),
            alignment=TA_CENTER,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=18,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=10,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CardHeading",
            parent=styles["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=14,
            textColor=colors.HexColor("#111827"),
            spaceBefore=4,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodySmall",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#334155"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BulletBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#334155"),
            leftIndent=12,
            bulletIndent=0,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Caption",
            parent=styles["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableHeader",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10,
            textColor=colors.whitesmoke,
        )
    )
    styles.add(
        ParagraphStyle(
            name="TableCell",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.3,
            leading=10,
            textColor=colors.HexColor("#1f2937"),
        )
    )
    return styles


def bullet(text, styles):
    return Paragraph(text, styles["BulletBody"], bulletText="-")


def page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawRightString(doc.pagesize[0] - 0.7 * inch, 0.45 * inch, f"Page {doc.page}")
    canvas.drawString(0.7 * inch, 0.45 * inch, "Saturday to Sunday growth roadmap")
    canvas.restoreState()


def matrix_table(rows, col_widths, styles):
    formatted_rows = []
    for row_index, row in enumerate(rows):
        formatted_rows.append(
            [
                Paragraph(str(cell), styles["TableHeader"] if row_index == 0 else styles["TableCell"])
                for cell in row
            ]
        )

    table = Table(formatted_rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("LEADING", (0, 0), (-1, -1), 12),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f8fafc")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#eef2ff")]),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def build_story():
    styles = build_styles()
    story = []

    story.append(Spacer(1, 0.5 * inch))
    story.append(Paragraph("Saturday to Sunday Growth Roadmap", styles["TitleHero"]))
    story.append(
        Paragraph(
            "A practical plan to increase retention, social spread, and repeat sessions without rebuilding the app from scratch.",
            styles["SubHero"],
        )
    )
    story.append(
        Paragraph(
            "Prepared April 6, 2026. Focused on the product that exists today: daily trivia, survival, squads, streaks, recap, guides, collection, and push.",
            styles["SubHero"],
        )
    )
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("Executive Summary", styles["SectionHeading"]))
    story.append(
        Paragraph(
            "The core issue is not lack of modes. The app already has enough surfaces. The real gap is that most users only have one meaningful reason to open the app each day, and average players do not get enough social reward or long-term progression to stick.",
            styles["BodySmall"],
        )
    )
    story.append(bullet("Current loop strength: fast daily challenge, recognizable sports hook, competitive scoring.", styles))
    story.append(bullet("Current loop weakness: limited same-day return triggers, weak friend pull, and thin progression for non-elite users.", styles))
    story.append(bullet("Best next move: make the app more personal, more social, and more event-driven before adding brand-new game families.", styles))
    story.append(Spacer(1, 0.1 * inch))
    story.append(
        matrix_table(
            [
                ["Priority", "Bet", "Why it matters"],
                ["1", "Personalized challenges", "Creates more daily relevance and stronger push/open rates."],
                ["2", "Squad quests and direct challenges", "Turns existing users into acquisition and retention channels."],
                ["3", "Season progression and collections", "Gives average players a reason to stay even when they are not winning leaderboards."],
                ["4", "Event-week programming", "Rides sports calendar spikes without inventing new core mechanics."],
                ["5", "Short-form recap cards", "Creates shareable content and second-session behavior."],
            ],
            [0.6 * inch, 2.2 * inch, 3.7 * inch],
            styles,
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("Where Growth Is Breaking Today", styles["SectionHeading"]))
    story.append(Paragraph("My read of the app’s current bottlenecks:", styles["BodySmall"]))
    story.append(bullet("You have a strong once-a-day habit candidate, but not a strong multi-touch weekly habit.", styles))
    story.append(bullet("Leaderboard motivation is compelling for a minority of players, but most users need personal goals, streak safety, and social accountability.", styles))
    story.append(bullet("Squads exist, but they are not yet powerful enough to become the reason people recruit friends.", styles))
    story.append(bullet("Collection and recap are promising but underused as progression and content surfaces.", styles))
    story.append(bullet("The sports theme is broad enough to support year-round programming, but the app does not yet capitalize on the sports calendar aggressively.", styles))
    story.append(Spacer(1, 0.08 * inch))
    story.append(Paragraph("Growth Principles", styles["CardHeading"]))
    story.append(bullet("Do not add complexity unless it increases either retention, invites, or frequency.", styles))
    story.append(bullet("Bias toward systems that reuse your existing data and routes.", styles))
    story.append(bullet("Ship weekly content wrappers around the same core mechanics before building entirely new mechanics.", styles))
    story.append(bullet("Measure behavior change on a per-feature basis: opens, completions, invites, and repeat sessions.", styles))

    story.append(Paragraph("Feature Fit With Existing Surfaces", styles["CardHeading"]))
    story.append(
        matrix_table(
            [
                ["Existing surface", "Underused potential", "Expansion direction"],
                ["Profile", "Knows who the user is, but not what they care about", "Favorite teams, favorite colleges, favorite sport mode"],
                ["Squads", "Mostly a destination", "Weekly quests, rivalry ladders, direct challenge links"],
                ["Collection", "Mostly retrospective", "Season pass, badge tracks, conference sets, event rewards"],
                ["Recap", "Reads like a summary", "Turn into a daily content feed and social share surface"],
                ["Push", "Useful but generic", "Personalized reminders and event-driven challenge prompts"],
            ],
            [1.3 * inch, 2.15 * inch, 2.95 * inch],
            styles,
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("30-Day Roadmap", styles["SectionHeading"]))
    story.append(Paragraph("Ship these in order if the goal is fastest retention impact:", styles["BodySmall"]))
    story.append(Paragraph("1. Personalized Challenge Layer", styles["CardHeading"]))
    story.append(bullet("Add favorite teams, schools, conferences, and preferred sport in profile.", styles))
    story.append(bullet("Use those preferences to generate tailored push copy like: tonight’s alumni run, SEC challenge, or beat-your-best basketball day.", styles))
    story.append(bullet("Create a lightweight themed mini-challenge rail on home using existing player pools and daily game logic.", styles))

    story.append(Paragraph("2. Squad Retention Loop", styles["CardHeading"]))
    story.append(bullet("Weekly squad quest: highest average score, most perfect rounds, most members completing both modes, or best streak preservation.", styles))
    story.append(bullet("Direct challenge links: share a completed run to a friend with a prefilled target score.", styles))
    story.append(bullet("Squad streaks: if enough members play, unlock a visual badge or bonus card for the week.", styles))

    story.append(Paragraph("3. Progression Refresh", styles["CardHeading"]))
    story.append(bullet("Convert collection into seasonal progression with visible milestones.", styles))
    story.append(bullet("Add achievable goals for normal users: 3-day basketball streak, 5 correct hard-tier picks, complete both modes for 4 days this week.", styles))
    story.append(bullet("Make rewards cosmetic and status-based first. They are cheap to ship and still meaningful.", styles))

    story.append(Paragraph("Core KPI Targets For This Phase", styles["CardHeading"]))
    story.append(
        matrix_table(
            [
                ["Metric", "Why it matters", "Healthy movement to look for"],
                ["Sessions per user per week", "Measures habit depth", "Up after personalized pushes and event prompts"],
                ["Users completing 3+ days per week", "Measures sticky engagement", "Up after progression refresh"],
                ["Invite sends per active user", "Measures social loop strength", "Up after direct challenge links"],
                ["Squad join rate", "Measures social commitment", "Up after weekly squad quests"],
            ],
            [1.8 * inch, 2.2 * inch, 2.5 * inch],
            styles,
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("60 to 90-Day Roadmap", styles["SectionHeading"]))
    story.append(Paragraph("Once the first layer is working, expand with programming rather than feature sprawl.", styles["BodySmall"]))
    story.append(Paragraph("4. Sports Calendar Programming", styles["CardHeading"]))
    story.append(bullet("Run themed weeks: Final Four alumni, NFL Draft schools, Heisman finalists, rivalry week, transfer portal week, Hall of Fame week.", styles))
    story.append(bullet("Use recap, guides, and push to frame each event so the app feels current even outside peak season.", styles))
    story.append(bullet("Make event participation unlock event-limited badges or collection items.", styles))

    story.append(Paragraph("5. Swipeable Sports Content Layer", styles["CardHeading"]))
    story.append(bullet("Add 3 to 5 daily vertical cards: alumni spotlights, who went where, yesterday’s legends, and challenge callouts.", styles))
    story.append(bullet("This gives you a zero-pressure session type for people who are not ready to play a full grid.", styles))
    story.append(bullet("It also creates shareable social assets and a better top-of-funnel content hook.", styles))

    story.append(Paragraph("6. Survival Expansion", styles["CardHeading"]))
    story.append(bullet("Run themed Survival seasons instead of generic repeats: Blue Bloods, NBA legends, conference-only, draft classes, position clusters.", styles))
    story.append(bullet("Add survivor recap cards and post-cut social sharing to make elimination emotionally sticky instead of invisible.", styles))
    story.append(bullet("Eventually add squad survival or pooled survival picks as an advanced social mode.", styles))

    story.append(Paragraph("What Not To Build Yet", styles["CardHeading"]))
    story.append(bullet("Real-time chat. It is moderation-heavy and not necessary for the next stage of growth.", styles))
    story.append(bullet("A large number of brand-new standalone modes. They will fragment the audience.", styles))
    story.append(bullet("Complex economies or consumables beyond the current freeze logic until retention is healthier.", styles))

    story.append(PageBreak())
    story.append(Paragraph("Implementation Matrix", styles["SectionHeading"]))
    story.append(
        matrix_table(
            [
                ["Initiative", "Uses existing systems", "Product lift", "Expected payoff"],
                ["Favorites + personalized push", "Profile, push, daily content", "Low to medium", "High"],
                ["Direct score challenge links", "Share flow, home, daily result", "Low", "High"],
                ["Weekly squad quests", "Squads, leaderboards, profile", "Medium", "High"],
                ["Season collection refresh", "Collection, badges, recap", "Medium", "Medium to high"],
                ["Event-week programming", "Cron, daily generation, guides, recap", "Medium", "High"],
                ["Swipeable recap cards", "Recap, share card, guides", "Medium", "Medium"],
                ["Themed survival seasons", "Survival, player metadata", "Low to medium", "Medium"],
            ],
            [2.1 * inch, 1.8 * inch, 1.0 * inch, 1.5 * inch],
            styles,
        )
    )

    story.append(Spacer(1, 0.12 * inch))
    story.append(Paragraph("Recommended Sequence", styles["CardHeading"]))
    story.append(bullet("Week 1: favorites, challenge links, event tagging strategy.", styles))
    story.append(bullet("Week 2: squad quests and first personalized push experiments.", styles))
    story.append(bullet("Week 3: collection refresh and visible weekly goals.", styles))
    story.append(bullet("Week 4: first event week with recap and social assets.", styles))

    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("Bottom Line", styles["SectionHeading"]))
    story.append(
        Paragraph(
            "Your best path forward is not to make the app larger. It is to make the current product more alive. If every user gets a more personal reason to return, a clearer social reason to invite someone, and a more forgiving sense of progress even when they do not win, growth should become much less dependent on constant new-feature invention.",
            styles["BodySmall"],
        )
    )
    story.append(
        Paragraph(
            "Suggested first build: favorites plus direct challenge links plus weekly squad quests. That combination is the fastest way to improve retention and word-of-mouth at the same time.",
            styles["Caption"],
        )
    )

    return story


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT_PATH),
        pagesize=letter,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.7 * inch,
        title="Saturday to Sunday Growth Roadmap",
        author="OpenAI Codex",
    )
    doc.build(build_story(), onFirstPage=page_number, onLaterPages=page_number)
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()
