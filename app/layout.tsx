// C:\Users\vizir\VizirPro\app\layout.tsx

import './globals.css';
import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import Navigation from '@/components/Navigation';
import { AuthProvider } from '@/lib/useAuth';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-roboto-mono',
});

export const metadata: Metadata = {
  title: 'Vizir Film Pro - AI-Powered Film Production Suite',
  description:
    'Complete film production toolkit with AI-powered script generation, storyboarding, budgeting, and more.',
  icons: {
    icon: '/app/icon.jpg',
    shortcut: '/app/icon.jpg',
    apple: '/app/icon.jpg',
  },
  keywords: ['film production', 'AI screenplay', 'storyboard generator', 'film budgeting', 'movie production', 'script writing'],
  authors: [{ name: 'Vizir Film Pro' }],
  openGraph: {
    title: 'Vizir Film Pro - AI-Powered Film Production Suite',
    description: 'Complete film production toolkit with AI-powered script generation, storyboarding, budgeting, and more.',
    type: 'website',
    images: ['/images/vizir_logo/vizir_logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vizir Film Pro - AI-Powered Film Production Suite',
    description: 'Complete film production toolkit with AI-powered script generation, storyboarding, budgeting, and more.',
    images: ['/images/vizir_logo/vizir_logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="font-sans min-h-screen bg-[#091416] text-[#E8ECF0] antialiased">
        <AuthProvider>
          <Navigation />
          <main className="min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
