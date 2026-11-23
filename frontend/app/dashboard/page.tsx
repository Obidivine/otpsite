'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { BalanceCard } from '@/components/BalanceCard';
import { SessionCard } from '@/components/SessionCard';
import { useUserSessions, useTransactions } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, History, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptySessionState } from '@/components/EmptySessionState';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading dashboard...</div>}>
        <DashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { data, isLoading } = useUserSessions();
  const { data: txData, isLoading: txLoading } = useTransactions();
  
  const sessions = data?.sessions ?? [];
  const transactions = txData?.transactions ?? [];
  const recentTransactions = transactions.slice(0, 4);
  
  const now = Date.now();
  const activeSessions = sessions.filter(
    (s) => s.status === 'ACTIVE' && s.expiresAt > now
  );
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
  const totalSpentCents = completedSessions.reduce((sum, s) => sum + s.costCents, 0);

  // Sparkline SVG Path
  const sparklinePoints = "M 0 40 L 10 35 L 20 38 L 30 20 L 40 25 L 50 10 L 60 15 L 70 5";

  return ( 
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
        <Link href="/dashboard/rent">
          <Button className="shadow-sm">
            <Phone className="h-4 w-4 mr-2" />
            Rent a Number
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BalanceCard />

        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{activeSessions.length}</div>
            <p className="text-xs text-slate-500 mt-1">Numbers currently rented</p>
          </CardContent>
        </Card>

        {/* Total Spent Card with Sparkline */}
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-slate-600">Total Spent</CardTitle>
            <span className="text-xs font-semibold text-slate-400">All time</span>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
                            <div>
                <div className="text-3xl font-bold text-slate-900">
                  ₦{(totalSpentCents / 100).toLocaleString('en-NG')}
                </div>
                <p className="text-xs text-slate-500 mt-1">Across {completedSessions.length} completed rentals</p>
              </div>
              
              <div className="h-12 w-24">
                <svg viewBox="0 0 70 45" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sparklineGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${sparklinePoints} L 70 45 L 0 45 Z`} fill="url(#sparklineGradient)" />
                  <path d={sparklinePoints} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Active Sessions</h2>
          <Link href="/dashboard/history" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors">
            <History className="h-4 w-4" /> View all
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : activeSessions.length === 0 ? (
          <EmptySessionState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Recent Transactions</h2>
          <Link href="/dashboard/wallet" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors">
            View Wallet
          </Link>
        </div>

        {txLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="p-6 text-center bg-white border border-slate-200 rounded-xl">
            <p className="text-slate-500">No transactions yet.</p>
          </div>
        ) : (
          <Card className="shadow-sm border-slate-200 bg-white">
            <CardContent className="p-0">
              {recentTransactions.map((tx, index) => {
                const isCredit = tx.amount_cents > 0;
                const Icon = isCredit ? ArrowDownCircle : ArrowUpCircle;
                const color = isCredit ? 'text-green-600' : 'text-slate-600';
                const sign = isCredit ? '+' : '-';
                
                return (
                  <div 
                    key={tx.reference} 
                    className={`flex items-center justify-between p-4 ${index !== recentTransactions.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isCredit ? 'bg-green-50' : 'bg-slate-50'}`}>
                        <Icon className={`h-5 w-5 ${color}`} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold capitalize text-slate-900">
                          {tx.type.toLowerCase()}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className={`font-mono font-bold ${color}`}>
                      {sign}₦{(Math.abs(tx.amount_cents) / 100).toLocaleString('en-NG')}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}