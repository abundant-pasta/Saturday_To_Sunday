import { createRoom, joinRoom } from './actions'
import { Trophy, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="space-y-2 text-center">
        <h1 className="text-6xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 drop-shadow-sm">
          Saturday to Sunday
        </h1>
        <p className="text-xl font-medium text-slate-500 uppercase tracking-widest">
          The Ultimate College-to-Pro Trivia
        </p>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col w-full max-w-sm gap-4">
        
        {/* CREATE ROOM */}
        <form action={createRoom}>
          <Button 
            size="lg" 
            className="w-full h-16 text-2xl font-black italic uppercase bg-blue-600 hover:bg-blue-700 shadow-xl transition-transform hover:-translate-y-1"
          >
            <Trophy className="w-8 h-8 mr-2 text-yellow-400" />
            Start New Game
          </Button>
        </form>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 font-bold text-sm uppercase">Or</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* JOIN ROOM */}
        <form action={joinRoom} className="flex gap-2">
          <input 
            name="code" 
            placeholder="ENTER ROOM CODE..." 
            className="flex-1 px-4 font-bold text-center uppercase border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none bg-slate-50"
          />
          <Button type="submit" size="lg" variant="outline" className="font-bold border-2">
            <Users className="w-5 h-5" />
          </Button>
        </form>

      </div>
    </div>
  )
}