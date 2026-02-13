import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Clock, Calendar, Share2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GUIDE_ARTICLES } from '@/lib/guides-data'

// This would typically come from a CMS or separate files, 
// for now we'll store content in a lookup or individual components.
// I will create a content mapping helper.
import { getGuideContent } from '../../../lib/guides-content'
import { Metadata } from 'next'

interface GuideArticlePageProps {
    params: Promise<{
        slug: string
    }>
}

export async function generateMetadata({ params }: GuideArticlePageProps): Promise<Metadata> {
    const { slug } = await params
    const guide = GUIDE_ARTICLES.find(a => a.slug === slug)

    if (!guide) return { title: 'Guide Not Found' }

    return {
        title: `${guide.title} | Saturday to Sunday Learning Center`,
        description: guide.description,
        openGraph: {
            title: guide.title,
            description: guide.description,
            type: 'article',
            publishedTime: guide.date,
        }
    }
}

export default async function GuideArticlePage({ params }: GuideArticlePageProps) {
    const { slug } = await params
    const guide = GUIDE_ARTICLES.find(a => a.slug === slug)

    if (!guide) {
        notFound()
    }

    const content = getGuideContent(slug)
    const isManual = guide.section === 'guides'
    const accentColor = isManual ? '#00ff80' : '#38bdf8'
    const accentBg = isManual ? 'bg-[#00ff80]/10' : 'bg-sky-400/10'
    const accentBorder = isManual ? 'border-[#00ff80]/20' : 'border-sky-400/20'
    const accentText = isManual ? 'text-[#00ff80]' : 'text-sky-400'
    const progressColor = isManual ? 'bg-[#00ff80]' : 'bg-sky-400'

    return (
        <div className="min-h-[100dvh] bg-neutral-950 text-white font-sans p-4 pb-20">
            {/* PROGRESS BAR (Sticky) */}
            <div className="fixed top-0 left-0 w-full h-1 bg-neutral-900 z-50">
                <div className={`h-full ${progressColor} w-0 transition-all duration-300`} id="scroll-progress" />
            </div>

            <div className="max-w-3xl mx-auto pt-16">

                {/* ARTICLE HEADER */}
                <header className="space-y-6 mb-12">
                    <div className="flex flex-col gap-4">
                        {/* BREADCRUMBS */}
                        <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                            <Link href="/" className="hover:text-white transition-colors">Home</Link>
                            <span className="text-neutral-700">/</span>
                            <Link href="/guides" className="hover:text-white transition-colors">Guides</Link>
                            <span className="text-neutral-700">/</span>
                            <span className={accentText}>{guide.category}</span>
                        </nav>

                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full ${accentBg} ${accentText} text-[10px] font-black uppercase tracking-widest border ${accentBorder}`}>
                                {guide.category}
                            </span>
                            <div className="flex items-center gap-4 text-neutral-500 text-[10px] font-bold uppercase tracking-widest">
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" /> {guide.readTime}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3" /> {guide.date}
                                </span>
                            </div>
                        </div>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-white">
                        {guide.title}
                    </h1>

                    <p className={`text-xl text-neutral-400 font-medium leading-relaxed italic border-l-4 ${isManual ? 'border-[#00ff80]' : 'border-sky-400'} pl-6 py-2`}>
                        {guide.description}
                    </p>
                </header>

                {/* ARTICLE CONTENT */}
                <article className="max-w-none text-neutral-300 leading-relaxed text-lg pb-12">
                    {content}
                </article>

                {/* FOOTER ACTION */}
                <div className="mt-20 p-8 rounded-3xl bg-neutral-900 border border-neutral-800 text-center space-y-6 shadow-2xl">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Ready to test your knowledge?</h3>
                    <p className="text-neutral-400">Put what you've learned into practice and start your daily streak today.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button asChild className={`${isManual ? 'bg-[#00ff80] hover:bg-[#05ff84]' : 'bg-sky-400 hover:bg-sky-300'} text-black font-black h-12 px-8 rounded-xl shadow-xl`}>
                            <Link href="/daily">PLAY FOOTBALL MODE 🏈</Link>
                        </Button>
                        <Button asChild variant="outline" className="border-amber-500 text-amber-500 hover:bg-amber-500/10 font-black h-12 px-8 rounded-xl">
                            <Link href="/daily/basketball">PLAY BASKETBALL MODE 🏀</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
