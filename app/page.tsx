import { createRoom, joinRoom } from './actions'
import { Trophy, Users } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
             <Trophy className="h-12 w-12 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">
            Saturday to Sunday
          </h1>
          <p className="text-slate-400">Guess the college. Beat your friends.</p>
        </div>

        {/* Create Room Form */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" /> Host a Game
          </h2>
          <form action={createRoom} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Your Name</label>
              <input 
                name="username" 
                required 
                placeholder="e.g. SickosMode"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition">
              Create Room
            </button>
          </form>
        </div>

        {/* Join Room Form */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
           <h2 className="text-xl font-bold mb-4">Join a Game</h2>
           <form action={joinRoom} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Your Name</label>
                <input 
                  name="username" 
                  required 
                  placeholder="Player 2"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Room Code</label>
                <input 
                  name="code" 
                  required 
                  maxLength={4}
                  placeholder="ABCD"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none uppercase tracking-widest text-center"
                />
              </div>
            </div>
            <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition">
              Enter Room
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}