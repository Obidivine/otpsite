'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { ServiceSelector } from '@/components/ServiceSelector';
import { CountryCard } from '@/components/CountryCard';
import { useCatalog, useRentNumber, useBalance } from '@/lib/queries';
import type { CatalogItem } from '@/types/api';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Package, Search, HelpCircle } from 'lucide-react'; // Added Search icon

export default function RentPage() {
  return (
    <ProtectedRoute>
      <RentContent />
    </ProtectedRoute>
  );
}

function RentContent() {
  const router = useRouter();
  const [service, setService] = useState<string>('whatsapp');
  const [searchQuery, setSearchQuery] = useState(''); // Added Search State
  const [error, setError] = useState<string | null>(null);
  const [rentingCountry, setRentingCountry] = useState<string | null>(null);

  const { data: catalogData, isLoading } = useCatalog(service);
  const { data: balanceData } = useBalance();
  const rentMutation = useRentNumber();

  const catalog = catalogData?.catalog ?? [];
  const balanceCents = balanceData?.balanceCents ?? 0;

  // Filter catalog based on search query
  const filteredCatalog = catalog.filter((item) => 
    item.country_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.country_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleRent(item: CatalogItem) {
    setError(null);
    if (balanceCents < item.price_cents) {
      toast.error(`Insufficient balance. Top up your wallet to continue.`, {
        description: `You need ₦${(item.price_cents / 100).toLocaleString('en-NG')} but have ₦${(balanceCents / 100).toLocaleString('en-NG')}.`,
        action: { label: 'Top Up', onClick: () => router.push('/dashboard/wallet') },
      });
      return;
    }

    setRentingCountry(item.country_code);
    try {
      const result = await rentMutation.mutateAsync({ service, country: item.country_code });
      toast.success(`Number rented! ${result.phoneNumber}`);
      router.push(`/dashboard/session/${encodeURIComponent(result.phoneNumber)}`);
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to rent number.';
      toast.error(message);
    } finally {
      setRentingCountry(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-white">Rent a Number</h1>
        <p className="text-slate-400">Choose a service and country to receive a foreign phone number.</p>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <ServiceSelector value={service} onChange={setService} />
        </CardContent>
      </Card>

      {/* WARNING BOX */}
      <div className="bg-blue-950/50 border border-blue-900 rounded-lg p-4 flex gap-3 text-sm">
        <span className="text-xl">💡</span>
        <div>
          <p className="font-semibold text-blue-200 mb-1">OTP Not Arriving?</p>
          <p className="text-blue-300/80">
            Please ensure your app (WhatsApp, Telegram, tiktok...etc.) is updated to the latest version. If you are using a VPN, try turning it off/on or switching to a different country location.
          </p>
        </div>
      </div>
      {/* END OF WARNING BOX */}

      {error && (
        <div className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-md p-4 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">×</button>
        </div>
      )}

      <div>
        {/* HEADER & SEARCH BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <h2 className="text-xl font-semibold text-white">
            Available Countries — {service.charAt(0).toUpperCase() + service.slice(1)}
          </h2>

          <Link href="/dashboard/help" className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
    <HelpCircle className="h-4 w-4" />
    Need Help?
  </Link>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search country..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48 rounded-xl bg-slate-800" />)}
          </div>
        ) : filteredCatalog.length === 0 ? (
          <EmptyState 
            icon={Search} 
            title="No countries found" 
            description={searchQuery ? `No results for "${searchQuery}". Try a different search.` : `We don't have any numbers for ${service} right now.`} 
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map((item) => (
              <CountryCard 
                key={item.country_code} 
                item={item} 
                onRent={handleRent} 
                isRenting={rentingCountry === item.country_code} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
