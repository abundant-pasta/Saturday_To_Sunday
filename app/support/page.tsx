import Link from 'next/link'
import { ArrowLeft, HelpCircle, Mail, MessageSquare, Shield, Zap, Trophy } from 'lucide-react'

export default function SupportPage() {
    const faqs = [
        {
            question: "What is Saturday to Sunday?",
            answer: "Saturday to Sunday is a daily sports trivia game that challenges fans to identify the college origins of professional NFL and NBA players. It bridges the gap between 'Saturday' (College) and 'Sunday' (Pro)."
        },
        {
            question: "How do I play?",
            answer: "Every day, a new roster of players is released. You have 1 second called the 'Huddle' to process the player before the points begin to decay. Identify the college as fast as possible to maximize your score."
        },
        {
            question: "What is a Streak Freeze?",
            answer: "A Streak Freeze protects your daily streak if you miss a day of play. You can earn freezes in your Profile section by engaging with community content. You can hold one freeze per sport at a time."
        },
        {
            question: "How is the leaderboard calculated?",
            answer: "Scoring is based on a base value (100 pts) multiplied by the player's difficulty tier (1x, 1.5x, or 2x), adjusted by how quickly you answer after the 1-second huddle ends."
        },
        {
            question: "I found a data error, what should I do?",
            answer: "We strive for 100% accuracy in player data. If you spot a college mismatch or a broken image, please email us at support@playsaturdaytosunday.com with the player's name."
        }
    ]

    return (
        <div className="min-h-[100dvh] bg-neutral-950 text-neutral-200 font-sans p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-12">

                {/* Header */}
                <div className="space-y-4 border-b border-neutral-800 pb-8">
                    <Link href="/" className="inline-flex items-center text-[#00ff80] hover:text-[#00ff80]/80 font-bold uppercase tracking-widest text-xs mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Game
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter">
                        Support <span className="text-[#00ff80]">& FAQ</span>
                    </h1>
                    <p className="text-neutral-500 font-bold text-sm uppercase tracking-widest">
                        Everything you need to master the transition from Saturday to Sunday.
                    </p>
                </div>

                {/* Contact Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
                        <div className="bg-[#00ff80]/10 w-10 h-10 rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-[#00ff80]" />
                        </div>
                        <h3 className="font-black uppercase italic tracking-tighter text-white">Email Support</h3>
                        <p className="text-sm text-neutral-500">Response time usually within 24 hours.</p>
                        <a href="mailto:support@playsaturdaytosunday.com" className="block text-[#00ff80] font-bold hover:underline underline-offset-4">
                            support@playsaturdaytosunday.com
                        </a>
                    </div>
                    <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
                        <div className="bg-amber-500/10 w-10 h-10 rounded-lg flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-amber-500" />
                        </div>
                        <h3 className="font-black uppercase italic tracking-tighter text-white">Game Guides</h3>
                        <p className="text-sm text-neutral-500">In-depth mechanics and strategy articles.</p>
                        <Link href="/guides" className="block text-amber-500 font-bold hover:underline underline-offset-4">
                            Visit Learning Center →
                        </Link>
                    </div>
                </div>

                {/* FAQ Section */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
                        <HelpCircle className="w-6 h-6 text-[#00ff80]" /> Frequently Asked Questions
                    </h2>
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl hover:border-neutral-700 transition-colors">
                                <h4 className="font-bold text-white mb-2">{faq.question}</h4>
                                <p className="text-sm text-neutral-400 leading-relaxed">{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Policy Links */}
                <section className="pt-12 border-t border-neutral-900 flex flex-wrap gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                    <Link href="/termsofservice" className="hover:text-white transition-colors">Terms of Service</Link>
                    <Link href="/guides" className="hover:text-white transition-colors">Official Rules</Link>
                </section>

                <p className="text-center text-[10px] text-neutral-800 font-black uppercase tracking-[0.3em] py-8">
                    © 2026 Saturday to Sunday. All Rights Reserved.
                </p>
            </div>
        </div>
    )
}
