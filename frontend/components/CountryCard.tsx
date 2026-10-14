// frontend/components/CountryCard.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CatalogItem } from '@/types/api';
import { TrendingUp, Package } from 'lucide-react';

interface CountryCardProps {
  item: CatalogItem;
  onRent: (item: CatalogItem) => void;
  isRenting: boolean;
  disabled?: boolean;
}

export function CountryCard({
  item,
  onRent,
  isRenting,
  disabled,
}: CountryCardProps) {
  const priceUSD = `$${(item.price_cents / 100).toFixed(2)}`;
  const successRate = Number(item.success_rate).toFixed(0);
  const outOfStock = item.stock_count <= 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{item.flag_emoji}</span>
            <div>
              <div className="font-semibold">{item.country_name}</div>
              <div className="text-xs text-slate-500">{item.country_code}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{priceUSD}</div>
            <div className="text-xs text-slate-500">per number</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600 mb-4">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            {successRate}% success
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {item.stock_count} in stock
          </span>
        </div>

        <Button
          className="w-full"
          onClick={() => onRent(item)}
          disabled={disabled || isRenting || outOfStock}
        >
          {outOfStock
            ? 'Out of Stock'
            : isRenting
              ? 'Renting...'
              : 'Rent This Number'}
        </Button>
      </CardContent>
    </Card>
  );
}