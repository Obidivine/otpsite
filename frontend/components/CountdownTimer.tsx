// frontend/components/CountdownTimer.tsx
'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: number;
  onExpire?: () => void;
}

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(() =>
    Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  );

  useEffect(() => {
    // Recompute immediately in case expiresAt changed
    setTimeRemaining(Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isUrgent = timeRemaining <= 60; // Last minute

  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  if (timeRemaining === 0) {
    return (
      <div className="flex items-center gap-2 text-amber-600 font-medium">
        <Clock className="h-4 w-4" />
        Expired
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 font-mono font-medium ${
        isUrgent ? 'text-red-600' : 'text-slate-700'
      }`}
    >
      <Clock className="h-4 w-4" />
      {formatted}
    </div>
  );
}