import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfService() {
  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-neutral-200 font-sans p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-4 border-b border-neutral-800 pb-8">
          <h1 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter">
            Terms of <span className="text-[#00ff80]">Service</span>
          </h1>
          <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">
            Last Updated: January 6, 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-neutral max-w-none space-y-8">
          <p className="text-lg leading-relaxed text-neutral-300">
            Please read these Terms of Service ("Terms") carefully before using <strong>Saturday to Sunday</strong> (the "Service") operated by us. By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">1. Accounts</h2>
            <p>When you create an account with us, you must provide accurate and complete information via Google Sign-In. You are responsible for safeguarding the device you use to access the Service. We reserve the right to terminate accounts that violate these Terms.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">2. Intellectual Property</h2>
            <ul className="list-disc pl-5 space-y-2 text-neutral-400">
              <li><strong>Our Content:</strong> The game code, design, logos, and unique gameplay mechanics are the intellectual property of Saturday to Sunday.</li>
              <li><strong>Third-Party Content:</strong> All NFL, NCAA, and team names, logos, and player images used in this trivia game are the property of their respective owners. They are used here for identification and informational purposes (trivia) only. <strong>Saturday to Sunday is not affiliated with, endorsed by, or sponsored by the NFL, NCAA, or any professional sports team.</strong></li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">3. User Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-400">
              <li>Use bots, scripts, or automated tools to play the game or manipulate the leaderboard.</li>
              <li>Attempt to hack, reverse engineer, or disrupt the Service.</li>
              <li>Harass or abuse other users via display names.</li>
            </ul>
            <p className="mt-2 text-red-400/80 italic">We reserve the right to ban any user found cheating or violating these rules.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">4. Disclaimer of Warranties</h2>
            <p>The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We do not warrant that the Service will be uninterrupted, secure, or error-free.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">5. Limitation of Liability</h2>
            <p>In no event shall Saturday to Sunday, nor its creators, be liable for any indirect, incidental, or consequential damages arising out of your use of the Service.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">6. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the State of Colorado, United States, without regard to its conflict of law provisions.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">7. Changes to Terms</h2>
            <p>We reserve the right to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>
          </section>

          <section className="space-y-4 border-t border-neutral-800 pt-8">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p className="font-bold text-[#00ff80]">support@playsaturdaytosunday.com</p>
          </section>
        </div>
      </div>
    </div>
  )
}