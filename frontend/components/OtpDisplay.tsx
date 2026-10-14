// frontend/components/OtpDisplay.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, MessageSquare } from 'lucide-react';

interface OtpDisplayProps {
  code: string;
  sender: string;
  rawText: string;
  receivedAt: string;
}

export function OtpDisplay({ code, sender, rawText, receivedAt }: OtpDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-green-700 font-medium text-sm">
            <MessageSquare className="h-4 w-4" />
            Verification code received
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="text-5xl font-mono font-bold tracking-wider text-slate-900">
              {code}
            </div>
            <Button
              variant={copied ? 'secondary' : 'default'}
              size="icon"
              onClick={handleCopy}
              className="h-12 w-12"
            >
              {copied ? (
                <Check className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>

          <div className="text-xs text-slate-500">
            From {sender} · {new Date(receivedAt).toLocaleTimeString()}
          </div>

          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            {showRaw ? 'Hide' : 'Show'} raw message
          </button>

          {showRaw && (
            <div className="text-xs text-slate-600 bg-white border rounded-md p-3 text-left font-mono whitespace-pre-wrap">
              {rawText}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}