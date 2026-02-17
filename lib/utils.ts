import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Trophy, Star, Shield, Medal, Skull } from 'lucide-react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getRankTitle = (score: number, sport: 'football' | 'basketball') => {
  if (sport === 'football') {
    if (score >= 1100) return { title: "Heisman Hopeful", icon: Trophy }
    if (score >= 700) return { title: "All-American", icon: Medal }
    if (score >= 300) return { title: "Varsity Starter", icon: Star }
    if (score > 0) return { title: "Practice Squad", icon: Shield }
    return { title: "Redshirt", icon: Skull }
  } else {
    if (score >= 1100) return { title: "MVP Contender", icon: Trophy }
    if (score >= 700) return { title: "All-Star", icon: Medal }
    if (score >= 300) return { title: "Starting 5", icon: Star }
    if (score > 0) return { title: "6th Man", icon: Shield }
    return { title: "G-League", icon: Skull }
  }
}