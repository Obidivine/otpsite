// frontend/app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-6">
          <Compass className="h-10 w-10 text-slate-400" />
        </div>

        <h1 className="text-6xl font-bold text-slate-900 mb-2">404</h1>

        <h2 className="text-xl font-semibold text-slate-700 mb-3">
          Page not found
        </h2>

        <p className="text-sm text-slate-500 mb-8">
          The page you're looking for doesn't exist or may have been moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              Go to Homepage
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}