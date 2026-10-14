// frontend/app/dashboard/rent/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { ServiceSelector } from '@/components/ServiceSelector';
import { CountryCard } from '@/components/CountryCard';
import { useCatalog, useRentNumber, useBalance } from '@/lib/queries';
import type { CatalogItem } from '@/types/api';
import { Card, CardContent } from '@/components/ui/card';

export default function RentPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <RentContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function RentContent() {
  const router = useRouter();
  const [service, setService] = useState<string>('whatsapp');
  const [error, setError] = useState<string | null>(null);
  const [rentingCountry, setRentingCountry] = useState<string | null>(null);

  const { data: catalogData, isLoading } = useCatalog(service);
  const { data: balanceData } = useBalance();
  const rentMutation = useRentNumber();

  const catalog = catalogData?.catalog ?? [];
  const balanceCents = balanceData?.balanceCents ?? 0;

  async function handleRent(item: CatalogItem) {
    setError(null);

    if (balanceCents < item.price_cents) {
      setError(
        `Insufficient balance. You need $${(item.price_cents / 100).toFixed(2)} but have $${(balanceCents / 100).toFixed(2)}. Top up your wallet to continue.`
      );
      return;
    }

    setRentingCountry(item.country_code);

    try {
      const result = await rentMutation.mutateAsync({
        service,
        country: item.country_code,
      });

      router.push(
        `/dashboard/session/${encodeURIComponent(result.phoneNumber)}`
      );
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        'Failed to rent number. Please try again.';
      setError(message);
    } finally {
      setRentingCountry(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Rent a Number</h1>
        <p className="text-slate-600">
          Choose a service and country to receive a foreign phone number for OTP verification.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <ServiceSelector value={service} onChange={setService} />
        </CardContent>
      </Card>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-4 flex items-start justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">
          Available Countries — {service.charAt(0).toUpperCase() + service.slice(1)}
        </h2>

        {isLoading ? (
          <p className="text-slate-500">Loading catalog...</p>
        ) : catalog.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              No numbers available for this service right now. Try another service.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalog.map((item) => (
              <CountryCard
                key={item.country_code}
                item={item}
                onRent={handleRent}
                isRenting={rentingCountry === item.country_code}
                disabled={balanceCents < item.price_cents}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}