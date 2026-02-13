'use client'

import React, { createContext, useContext, useState } from 'react'

interface UIContextType {
    isHeaderHidden: boolean
    setHeaderHidden: (hidden: boolean) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [isHeaderHidden, setHeaderHidden] = useState(false)

    return (
        <UIContext.Provider value={{ isHeaderHidden, setHeaderHidden }}>
            {children}
        </UIContext.Provider>
    )
}

export function useUI() {
    const context = useContext(UIContext)
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider')
    }
    return context
}
