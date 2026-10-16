import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

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
    default: 'OTP Reseller — Foreign phone numbers for OTP verification',
    template: '%s · OTP Reseller',
  },
  description:
    'Get instant access to US, UK, and European phone numbers for verifying WhatsApp, Telegram, Instagram, and TikTok accounts. No SIM card needed.',
  keywords: [
    'OTP',
    'phone verification',
    'virtual numbers',
    'WhatsApp verification',
    'Telegram verification',
    'foreign number',
  ],
  openGraph: {
    type: 'website',
    title: 'OTP Reseller — Foreign phone numbers for OTP verification',
    description:
      'Verify WhatsApp, Telegram, Instagram, and TikTok with US, UK, or European phone numbers. Instant delivery.',
    siteName: 'OTP Reseller',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OTP Reseller — Foreign phone numbers for OTP verification',
    description:
      'Verify WhatsApp, Telegram, Instagram, and TikTok with foreign phone numbers.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}