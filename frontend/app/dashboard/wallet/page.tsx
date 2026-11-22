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
  usePaystackInit,
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
import { ArrowDownCircle, ArrowUpCircle, Wallet, Banknote } from 'lucide-react'; // Changed DollarSign to Banknote
import { EmptyState } from '@/components/EmptyState';
import { Receipt } from 'lucide-react';

// Presets in Kobo: ₦4,500, ₦7,500, ₦15,000, ₦30,000
const PRESET_AMOUNTS = [450000, 750000, 1500000, 3000000]; 

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
  const paystackMutation = usePaystackInit();
  const searchParams = useSearchParams();
  const returnStatus = searchParams?.get('status');

  const { data: balanceData, refetch: refetchBalance } = useBalance();
  const { data: txData, refetch: refetchTx } = useTransactions();

  const PRESET_AMOUNTS = [100000, 300000, 500000, 1000000]; // ₦1,000, ₦3,000, ₦5,000, ₦10,000 in Kobo
  const [customAmount, setCustomAmount] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initMutation = useTopupInit();
  const checkoutMutation = useTopupCheckout();

  // Handle Flutterwave return
  useEffect(() => {
    if (returnStatus === 'success' || returnStatus === 'successful') {
      toast.success('Payment received! Updating your balance...');
      setTimeout(() => {
        refetchBalance();
        refetchTx();
      }, 2000);
    }
  }, [returnStatus, refetchBalance, refetchTx]);

  const balanceCents = balanceData?.balanceCents ?? 0;
  const balanceNaira = `₦${(balanceCents / 100).toLocaleString('en-NG')}`;
  const transactions = txData?.transactions ?? [];

  function selectPreset(cents: number) {
    setAmountCents(cents);
    setCustomAmount('');
    setError(null);
  }

  function handleCustomAmountChange(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setCustomAmount(cleaned);
    if (cleaned) {
      const naira = parseFloat(cleaned);
      if (!isNaN(naira) && naira > 0) {
        setAmountCents(Math.round(naira * 100)); // Convert Naira to Kobo
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

    if (amountCents < 100000) { // ₦1,000 minimum
      setError('Minimum top-up amount is ₦1,000.');
      return;
    }
    if (amountCents > 50000000) { // ₦500,000 maximum
      setError('Maximum top-up amount is ₦500,000.');
      return;
    }

    setDialogOpen(true);
  }

  async function handleTopup(provider: 'flutterwave' | 'paystack') {
    setError(null);
    setDialogOpen(false);

    try {
      if (provider === 'flutterwave') {
        const initResult = await initMutation.mutateAsync({ amountCents });
        const checkoutResult = await checkoutMutation.mutateAsync({ txRef: initResult.txRef });
        window.location.href = checkoutResult.checkoutUrl;
      } else {
        const result = await paystackMutation.mutateAsync({ amountCents });
        window.location.href = result.authorization_url;
      }
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to start top-up.';
      toast.error(message);
    }
  }

  const amountNaira = `₦${(amountCents / 100).toLocaleString('en-NG')}`;
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
          <div className="text-4xl font-bold">{balanceNaira}</div>
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
            Choose an amount in Naira. You will be redirected to a secure checkout to complete the payment.
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
                  ₦{(cents / 100).toLocaleString('en-NG')}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="customAmount" className="text-xs uppercase tracking-wide text-slate-500">
              Or enter custom amount (Naira)
            </Label>
            <div className="relative mt-2">
              <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
              Minimum ₦1,000 · Maximum ₦500,000
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
              <span className="text-lg font-semibold">{amountNaira}</span>
            </div>

            {amountCents > 0 && amountCents < 100000 && (
              <p className="text-xs text-amber-600 mb-2">
                Minimum top-up is ₦1,000. Please enter at least ₦1,000.
              </p>
            )}

            <Button
              onClick={openConfirmation}
              disabled={amountCents < 100000 || isProcessing}
              className="w-full"
            >
              {isProcessing ? 'Processing...' : `Top Up ${amountNaira}`}
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
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Your deposits, refunds, and rental charges will appear here. Top up your wallet to get started."
              actionLabel="Top Up Wallet"
              onAction={() => {
                document.getElementById('customAmount')?.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const isCredit = tx.amount_cents > 0;
                const Icon = isCredit ? ArrowDownCircle : ArrowUpCircle;
                const color = isCredit ? 'text-green-600' : 'text-slate-600';
                const sign = isCredit ? '+' : '-';
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
                      {sign}₦{(Math.abs(tx.amount_cents) / 100).toLocaleString('en-NG')}
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
              <span className="text-sm text-slate-600">Amount</span>
              <span className="font-semibold text-lg">{amountNaira}</span>
            </div>
            <p className="text-xs text-slate-500 pt-2 border-t">
              You'll be redirected to a secure checkout to complete the payment. Your balance updates automatically once payment is confirmed.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleTopup('flutterwave')}
              disabled={isProcessing}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isProcessing ? 'Redirecting...' : 'Pay with Flutterwave'}
            </Button>
            <Button
              onClick={() => handleTopup('paystack')}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isProcessing ? 'Redirecting...' : 'Pay with Paystack'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}