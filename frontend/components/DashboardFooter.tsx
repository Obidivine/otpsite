// frontend/components/DashboardFooter.tsx
import Link from 'next/link';
import { SupportLinks } from '@/components/SupportLinks';

export function DashboardFooter() {
  return (
    <footer className="mt-12 py-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-900">OTP360.store</span>
       <span>© 2026</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Need help?</span>
        <SupportLinks />
      </div>
    </footer>
  );
}