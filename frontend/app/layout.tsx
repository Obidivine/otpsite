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
  title: 'OTP Reseller — Foreign phone numbers for OTP verification',
  description: 'Get instant access to US, UK, and European phone numbers for verifying accounts.',
  manifest: "/manifest.ts", // <--- ADDED THIS
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
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col`}>
        <Providers>
		<ServiceWorkerRegister /> 
          {children}
        </Providers>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}