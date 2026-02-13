import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/react'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// 1. New Viewport Export (Critical for PWA "App Feel")
export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents zooming on text inputs
}

export const metadata: Metadata = {
  title: 'Saturday to Sunday',
  description: 'Test your College Football knowledge.',
  // manifest: '/manifest.json', // REMOVED: Next.js auto-generates this from app/manifest.ts

  appleWebApp: {
    title: 'S2S',
    statusBarStyle: 'black-translucent',
    capable: true, // <--- Removes Safari browser bars
  },

  icons: {
    icon: '/ios-icon.png',       // Browser tab
    apple: '/ios-icon.png',      // iPhone Home Screen
  },
}

import { UIProvider } from '@/context/UIContext'
import GlobalHeader from '@/components/GlobalHeader'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* --- Google Analytics (GA4) --- */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-9ZR4V6KFK6"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-9ZR4V6KFK6');
          `}
        </Script>

        {/* --- Google Publisher Tag (GPT) for Rewarded Ads --- */}
        <Script
          async
          src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"
          strategy="afterInteractive"
        />

        {/* --- Google AdSense --- */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1391949394286453"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UIProvider>
          <GlobalHeader />
          {children}
        </UIProvider>

        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  )
}