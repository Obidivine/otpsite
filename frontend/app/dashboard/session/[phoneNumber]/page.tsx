// frontend/app/dashboard/session/[phoneNumber]/page.tsx
'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { CountdownTimer } from '@/components/CountdownTimer';
import { OtpDisplay } from '@/components/OtpDisplay';
import { useSession } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function SessionPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Suspense
            fallback={
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  Loading session...
                </CardContent>
              </Card>
            }
          >
            <SessionLoader />
          </Suspense>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function SessionLoader() {
  const params = useParams();
  const raw = (params?.phoneNumber as string) || '';

  const decoded = decodeURIComponent(raw).trim();
  const phoneNumber = decoded.startsWith('+')
    ? decoded
    : `+${decoded.replace(/^\s+/, '')}`;

  return <SessionContent phoneNumber={phoneNumber} />;
}

function SessionContent({ phoneNumber }: { phoneNumber: string }) {
  const { data: session, isLoading, error } = useSession(phoneNumber);
  const [copiedNumber, setCopiedNumber] = useState(false);

  async function copyPhoneNumber() {
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-500">
          Loading session...
        </CardContent>
      </Card>
    );
  }

  if (error || !session) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-slate-700">Session not found or expired.</p>
          <p className="text-xs text-slate-400 font-mono">
            Looked up: {phoneNumber}
          </p>
          <Link href="/dashboard/rent">
            <Button>Rent a New Number</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const isCompleted = session.status === 'COMPLETED';
  const isExpired =
    session.status === 'EXPIRED' ||
    (session.status === 'ACTIVE' && session.expiresAt <= Date.now());
  const isActive = session.status === 'ACTIVE' && session.expiresAt > Date.now();
  const hasOtp = !!session.otp?.code;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isCompleted
            ? 'OTP Received'
            : isExpired
              ? 'Session Expired'
              : 'Waiting for OTP'}
        </h1>
        {isActive && <CountdownTimer expiresAt={session.expiresAt} />}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">
            Your temporary number
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="font-mono text-2xl font-semibold">
              {phoneNumber}
            </div>
            <Button variant="outline" size="sm" onClick={copyPhoneNumber}>
              {copiedNumber ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="text-xs text-slate-500 mt-3">
            Service:{' '}
            <span className="capitalize font-medium">{session.service}</span> ·
            Cost: ${(session.costCents / 100).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      {hasOtp && session.otp && (
        <OtpDisplay
          code={session.otp.code}
          sender={session.otp.sender}
          rawText={session.otp.rawText}
          receivedAt={session.otp.receivedAt}
        />
      )}

      {isActive && !hasOtp && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-slate-600">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
              </div>
              <span className="font-medium">Waiting for SMS...</span>
            </div>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Enter your temporary number on{' '}
              <span className="capitalize font-medium">{session.service}</span>.
              The verification code will appear here automatically.
            </p>
            <p className="text-xs text-slate-400">
              Checking for new messages every 3 seconds
            </p>
          </CardContent>
        </Card>
      )}

      {isExpired && !hasOtp && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-amber-600 mx-auto" />
            <p className="font-medium text-amber-900">Session expired</p>
            <p className="text-sm text-amber-800">
              No code was received in time. Your $
              {(session.costCents / 100).toFixed(2)} has been refunded.
            </p>
            <Link href="/dashboard/rent">
              <Button variant="outline" className="mt-2">
                Rent Another Number
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Link
          href="/dashboard"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}