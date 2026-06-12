import Link from 'next/link'
import { Trophy } from 'lucide-react'
import CreatorChallengeForm from '@/components/CreatorChallengeForm'

export default function CreatorPage() {
  return (
    <main className="min-h-[100dvh] bg-slate-950 text-white p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-cyan-300 text-slate-950 flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Saturday To Sunday</p>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Build A School Challenge</h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Generate a custom alumni challenge link for your followers. The game stays the same; the page copy and tracking are tailored to your school.
          </p>
        </div>

        <CreatorChallengeForm />

        <div className="text-center">
          <Link href="/" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white">
            Back to the game
          </Link>
        </div>
      </div>
    </main>
  )
}
