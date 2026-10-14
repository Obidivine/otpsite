// frontend/components/SessionCard.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { SessionSummary } from '@/types/api';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';

interface SessionCardProps {
  session: SessionSummary;
}

export function SessionCard({ session }: SessionCardProps) {
  const isCompleted = session.status === 'COMPLETED';
  const isExpired = session.status === 'EXPIRED';
  const isActive = session.status === 'ACTIVE' && session.expiresAt > Date.now();
  const isVisuallyExpired =
    session.status === 'ACTIVE' && session.expiresAt <= Date.now();

  // Force a re-render every second while active so the countdown ticks live
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      forceTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const timeRemaining = isActive
    ? Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000))
    : 0;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const displayStatus = isVisuallyExpired ? 'EXPIRED' : session.status;

  const statusColor = isActive
    ? 'text-blue-600 bg-blue-50'
    : isCompleted
      ? 'text-green-600 bg-green-50'
      : isExpired || isVisuallyExpired
        ? 'text-amber-600 bg-amber-50'
        : 'text-slate-600 bg-slate-50';

  const StatusIcon = isCompleted
    ? CheckCircle2
    : isExpired || isVisuallyExpired
      ? XCircle
      : Clock;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}
              >
                <StatusIcon className="h-3 w-3" />
                {displayStatus}
              </span>
              <span className="text-xs text-slate-500 capitalize">
                {session.service}
              </span>
            </div>

            <div className="font-mono text-sm font-medium truncate">
              {session.phoneNumber}
            </div>

            {isActive && (
              <div className="text-xs text-slate-500 mt-1">
                Expires in {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
            )}

            {isVisuallyExpired && (
              <div className="text-xs text-amber-600 mt-1">
                Expired — refund processing
              </div>
            )}

            <div className="text-xs text-slate-400 mt-1">
              ${(session.costCents / 100).toFixed(2)} ·{' '}
              {new Date(session.createdAt).toLocaleString()}
            </div>
          </div>

          {isActive && (
            <Link
              href={`/dashboard/session/${encodeURIComponent(session.phoneNumber)}`}
              prefetch={false}
            >
              <Button size="sm">View</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}