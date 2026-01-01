import type { Metadata, Viewport } from "next"; // <--- Import Viewport
import { Inter } from "next/font/google"; 
import "./globals.css";

const inter = Inter({ subsets: ["latin"] }); 

export const metadata: Metadata = {
  title: "Saturday to Sunday",
  description: "The ultimate college-to-pro football trivia game.",
};

// --- NEW VIEWPORT SETTING ---
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // This stops the zooming
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}