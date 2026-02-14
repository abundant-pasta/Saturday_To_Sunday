'use client'

import { useState } from 'react'
import { joinTournament } from '@/app/actions/survival'
import { useRouter } from 'next/navigation'

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
            <div className="text-center p-6 bg-green-500/20 border border-green-500 rounded-xl">
                <h3 className="text-2xl font-bold text-green-400 mb-2">You are registered!</h3>
                <p className="text-gray-300">Get ready for Day 1 on Thursday.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full md:w-auto px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white text-xl font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-orange-900/50"
            >
                {loading ? 'Joining...' : 'Join Tournament'}
            </button>
            {message && (
                <p className={`text-sm ${message.includes('Success') ? 'text-green-400' : 'text-red-400'}`}>
                    {message}
                </p>
            )}
        </div>
    )
}
