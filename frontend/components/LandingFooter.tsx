// frontend/components/LandingFooter.tsx
import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="border-t bg-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            © 2026 OTP Reseller. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link href="/login" className="hover:text-slate-900">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-slate-900">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}