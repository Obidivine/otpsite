// frontend/components/EmptySessionState.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function EmptySessionState() {
  return (
   <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-900 border border-slate-800 rounded-xl">
      {/* SVG Illustration */}
      <div className="w-32 h-32 mb-6 relative">
        <div className="absolute inset-0 bg-blue-50 rounded-full scale-110"></div>
        <svg className="relative w-full h-full text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
        </svg>
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">No active sessions</h3>
      <p className="text-slate-400 max-w-sm mb-6">
        You don't have any active phone numbers right now. Rent a number to start receiving verification codes instantly.
      </p>
      <Link href="/dashboard/rent">
        <Button size="lg">Rent Your First Number</Button>
      </Link>
    </div>
  );
}