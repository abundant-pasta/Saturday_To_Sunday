'use client'

import { useState, useEffect } from 'react'
import { X, Share, PlusSquare, MoreHorizontal, Download, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function InstallPwa() {
  const [isOpen, setIsOpen] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [promptInstall, setPromptInstall] = useState<any>(null)

  useEffect(() => {
    // 1. Check if already installed (Standalone mode)
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
      setIsStandalone(!!isStandaloneMode)
    }
    
    // Run check immediately
    checkStandalone()
    
    // Listen for changes (e.g. if they install and it switches modes instantly)
    try {
        window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone)
    } catch(e) {
        // Fallback for older browsers
    }

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // 3. Listen for Native Install Prompt (Android/Desktop)
    const handler = (e: any) => {
      e.preventDefault() // Prevent the mini-infobar from appearing automatically
      setPromptInstall(e) // Save the event for later triggering
    }
    window.addEventListener('beforeinstallprompt', handler)

    // 4. Listen for Success Event
    const installHandler = () => {
        setIsStandalone(true)
        setPromptInstall(null)
    }
    window.addEventListener('appinstalled', installHandler)

    return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        window.removeEventListener('appinstalled', installHandler)
    }
  }, [])

  const handleInstallClick = (e: any) => {
    e.preventDefault()
    
    // If we captured a native install prompt (Android/Desktop), use it!
    if (promptInstall) {
        promptInstall.prompt()
    } else {
        // Otherwise (iOS or unsupported), show the manual instructions modal
        setIsOpen(true)
    }
  }

  // Hide the button if the app is already installed
  if (isStandalone) return null

  return (
    <>
      {/* TRIGGER BUTTON */}
      <button 
        onClick={handleInstallClick}
        className="text-[10px] uppercase font-bold tracking-widest text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1 mx-auto mt-4"
      >
        <Download className="w-3 h-3" /> Install App for easier access
      </button>

      {/* MODAL OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
            
            <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
                <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-black italic uppercase text-white mb-2">
                Install App
            </h2>
            <p className="text-base text-slate-400 mb-6 leading-snug">
                Add Saturday to Sunday to your home screen for full-screen gameplay.
            </p>

            {isIOS ? (
                /* --- iOS INSTRUCTIONS (Larger Text) --- */
                <div className="space-y-5">
                     {/* Step 1: Safari Check */}
                    <div className="flex items-center gap-4 text-base text-slate-300">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                            <span className="font-bold text-lg">1</span>
                        </div>
                        <p>Make sure you are in <span className="text-blue-400 font-bold inline-flex items-center mx-1"><Compass className="w-4 h-4 mx-1" /> Safari</span></p>
                    </div>

                    {/* Step 2: 3 Dots Menu */}
                    <div className="flex items-center gap-4 text-base text-slate-300">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                            <span className="font-bold text-lg">2</span>
                        </div>
                        <p>Tap the <span className="text-white font-bold inline-flex items-center mx-1"><Share className="w-4 h-4 mx-1" /> Share</span> Button</p>
                    </div>

                    {/* Step 3: Add to Home Screen */}
                    <div className="flex items-center gap-4 text-base text-slate-300">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                            <span className="font-bold text-lg">3</span>
                        </div>
                        <p>Scroll down and tap <span className="text-white font-bold inline-flex items-center mx-1"><PlusSquare className="w-4 h-4 mx-1" /> Add to Home Screen</span></p>
                    </div>
                </div>
            ) : (
                /* --- ANDROID/OTHER FALLBACK INSTRUCTIONS --- */
                /* (Only shows if native prompt fails) */
                <div className="space-y-5">
                    <div className="flex items-center gap-4 text-base text-slate-300">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                            <span className="font-bold text-lg">1</span>
                        </div>
                        <p>Tap the<span className="text-white font-bold inline-flex items-center mx-1"><MoreHorizontal className="w-4 h-4" /> Menu</span></p>
                    </div>
                    <div className="flex items-center gap-4 text-base text-slate-300">
                        <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                            <span className="font-bold text-lg">2</span>
                        </div>
                        <p>Select <span className="font-bold text-white">Install App</span> or <span className="font-bold text-white">Add to Home Screen</span></p>
                    </div>
                </div>
            )}

            <Button 
                onClick={() => setIsOpen(false)}
                className="w-full mt-8 h-12 text-lg bg-indigo-600 hover:bg-indigo-500 font-bold"
            >
                Got it
            </Button>
          </div>
        </div>
      )}
    </>
  )
}