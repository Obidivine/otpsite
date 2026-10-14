// frontend/app/page.tsx
'use client';

import Link from 'next/link';
import { LandingHeader } from '@/components/LandingHeader';
import { LandingFooter } from '@/components/LandingFooter';
import { useCatalog } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Phone,
  MessageSquare,
  CheckCircle2,
  Zap,
  Shield,
  TrendingUp,
} from 'lucide-react';

const SUPPORTED_SERVICES = [
  { name: 'WhatsApp', id: 'whatsapp' },
  { name: 'Telegram', id: 'telegram' },
  { name: 'Instagram', id: 'instagram' },
  { name: 'TikTok', id: 'tiktok' },
  { name: 'Signal', id: 'signal' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <LandingHeader />
      <main>
        <Hero />
        <HowItWorks />
        <SupportedServices />
        <PricingPreview />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mb-6">
          <Zap className="h-3.5 w-3.5" />
          Instant delivery · 98% success rate
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
          Foreign phone numbers
          <br />
          <span className="text-blue-600">for OTP verification</span>
        </h1>

        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          Verify your WhatsApp, Telegram, Instagram, or TikTok account with a
          US, UK, or European number. No SIM card needed. No roaming. Just fast,
          reliable delivery.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started — From $1.00
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign In
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          No credit card required to create an account
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Phone,
      title: 'Pick a number',
      body: 'Choose your country and the service you want to verify from our live catalog.',
    },
    {
      icon: MessageSquare,
      title: 'Enter it on the app',
      body: 'Paste the number into WhatsApp, Telegram, Instagram, or TikTok wherever you need verification.',
    },
    {
      icon: CheckCircle2,
      title: 'Get your code',
      body: 'The verification code appears in your dashboard in seconds. Copy it and you\'re done.',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-3 text-slate-600">
            Three steps. Less than a minute.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SupportedServices() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">
            Works with the platforms you use
          </h2>
          <p className="mt-3 text-slate-600">
            Verify accounts on any of these services.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {SUPPORTED_SERVICES.map((s) => (
            <div
              key={s.id}
              className="px-5 py-3 rounded-full bg-white border text-sm font-medium text-slate-700"
            >
              {s.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingPreview() {
  const { data, isLoading } = useCatalog('whatsapp');
  const items = data?.catalog?.slice(0, 3) ?? [];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-slate-600">
            Pay only for the numbers you need. No monthly fees.
          </p>
        </div>

        {isLoading ? (
          <p className="text-center text-slate-500">Loading prices...</p>
        ) : items.length === 0 ? (
          <p className="text-center text-slate-500">Pricing temporarily unavailable.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {items.map((item) => (
              <Card key={item.country_code}>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-2">{item.flag_emoji}</div>
                  <div className="font-semibold mb-1">{item.country_name}</div>
                  <div className="text-xs text-slate-500 mb-4">
                    {item.success_rate}% success rate
                  </div>
                  <div className="text-3xl font-bold">
                    ${(item.price_cents / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">per number</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/signup" className="text-sm font-medium text-blue-600 hover:underline">
            See all countries →
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Ready to verify your account?
        </h2>
        <p className="mt-4 text-slate-300 text-lg">
          Sign up in seconds. Top up from ₦4,500. Get your number in under a minute.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 w-full sm:w-auto">
              Create Free Account
            </Button>
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Secure payments
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Instant delivery
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            98% success rate
          </span>
        </div>
      </div>
    </section>
  );
}