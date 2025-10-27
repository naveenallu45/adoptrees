import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AdminShell from "@/components/AdminShell";
import AuthProvider from "@/components/Auth/AuthProvider";
import QueryProvider from "@/components/QueryProvider";
import { CartProvider } from "@/contexts/CartContext";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Adoptrees - Plant a Tree, Make a Difference",
    template: "%s | Adoptrees"
  },
  description: "Adopt a tree or gift one to a friend and contribute to a Greener India. Join our mission to create a sustainable future through tree adoption and environmental conservation.",
  keywords: ["tree adoption", "environmental conservation", "sustainability", "green india", "tree planting", "eco-friendly", "carbon offset"],
  authors: [{ name: "Adoptrees Team" }],
  creator: "Adoptrees",
  publisher: "Adoptrees",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://adoptrees.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Adoptrees - Plant a Tree, Make a Difference',
    description: 'Adopt a tree or gift one to a friend and contribute to a Greener India. Join our mission to create a sustainable future.',
    siteName: 'Adoptrees',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Adoptrees - Tree Adoption Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Adoptrees - Plant a Tree, Make a Difference',
    description: 'Adopt a tree or gift one to a friend and contribute to a Greener India.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              <ErrorBoundary>
                <AdminShell>{children}</AdminShell>
              </ErrorBoundary>
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
