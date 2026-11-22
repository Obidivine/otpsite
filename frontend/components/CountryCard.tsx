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
  // disabled?: boolean; <--- DELETE THIS
}

export function CountryCard({
  item,
  onRent,
  isRenting,
  // disabled, <--- DELETE THIS
}: CountryCardProps) {
  const priceNaira = `₦${(item.price_cents / 100).toLocaleString('en-NG')}`;
  const successRate = Number(item.success_rate).toFixed(0);
  const outOfStock = item.stock_count <= 0;

  return (
    <Card>
      <CardContent className="p-4">
        {/* ... top section stays the same ... */}
        
        <Button
          className="w-full"
          onClick={() => onRent(item)}
          // disabled={disabled || isRenting || outOfStock} <--- REMOVE 'disabled' HERE
          disabled={isRenting || outOfStock}
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