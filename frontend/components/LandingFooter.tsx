// frontend/components/LandingFooter.tsx
import Link from 'next/link';
import { SupportLinks } from '@/components/SupportLinks';

export function LandingFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h3 className="text-white font-bold text-xl mb-2">OTP Reseller</h3>
          <p className="text-sm">Get temporary foreign numbers for OTP verification.</p>
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-3">
          <p className="text-sm">Need help? Contact us:</p>
          { @telegram: <a href="https://t.me/otpsite360"> t.me/otpsite360 </a><br>
          @whatsapp: <a href="https://wa.me/2347040763069">wa.me/2347040763069</a><br>
          @email: <a href="otpresseller360@gmail.com">otpreseller360@gmail.com</a>
			  
			  /* ADD SUPPORT LINKS HERE */
			}
          <SupportLinks className="[&>a]:text-slate-400 [&>a:hover]:text-white" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-slate-800 text-center text-xs">
        © {new Date().getFullYear()} OTP Reseller. All rights reserved.
      </div>
    </footer>
  );
}