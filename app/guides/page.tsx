'use client'

import Link from 'next/link'
import { ChevronLeft, BookOpen, Clock, ArrowRight, Star, Zap, Users, Trophy, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GUIDE_ARTICLES } from '@/lib/guides-data'

const CATEGORY_ICONS: Record<string, any> = {
    'Gameplay': Flame,
    'Strategy': Zap,
    'Features': Users,
    'Trivia Lore': BookOpen,
    'Analysis': Star
}

export default function GuidesPage() {
    const manualArticles = GUIDE_ARTICLES.filter(a => a.section === 'guides')
    const infoArticles = GUIDE_ARTICLES.filter(a => a.section === 'info')

    return (
        <div className="min-h-[100dvh] bg-neutral-950 text-white font-sans p-4 pb-20">
            {/* HEADER */}
            <div className="max-w-4xl mx-auto mb-12 pt-16">
                <div className="text-center">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">Learning <span className="text-[#00ff80]">Center</span></h1>
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">Official Manual & Deep Dives</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-16">
                {/* SECTION 1: GAME MANUAL */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#00ff80]/20 to-transparent" />
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#00ff80] px-4">Game Manual & Guides</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#00ff80]/20 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {manualArticles.map((guide) => {
                            const Icon = CATEGORY_ICONS[guide.category] || BookOpen
                            return (
                                <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group">
                                    <div className="h-full bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 hover:border-[#00ff80]/40 hover:bg-neutral-900 transition-all duration-300 flex flex-col gap-4 shadow-xl">
                                        <div className="flex items-center justify-between">
                                            <div className="bg-[#00ff80]/10 p-2 rounded-lg">
                                                <Icon className="w-5 h-5 text-[#00ff80]" />
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                                <Clock className="w-3 h-3" />
                                                {guide.readTime}
                                            </div>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <h2 className="text-xl font-black text-white group-hover:text-[#00ff80] transition-colors leading-tight uppercase italic tracking-tighter">
                                                {guide.title}
                                            </h2>
                                            <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed">
                                                {guide.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-[#00ff80] pt-2">
                                            Open Manual <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </section>

                {/* SECTION 2: LORE & ANALYSIS */}
                <section className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-400/20 to-transparent" />
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-sky-400 px-4">Sports Lore & Analysis</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-400/20 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {infoArticles.map((guide) => {
                            const Icon = CATEGORY_ICONS[guide.category] || Star
                            return (
                                <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group">
                                    <div className="h-full bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 hover:border-sky-400/40 hover:bg-neutral-900 transition-all duration-300 flex flex-col gap-4 shadow-xl">
                                        <div className="flex items-center justify-between">
                                            <div className="bg-sky-400/10 p-2 rounded-lg">
                                                <Icon className="w-5 h-5 text-sky-400" />
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                                                <Clock className="w-3 h-3" />
                                                {guide.readTime}
                                            </div>
                                        </div>
                                        <div className="space-y-2 flex-1">
                                            <h2 className="text-xl font-black text-white group-hover:text-sky-400 transition-colors leading-tight uppercase italic tracking-tighter">
                                                {guide.title}
                                            </h2>
                                            <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed">
                                                {guide.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-sky-400 pt-2">
                                            Read Deep Dive <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </section>

                {/* SEO TEXT BLOCK FOR BOTS */}
                <div className="mt-16 p-8 border-t border-neutral-900/50 text-neutral-500 text-xs leading-relaxed max-w-2xl mx-auto text-center">
                    <h3 className="text-neutral-400 font-bold mb-4 uppercase tracking-[0.2em]">About the S2S Knowledge Base</h3>
                    <p className="mb-4">
                        Welcome to the official information hub for Saturday to Sunday. Our Learning Center is divided into two cores: the **Game Manual**, which details the mechanics of our sports origin trivia, and **Lore & Analysis**, which explores the deep histories and drafting patterns of the NFL and NBA. Built for the dedicated fan who understands that every legend has a collegiate beginning.
                    </p>
                </div>
            </div>
        </div>
    )
}
