import { createRoom, joinRoom } from './actions'
import { Trophy, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col items-center space-y-2 text-center">
        <Trophy className="w-12 h-12 text-yellow-400" />
        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-white drop-shadow-sm">
          Saturday to Sunday
        </h1>
        <p className="text-lg font-medium text-slate-400">
          Guess the college. Beat your friends.
        </p>
      </div>

      {/* HOST A GAME CARD */}
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Users className="w-6 h-6 mr-2" />
            Host a Game
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRoom} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="host-name" className="text-slate-400">YOUR NAME</Label>
              <Input 
                id="host-name" 
                name="playerName" 
                placeholder="e.g. SickosMode" 
                className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-600"
                required
              />
            </div>
            <Button 
              type="submit"
              className="w-full text-lg font-bold uppercase bg-blue-600 hover:bg-blue-700"
            >
              Create Room
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* JOIN A GAME CARD */}
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">
            Join a Game
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={joinRoom} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="join-name" className="text-slate-400">YOUR NAME</Label>
                <Input 
                  id="join-name" 
                  name="playerName" 
                  placeholder="Player 2" 
                  className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-600"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-code" className="text-slate-400">ROOM CODE</Label>
                <Input 
                  id="room-code" 
                  name="code" 
                  placeholder="ABCD" 
                  className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 uppercase text-center font-mono"
                  required
                  maxLength={4}
                />
              </div>
            </div>
            <Button 
              type="submit"
              className="w-full text-lg font-bold uppercase bg-green-600 hover:bg-green-700 text-white"
            >
              Enter Room
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}