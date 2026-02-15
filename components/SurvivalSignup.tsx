'use client'

import { useState } from 'react'
import { joinTournament } from '@/app/actions/survival'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Skull, Trophy } from 'lucide-react'

interface SurvivalSignupProps {
    tournamentId: string
    isJoined: boolean
}

export default function SurvivalSignup({ tournamentId, isJoined }: SurvivalSignupProps) {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [joined, setJoined] = useState(isJoined)
    const router = useRouter()

    const handleJoin = async () => {
        setLoading(true)
        setMessage('')

        try {
            const result = await joinTournament(tournamentId)

            if (result.error) {
                setMessage(result.error)
            } else {
                setJoined(true)
                setMessage('Successfully joined! Good luck.')
                router.refresh()
            }
        } catch (e) {
            setMessage('An unexpected error occurred.')
        } finally {
            setLoading(false)
        }
    }

    if (joined) {
        return (
            <div className="w-full p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-500">
                <div className="p-3 bg-emerald-500/20 rounded-full mb-2">
                    <Trophy className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-emerald-400">You Are In</h3>
                <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Prepare for Day 1</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            <Button
                onClick={handleJoin}
                disabled={loading}
                className="w-full h-16 text-xl font-black italic uppercase tracking-widest bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] border-0 rounded-2xl transition-all hover:scale-[1.02] active:scale-95"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Joining...
                    </>
                ) : (
                    <>
                        <Skull className="mr-2 h-6 w-6" />
                        Enter the Arena
                    </>
                )}
            </Button>
            {message && (
                <p className={`text-xs font-bold uppercase tracking-wide ${message.includes('Success') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {message}
                </p>
            )}
        </div>
    )
}
