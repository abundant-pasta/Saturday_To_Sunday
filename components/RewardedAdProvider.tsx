'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface RewardedAdContextType {
    adReady: boolean
    isLoadingAd: boolean
    showAd: () => Promise<boolean>
    lastRewardGranted: boolean
    initializeAd: () => void
}

const RewardedAdContext = createContext<RewardedAdContextType | null>(null)

export const useRewardedAd = () => {
    const context = useContext(RewardedAdContext)
    if (!context) {
        throw new Error('useRewardedAd must be used within RewardedAdProvider')
    }
    return context
}

interface RewardedAdProviderProps {
    children: React.ReactNode
}

export function RewardedAdProvider({ children }: RewardedAdProviderProps) {
    const [adReady, setAdReady] = useState(false)
    const [isLoadingAd, setIsLoadingAd] = useState(false)
    const [lastRewardGranted, setLastRewardGranted] = useState(false)
    const [rewardedSlot, setRewardedSlot] = useState<any>(null)

    const initializeAd = useCallback(() => {
        if (typeof window === 'undefined') return

        // Check if GPT is already loaded
        if ((window as any).googletag && (window as any).googletag.apiReady) {
            setupRewardedSlot()
            return
        }

        // Load GPT script if not already loaded
        const script = document.createElement('script')
        script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js'
        script.async = true
        script.onload = () => {
            setupRewardedSlot()
        }
        document.head.appendChild(script)
    }, [])

    const setupRewardedSlot = () => {
        const googletag = (window as any).googletag || {}
        googletag.cmd = googletag.cmd || []

        googletag.cmd.push(() => {
            const adUnitPath = process.env.NEXT_PUBLIC_REWARDED_AD_UNIT_PATH || '/test/rewarded'

            const slot = googletag.defineOutOfPageSlot(
                adUnitPath,
                googletag.enums.OutOfPageFormat.REWARDED
            )

            if (slot) {
                // Event listener for when ad is loaded
                slot.addService(googletag.pubads())

                // Enable test mode for development/testing (works before Ad Manager approval)
                googletag.pubads().setPrivacySettings({
                    restrictDataProcessing: true,
                })

                // Request non-personalized ads for testing
                googletag.pubads().setRequestNonPersonalizedAds(1)

                // Rewarded event listeners
                googletag.pubads().addEventListener('rewardedSlotReady', (event: any) => {
                    console.log('Rewarded ad ready')
                    setAdReady(true)
                })

                googletag.pubads().addEventListener('rewardedSlotGranted', (event: any) => {
                    console.log('Reward granted!')
                    setLastRewardGranted(true)
                    setIsLoadingAd(false)
                })

                googletag.pubads().addEventListener('rewardedSlotClosed', (event: any) => {
                    console.log('Rewarded ad closed')
                    setIsLoadingAd(false)
                    // Don't set reward granted if they didn't watch the full ad
                })

                googletag.enableServices()
                setRewardedSlot(slot)
            } else {
                console.error('Failed to create rewarded ad slot')
            }
        })
    }

    const showAd = useCallback((): Promise<boolean> => {
        return new Promise((resolve) => {
            if (!rewardedSlot) {
                console.error('Rewarded slot not initialized')
                resolve(false)
                return
            }

            setIsLoadingAd(true)
            setLastRewardGranted(false)

            const googletag = (window as any).googletag

            // Set up one-time listeners for this ad show
            const grantedListener = (event: any) => {
                console.log('Ad watched successfully, reward granted')
                googletag.pubads().removeEventListener('rewardedSlotGranted', grantedListener)
                googletag.pubads().removeEventListener('rewardedSlotClosed', closedListener)
                setLastRewardGranted(true)
                setIsLoadingAd(false)
                resolve(true)
            }

            const closedListener = (event: any) => {
                console.log('Ad closed without completion')
                googletag.pubads().removeEventListener('rewardedSlotGranted', grantedListener)
                googletag.pubads().removeEventListener('rewardedSlotClosed', closedListener)
                setIsLoadingAd(false)
                // If reward wasn't granted, resolve false
                if (!lastRewardGranted) {
                    resolve(false)
                }
            }

            googletag.pubads().addEventListener('rewardedSlotGranted', grantedListener)
            googletag.pubads().addEventListener('rewardedSlotClosed', closedListener)

            // Display the ad
            googletag.pubads().display(rewardedSlot)
        })
    }, [rewardedSlot, lastRewardGranted])

    useEffect(() => {
        initializeAd()
    }, [initializeAd])

    return (
        <RewardedAdContext.Provider
            value={{
                adReady,
                isLoadingAd,
                showAd,
                lastRewardGranted,
                initializeAd
            }}
        >
            {children}
        </RewardedAdContext.Provider>
    )
}
