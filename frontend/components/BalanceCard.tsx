// frontend/components/BalanceCard.tsx
'use client';

import Link from 'next/link';
import { useBalance } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Plus } from 'lucide-react';

export function BalanceCard() {
  const { data, isLoading } = useBalance();

  const balanceUSD = data
    ? `$${(data.balanceCents / 100).toFixed(2)}`
    : '$—.——';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">
          Wallet Balance
        </CardTitle>
        <DollarSign className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {isLoading ? '...' : balanceUSD}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Available for new rentals
        </p>
        <Link href="/dashboard/wallet" className="block mt-4">
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Top Up
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}