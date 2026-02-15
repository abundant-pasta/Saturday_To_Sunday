import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-neutral-200 font-sans p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-4 border-b border-neutral-800 pb-8">
          <h1 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter">
            Privacy <span className="text-[#00ff80]">Policy</span>
          </h1>
          <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">
            Last Updated: January 6, 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-neutral max-w-none space-y-8">
          <p className="text-lg leading-relaxed text-neutral-300">
            Welcome to <strong>Saturday to Sunday</strong> ("we," "our," or "us"). We respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, and safeguard your data when you use our website (playsaturdaytosunday.com).
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">1. Information We Collect</h2>

            <h3 className="text-lg font-bold text-[#00ff80] uppercase tracking-wide">A. Information You Provide</h3>
            <p>When you sign in using Google, we collect the following information provided by that service:</p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-400">
              <li><strong>Email Address:</strong> To authenticate your account and recover it.</li>
              <li><strong>Name:</strong> To display on your profile.</li>
              <li><strong>Profile Picture:</strong> To display as your avatar (optional).</li>
            </ul>

            <h3 className="text-lg font-bold text-[#00ff80] uppercase tracking-wide mt-6">B. Automatically Collected Information</h3>
            <ul className="list-disc pl-5 space-y-2 text-neutral-400">
              <li><strong>Gameplay Data:</strong> We record your daily scores, streaks, answers, and time taken to generate leaderboards and personal stats.</li>
              <li><strong>Device Information:</strong> We may collect basic information about your browser or device type to ensure the game works correctly (e.g., mobile vs. desktop).</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">2. How We Use Your Information</h2>
            <p>We use your data for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-400">
              <li><strong>To Provide the Service:</strong> Allowing you to log in, save your progress, and maintain your daily streak.</li>
              <li><strong>Leaderboards:</strong> Your Username and Score may be displayed publicly on the daily leaderboard.</li>
              <li><strong>Communication:</strong> We may use your email to respond to support inquiries. We do not send marketing emails without your explicit consent.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">3. Data Sharing and Third Parties</h2>
            <p>We do not sell, trade, or rent your personal information to others. We share data only with trusted service providers who help us operate the app:</p>
            <ul className="list-disc pl-5 space-y-2 text-neutral-400">
              <li><strong>Supabase:</strong> Our database and authentication provider.</li>
              <li><strong>Vercel:</strong> Our hosting provider.</li>
              <li><strong>Google:</strong> For authentication services.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">4. Cookies and Local Storage</h2>
            <p>We use local storage on your device to save your "current game" state (so you don't lose progress if you refresh). We also use cookies for session management (keeping you logged in).</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">5. Data Deletion</h2>
            <p>You have the right to request the deletion of your data. If you wish to delete your account and all associated data, please contact us at <a href="mailto:support@playsaturdaytosunday.com" className="text-[#00ff80] hover:underline">support@playsaturdaytosunday.com</a>.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">6. Children&apos;s Privacy</h2>
            <p>Our service is not intended for individuals under the age of 13. We do not knowingly collect personal information from children under 13.</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">7. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify users of significant changes by updating the "Last Updated" date at the top of this policy.</p>
          </section>

          <section className="space-y-4 border-t border-neutral-800 pt-8">
            <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
            <p className="font-bold text-[#00ff80]">support@playsaturdaytosunday.com</p>
          </section>
        </div>
      </div>
    </div>
  )
}