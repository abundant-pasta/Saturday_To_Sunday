'use client'

import { useState, useEffect } from 'react'
import { X, Share, PlusSquare, MoreHorizontal, Download, Compass, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function InstallPwa() {
  const [isOpen, setIsOpen] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isChromeIOS, setIsChromeIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [promptInstall, setPromptInstall] = useState<any>(null)

  useEffect(() => {
    // 1. Check if already installed
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
      setIsStandalone(!!isStandaloneMode)
    }
    
    checkStandalone()
    
    try {
        window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone)
    } catch(e) {
        // Fallback for older browsers
    }

    // 2. Detect iOS & Chrome on iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    const isChrome = /crios/.test(userAgent)
    
    setIsIOS(isIosDevice)
    setIsChromeIOS(isChrome)

    // 3. Listen for Native Install Prompt (Android/Desktop Chrome)
    const handler = (e: any) => {
      e.preventDefault()
      setPromptInstall(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

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
    if (promptInstall) {
        promptInstall.prompt() // Native Prompt (Android/Desktop)
    } else {
        setIsOpen(true) // Open the Manual Instructions Modal (iOS)
    }
  }

  // If installed, show nothing
  if (isStandalone) return null

  return (
    <>
      {/* 1. THE TRIGGER BUTTON (Visible by default) */}
      <Button 
        onClick={handleInstallClick}
        variant="outline"
        className="w-full h-12 border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:bg-neutral-800 hover:text-white font-bold uppercase tracking-widest transition-all"
      >
        <Download className="mr-2 w-4 h-4" /> 
        {isIOS ? "Install App" : "Install App"}
      </Button>

      {/* 2. THE MODAL OVERLAY (Hidden until clicked) */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl animate-in zoom-in-95 duration-200 ring-1 ring-white/10">
            
            <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 bg-[#00ff80]/10 rounded-xl flex items-center justify-center mb-3 border border-[#00ff80]/20">
                    <Smartphone className="w-6 h-6 text-[#00ff80]" />
                </div>
                <h2 className="text-xl font-black italic uppercase text-white tracking-tight">
                    Install App
                </h2>
                <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                    Add <span className="text-white font-bold">Saturday to Sunday</span> to your home screen for full-screen gameplay.
                </p>
            </div>

            {isIOS ? (
                /* --- iOS INSTRUCTIONS --- */
                <div className="space-y-4">
                    {/* Step 1: Share */}
                    <div className="flex items-center gap-4 bg-neutral-800/30 p-3 rounded-xl border border-neutral-800/50">
                        <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center shrink-0 border border-neutral-700 font-bold text-neutral-400 text-sm">
                            1
                        </div>
                        <p className="text-sm text-neutral-300">
                            Tap <span className="text-white font-bold inline-flex items-center mx-1"><Share className="w-3.5 h-3.5 mx-1" /> Share</span> 
                            {isChromeIOS ? " in the address bar" : " in the menu bar"}
                        </p>
                    </div>

                    {/* Step 2: Scroll Down */}
                    <div className="flex items-center gap-4 bg-neutral-800/30 p-3 rounded-xl border border-neutral-800/50">
                        <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center shrink-0 border border-neutral-700 font-bold text-neutral-400 text-sm">
                            2
                        </div>
                        <p className="text-sm text-neutral-300">
                            Scroll down the list of options
                        </p>
                    </div>

                    {/* Step 3: Add */}
                    <div className="flex items-center gap-4 bg-neutral-800/30 p-3 rounded-xl border border-neutral-800/50">
                        <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center shrink-0 border border-neutral-700 font-bold text-neutral-400 text-sm">
                            3
                        </div>
                        <p className="text-sm text-neutral-300">Tap <span className="text-white font-bold inline-flex items-center mx-1"><PlusSquare className="w-3.5 h-3.5 mx-1" /> Add to Home Screen</span></p>
                    </div>
                </div>
            ) : (
                /* --- GENERIC FALLBACK --- */
                <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-neutral-800/30 p-3 rounded-xl border border-neutral-800/50">
                        <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center shrink-0 font-bold text-neutral-400">1</div>
                        <p className="text-sm text-neutral-300">Tap the browser <span className="text-white font-bold inline-flex items-center mx-1"><MoreHorizontal className="w-4 h-4" /> Menu</span> button</p>
                    </div>
                    <div className="flex items-center gap-4 bg-neutral-800/30 p-3 rounded-xl border border-neutral-800/50">
                        <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center shrink-0 font-bold text-neutral-400">2</div>
                        <p className="text-sm text-neutral-300">Select <span className="font-bold text-white">Install App</span> or <span className="font-bold text-white">Add to Home Screen</span></p>
                    </div>
                </div>
            )}

            <Button 
                onClick={() => setIsOpen(false)}
                className="w-full mt-6 h-12 text-black font-bold bg-[#00ff80] hover:bg-[#05ff84]"
            >
                Done
            </Button>
          </div>
        </div>
      )}
    </>
  )
}