// frontend/app/dashboard/wallet/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useBalance,
  useTransactions,
  useTopupInit,
  useTopupCheckout,
} from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DollarSign, ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';

const PRESET_AMOUNTS = [300, 500, 1000, 2000]; // cents: $3, $5, $10, $20

export default function WalletPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <WalletContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function WalletContent() {
  const searchParams = useSearchParams();
  const returnStatus = searchParams?.get('status');

  const { data: balanceData, refetch: refetchBalance } = useBalance();
  const { data: txData, refetch: refetchTx } = useTransactions();

  const [amountCents, setAmountCents] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  const initMutation = useTopupInit();
  const checkoutMutation = useTopupCheckout();

  // Handle Flutterwave return
    useEffect(() => {
    if (returnStatus === 'success' || returnStatus === 'successful') {
      toast.success('Payment received! Updating your balance...');
      // Give the webhook ~2 seconds to land before refetching
      setTimeout(() => {
        refetchBalance();
        refetchTx();
      }, 2000);
    }
  }, [returnStatus, refetchBalance, refetchTx]);

  const balanceCents = balanceData?.balanceCents ?? 0;
  const balanceUSD = `$${(balanceCents / 100).toFixed(2)}`;
  const transactions = txData?.transactions ?? [];

  function selectPreset(cents: number) {
    setAmountCents(cents);
    setCustomAmount('');
    setError(null);
  }

  function handleCustomAmountChange(value: string) {
    // Strip non-numeric except .
    const cleaned = value.replace(/[^0-9.]/g, '');
    setCustomAmount(cleaned);
    if (cleaned) {
      const dollars = parseFloat(cleaned);
      if (!isNaN(dollars) && dollars > 0) {
        setAmountCents(Math.round(dollars * 100));
        setError(null);
      } else {
        setAmountCents(0);
      }
    } else {
      setAmountCents(0);
    }
  }

  function openConfirmation() {
    setError(null);

    if (amountCents < 300) {
  setError('Minimum top-up amount is $3.00.');
  return;
}
    if (amountCents > 50000) {
      setError('Maximum top-up amount is $500.00.');
      return;
    }

    setDialogOpen(true);
  }

  async function handleConfirmTopup() {
    setError(null);
    setDialogOpen(false);

    try {
      // Step 1: Create the payment intent
      const initResult = await initMutation.mutateAsync({ amountCents });

      // Step 2: Get the Flutterwave checkout URL
      const checkoutResult = await checkoutMutation.mutateAsync({
        txRef: initResult.txRef,
      });

      // Step 3: Redirect the user to Flutterwave
      window.location.href = checkoutResult.checkoutUrl;
        } catch (err: any) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.details ||
        err.message ||
        'Failed to start top-up. Please try again.';
      toast.error(message);
    }
  }

  const amountUSD = `$${(amountCents / 100).toFixed(2)}`;
  const amountNGN = `₦${((amountCents / 100) * 1500).toLocaleString()}`;
  const isProcessing = initMutation.isPending || checkoutMutation.isPending;

  return (
    <div className="space-y-6">
     

      <div>
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-slate-600 mt-1">
          Top up your balance and review your transaction history.
        </p>
      </div>

      {/* Balance card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            Current Balance
          </CardTitle>
          <Wallet className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{balanceUSD}</div>
          <p className="text-xs text-slate-500 mt-1">
            Available for new rentals
          </p>
        </CardContent>
      </Card>

      {/* Top-up section */}
      <Card>
        <CardHeader>
          <CardTitle>Top Up</CardTitle>
          <CardDescription>
            Choose an amount in USD. You'll pay the NGN equivalent via Flutterwave.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-slate-500">
              Quick amounts
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {PRESET_AMOUNTS.map((cents) => (
                <Button
                  key={cents}
                  type="button"
                  variant={
                    amountCents === cents && !customAmount ? 'default' : 'outline'
                  }
                  onClick={() => selectPreset(cents)}
                >
                  ${(cents / 100).toFixed(0)}
                </Button>
              ))}
            </div>
          </div>

          <div>
  <Label htmlFor="customAmount" className="text-xs uppercase tracking-wide text-slate-500">
    Or enter custom amount (USD)
  </Label>
  <div className="relative mt-2">
    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
    <Input
      id="customAmount"
      type="text"
      inputMode="decimal"
      placeholder="0.00"
      value={customAmount}
      onChange={(e) => handleCustomAmountChange(e.target.value)}
      className="pl-9"
    />
  </div>
  <p className="text-xs text-slate-500 mt-1.5">
    Minimum $3.00 · Maximum $500.00
  </p>
</div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="pt-2 border-t">
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm text-slate-600">You're topping up:</span>
    <span className="text-lg font-semibold">{amountUSD}</span>
  </div>

  {amountCents > 0 && amountCents < 300 && (
    <p className="text-xs text-amber-600 mb-2">
      Minimum top-up is $3.00. Please enter at least $3.
    </p>
  )}

  <Button
    onClick={openConfirmation}
    disabled={amountCents < 300 || isProcessing}
    className="w-full"
  >
    {isProcessing ? 'Processing...' : `Top Up ${amountUSD}`}
  </Button>
</div>
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your most recent wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          {!txData ? (
  <div className="space-y-2">
    {[1, 2, 3].map((i) => (
      <Skeleton key={i} className="h-16 rounded-lg" />
    ))}
  </div>
) : transactions.length === 0 ? (
  <p className="text-slate-500 text-center py-6">
    No transactions yet. Top up to get started.
  </p>
) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const isCredit = tx.amount_cents > 0;
                const Icon = isCredit ? ArrowDownCircle : ArrowUpCircle;
                const color = isCredit ? 'text-green-600' : 'text-slate-600';
                const sign = isCredit ? '+' : '';
                return (
                  <div
                    key={tx.reference}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${color}`} />
                      <div>
                        <div className="text-sm font-medium capitalize">
                          {tx.type.toLowerCase()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className={`font-mono font-medium ${color}`}>
                      {sign}${(Math.abs(tx.amount_cents) / 100).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Top-Up</DialogTitle>
            <DialogDescription>
              You're about to add funds to your wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Amount (USD)</span>
              <span className="font-semibold">{amountUSD}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">You'll be charged</span>
              <span className="font-semibold text-lg">{amountNGN}</span>
            </div>
            <p className="text-xs text-slate-500 pt-2 border-t">
              You'll be redirected to Flutterwave's secure checkout to complete the payment.
              Your balance updates automatically once payment is confirmed.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmTopup} disabled={isProcessing}>
              {isProcessing ? 'Redirecting...' : 'Pay with Flutterwave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}