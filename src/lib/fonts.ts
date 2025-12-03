/**
 * Font loader utility that handles Google Fonts loading failures gracefully
 * Falls back to system fonts if Google Fonts can't be fetched during build
 */

import { Inter, JetBrains_Mono, Work_Sans, Nunito_Sans } from "next/font/google";

// Load fonts with fallbacks
// If Google Fonts are unavailable, system fonts will be used
// preload: false prevents build failures if fonts can't be fetched
export const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial", "sans-serif"],
  adjustFontFallback: true,
  preload: false, // Disable preload to prevent build failures
});

export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["Courier New", "monospace"],
  adjustFontFallback: true,
  preload: false, // Disable preload to prevent build failures
});

export const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial", "sans-serif"],
  adjustFontFallback: true,
  preload: false, // Disable preload to prevent build failures
});

export const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial", "sans-serif"],
  adjustFontFallback: true,
  preload: false, // Disable preload to prevent build failures
});

