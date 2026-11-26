// frontend/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; 
import { Toaster } from "@/components/ui/sonner"; 
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'OTP360 | Buy Foreign Numbers for OTP Verification',
  description: 'Get verification numbers at cheap rates. US/UK WhatsApp from ₦2,200, Signal from ₦1,850, Telegram from ₦1,950. Pay in Naira, receive codes instantly.',
  
  openGraph: {
    title: 'OTP360 | Cheap Foreign Numbers for OTP',
    description: 'Foreign WhatsApp from ₦2,200, Signal from ₦1,850, Telegram from ₦1,950. Pay in Naira and get your code instantly.',
    url: 'https://otp360.store',
    siteName: 'OTP360.store',
    locale: 'en_NG',
    type: 'website',
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'OTP360 | Cheap Foreign Numbers for OTP',
    description: 'Foreign WhatsApp from ₦2,200, Signal from ₦1,850, Telegram from ₦1,950. Pay in Naira and get your code instantly.',
  },
  
  manifest: "/manifest.ts",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OTP360",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb", // <--- ADDED THIS
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
     <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col bg-slate-950 text-slate-50 text-base antialiased`}>
        <Providers>
		<ServiceWorkerRegister /> 
          {children}
        </Providers>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}