// frontend/app/dashboard/help/page.tsx
'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  HelpCircle, 
  RefreshCcw, 
  ShieldCheck, 
  Smartphone,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      icon: Smartphone,
      question: "Why am I not receiving the OTP?",
      answer: "Make sure the app you are trying to verify (WhatsApp, Telegram, etc.) is fully updated to the latest version. If you are using a VPN, ensure your VPN location matches the country of the number you rented. Try turning your VPN off and on again, or switching to a different server location."
    },
    {
      icon: RefreshCcw,
      question: "What happens if the code never arrives?",
      answer: "All sessions have a 15-minute timer. If the code does not arrive within 15 minutes, the session will automatically expire, and your funds will be instantly refunded to your OTP360 wallet. You can check your wallet balance or transaction history to confirm."
    },
    {
      icon: ShieldCheck,
      question: "Can I use this number for my main account?",
      answer: "We highly recommend using these numbers for secondary accounts or verifications where privacy is needed. Some platforms (like WhatsApp) have strict anti-spam systems and may block virtual numbers. If a number fails, you are always refunded automatically."
    },
    {
      icon: HelpCircle,
      question: "How do I cancel a session?",
      answer: "If you want to cancel a session before the 15 minutes are up, go to your Active Sessions, click 'View' on the number, and wait for the 3-minute timer to finish. Once the 3 minutes pass, a 'Cancel Session & Refund' button will appear."
    }
  ];

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Help & Support</h1>
          <p className="text-slate-400">Find answers to common issues or reach out to us directly.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            const Icon = faq.icon;
            
            return (
              <Card 
                key={index} 
                className="bg-slate-900 border-slate-800 shadow-none cursor-pointer transition-colors hover:border-slate-700"
                onClick={() => setOpenFaq(isOpen ? null : index)}
              >
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-full text-blue-400">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold text-white">{faq.question}</h3>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 text-sm text-slate-400 leading-relaxed border-t border-slate-800 mt-2">
                      <p className="pt-3">{faq.answer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Contact Section */}
        <Card className="bg-blue-950/50 border-blue-900 shadow-none mt-8">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
              <MessageCircle className="h-6 w-6 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Still need help?</h2>
            <p className="text-slate-300 text-sm max-w-sm mx-auto">
              Our support team is online and ready to assist you with any issues you are facing.
            </p>
            <Link href="https://wa.me/2347040763069" target="_blank" rel="noopener noreferrer">
              <Button className="bg-green-600 hover:bg-green-700 text-white font-bold w-full sm:w-auto mt-2">
                Chat with a Live Agent
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
