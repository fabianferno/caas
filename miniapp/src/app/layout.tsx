import { auth } from '@/auth';
import ClientProviders from '@/providers';
import '@worldcoin/mini-apps-ui-kit-react/styles.css';
import type { Metadata } from 'next';
import { Geist, Inter } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const coolvetica = localFont({
  src: './fonts/CoolveticaRg.otf',
  variable: '--font-coolvetica',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CaaS — Spin up AI agents. Pay with World.',
  description:
    'Create and deploy OpenClaw agents on World. Use WLD for compute, x402 transactions, messaging on WhatsApp & Telegram, and more.',
  openGraph: {
    title: 'CaaS — Spin up AI agents. Pay with World.',
    description:
      'Create and deploy OpenClaw agents on World. Use WLD for compute, x402 transactions, and multi-channel messaging.',
    images: ['/site-banner.png'],
    type: 'website',
    siteName: 'CaaS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CaaS — Spin up AI agents. Pay with World.',
    description:
      'Create and deploy OpenClaw agents on World. Use WLD for compute, x402 transactions, and multi-channel messaging.',
    images: ['/site-banner.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  try {
    session = await auth();
  } catch {
    // auth() can fail during static prerendering
  }
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <body className={`${inter.variable} ${coolvetica.variable} font-inter`}>
        <ClientProviders session={session}>{children}</ClientProviders>
      </body>
    </html>
  );
}
