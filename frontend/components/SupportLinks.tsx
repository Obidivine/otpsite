// frontend/components/SupportLinks.tsx
'use client';

import { MessageCircle, Mail, Send } from 'lucide-react';
import Link from 'next/link';

export function SupportLinks({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Link
        href="https://t.me/otpsite360"
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-500 hover:text-blue-500 transition-colors"
        title="Telegram Support"
      >
        <Send className="h-5 w-5" />
      </Link>
      <Link
        href="https://wa.me/2347040763069"
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-500 hover:text-green-500 transition-colors"
        title="WhatsApp Support"
      >
        <MessageCircle className="h-5 w-5" />
      </Link>
      <Link
        href="mailto:otpreseller360@gmail.com"
        className="text-slate-500 hover:text-red-500 transition-colors"
        title="Email Support"
      >
        <Mail className="h-5 w-5" />
      </Link>
    </div>
  );
}