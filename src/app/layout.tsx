import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Work_Sans, Nunito_Sans } from "next/font/google";
import "./globals.css";
import AdminShell from "@/components/AdminShell";
import AuthProvider from "@/components/Auth/AuthProvider";
import QueryProvider from "@/components/QueryProvider";
import { CartProvider } from "@/contexts/CartContext";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  display: "swap",
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
  icons: {
    icon: '/favicon.ico',
    apple: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/w_180,h_180,c_fill,r_max/v1763716774/WhatsApp_Image_2025-11-21_at_10.35.39_AM_wvwvdy_e_background_removal_f_png.jpg_szp33f.png',
    shortcut: '/favicon.ico',
  },
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
        className={`${inter.variable} ${jetbrainsMono.variable} ${workSans.variable} ${nunitoSans.variable} antialiased`}
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
