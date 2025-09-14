import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
} from '@clerk/nextjs'
import "./globals.css";
import NavBar from "@/componets/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChessAgine - AI-Powered Chess Training",
  description: "Plug-and-play chess training with your choice of AI provider. Convert OpenAI, Claude, or Gemini model into chess-aware Chessbuddy and get personalized live chat training. ChessAgine integrates with Stockfish 17.1 engine, chess databases and to better align with position context, making LLMs chess aware.",
  
  // Open Graph metadata (for Facebook, LinkedIn, Discord, etc.)
  openGraph: {
    title: "ChessAgine - AI-Powered Chess Training",
    description: "Transform any AI model into your personal chessbuddy. Get live training with OpenAI, Claude, or Gemini integrated with Stockfish 17.1 engine.",
    url: "https://www.chessagine.com/", // Replace with your actual domain
    siteName: "ChessAgine",
    images: [
      {
        url: "static/images/agineowl-og.png", // Optional square version (1200x1200px)
        width: 1200,
        height: 1200,
        alt: "ChessAgine Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  
  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    title: "ChessAgine - AI-Powered Chess Training",
    description: "Transform any AI model into your personal chess coach. Get live training with OpenAI, Claude, or Gemini integrated with Stockfish 17.1.",
    images: ["static/images/agineowl-og.png"], // Same image as Open Graph
  },
  
  // Additional metadata
  keywords: [
    "chess training",
    "AI chess coach",
    "OpenAI chess",
    "Claude chess",
    "Gemini chess",
    "Stockfish",
    "chess engine",
    "chess AI",
    "chess tutor",
    "chess learning",
    "chessagine"
  ],
  

 
  // Robots
  // robots: {
  //   index: true,
  //   follow: true,
  //   googleBot: {
  //     index: true,
  //     follow: true,
  //     'max-video-preview': -1,
  //     'max-image-preview': 'large',
  //     'max-snippet': -1,
  //   },
  // },
  
  // Additional Open Graph properties
  other: {
    // For better Discord embeds
    'theme-color': '#8209a3ff', // Replace with your brand color
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* Additional meta tags for better SEO */}
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#000000" />
          <link rel="canonical" href="https://your-domain.com" />
        </head>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <NavBar/>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}