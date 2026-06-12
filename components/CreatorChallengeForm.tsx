'use client'

import { useState, useTransition } from 'react'
import { Copy, Loader2, Send } from 'lucide-react'
import { createCreatorLead } from '@/app/actions/outreach'
import { Button } from '@/components/ui/button'

export default function CreatorChallengeForm() {
  const [school, setSchool] = useState('Duke')
  const [sport, setSport] = useState<'football' | 'basketball' | 'both'>('basketball')
  const [platform, setPlatform] = useState('Instagram')
  const [email, setEmail] = useState('')
  const [handle, setHandle] = useState('')
  const [result, setResult] = useState<{ campaignUrl: string; shareCopy: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    startTransition(async () => {
      try {
        const response = await createCreatorLead({ school, sport, platform, email, handle })
        setResult(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create challenge.')
      }
    })
  }

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
  }

  return (
    <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="School" value={school} onChange={setSchool} />
        <label className="space-y-1">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Sport</span>
          <select value={sport} onChange={(event) => setSport(event.target.value as any)} className="w-full h-11 rounded-lg bg-slate-950 border border-slate-800 px-3 text-sm text-white">
            <option value="football">Football</option>
            <option value="basketball">Basketball</option>
            <option value="both">Both</option>
          </select>
        </label>
        <Field label="Platform" value={platform} onChange={setPlatform} />
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <div className="md:col-span-2">
          <Field label="Handle or page name" value={handle} onChange={setHandle} />
        </div>
      </div>

      <Button onClick={submit} disabled={isPending} className="w-full h-12 rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200 font-black uppercase tracking-widest">
        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
        Create Challenge Link
      </Button>

      {error && <p className="text-sm text-red-300 rounded-lg border border-red-400/20 bg-red-400/10 p-3">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200/80">Challenge URL</p>
            <p className="mt-1 text-sm font-mono break-all text-white">{result.campaignUrl}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200/80">Share Copy</p>
            <p className="mt-1 text-sm text-cyan-50">{result.shareCopy}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => copy(result.campaignUrl)} className="flex-1 bg-slate-950 border border-slate-700 text-white hover:bg-slate-800">
              <Copy className="w-4 h-4 mr-2" /> Copy Link
            </Button>
            <Button onClick={() => copy(result.shareCopy)} className="flex-1 bg-slate-950 border border-slate-700 text-white hover:bg-slate-800">
              <Copy className="w-4 h-4 mr-2" /> Copy Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-11 rounded-lg bg-slate-950 border border-slate-800 px-3 text-sm text-white focus:outline-none focus:border-cyan-300"
      />
    </label>
  )
}
