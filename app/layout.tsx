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
  manifest: '/manifest.json', // <--- Links to your PWA config
  
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

        {/* --- Google AdSense --- */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUBLISHER_ID_HERE"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        
        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  )
}