'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  ArrowUpRight, 
  Calendar, 
  User, 
  AlertCircle, 
  BadgeAlert, 
  CircleDollarSign, 
  Layers, 
  DollarSign, 
  ArrowDownRight, 
  Plus, 
  Upload, 
  Loader2,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface FDData {
  id: string;
  accountNumber: string;
  receiptNumber: string;
  holderName: string;
  startDate: string;
  endDate: string;
  principalAmount: number;
  withdrawAmount: number;
  interestEarned: number;
  interestRate: number;
  status: string;
}

interface DashboardStats {
  summary: {
    activeCount: number;
    activePrincipal: number;
    activeMaturity: number;
    activeInterestEarned: number;
    maturedCount: number;
    renewedCount: number;
    withdrawnCount: number;
    allTimeInterestEarned: number;
  };
  upcomingMaturities: {
    next7Days: FDData[];
    next30Days: FDData[];
    count7Days: number;
    count30Days: number;
  };
  latestToMature: FDData | null;
  recentlyAdded: FDData[];
  charts: {
    holderDistribution: { name: string; count: number; totalPrincipal: number; totalInterest: number }[];
    monthlyMaturityChart: { month: string; amount: number }[];
    activeVsMaturedChart: { status: string; count: number; amount: number }[];
    growthChartData: { date: string; amount: number }[];
  };
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (!res.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (dateStr: string) => {
    const end = new Date(dateStr);
    const now = new Date();
    // Reset hours
    end.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-8 w-48 rounded bg-slate-800" />
            <div className="mt-2 h-4 w-64 rounded bg-slate-800" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 rounded bg-slate-800" />
            <div className="h-10 w-36 rounded bg-slate-800" />
          </div>
        </div>

        {/* Stats grid skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl border border-slate-800 bg-slate-900/40 p-6" />
          ))}
        </div>

        {/* Chart skeletons */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-[350px] rounded-2xl border border-slate-800 bg-slate-900/40 lg:col-span-2" />
          <div className="h-[350px] rounded-2xl border border-slate-800 bg-slate-900/40" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/20 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-lg font-bold text-white">Failed to Load Dashboard</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-xs">{error || 'Data is currently unavailable.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { summary, upcomingMaturities, latestToMature, recentlyAdded, charts } = stats;

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Asset Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Portfolio snapshot and family fixed deposit performance.
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-3">
          <Link
            href="/fds/import"
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </Link>
          <Link
            href="/fds/new"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:from-emerald-450 hover:to-teal-450 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.3)] cursor-pointer"
          >
            <Plus className="h-4 w-4 text-slate-950 stroke-[3px]" />
            New Deposit
          </Link>
        </div>
      </div>

      {/* Critical Maturity Alerts Section */}
      {upcomingMaturities.count7Days > 0 && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-5 shadow-[0_0_30px_rgba(244,63,94,0.05)] relative overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-red-600" />
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20">
              <BadgeAlert className="h-5 w-5 text-rose-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-rose-200">Urgent Maturity Alert!</h3>
              <p className="mt-1 text-sm text-slate-400">
                You have {upcomingMaturities.count7Days} fixed {upcomingMaturities.count7Days === 1 ? 'deposit' : 'deposits'} maturing in the next 7 days. Take action now to renew or withdraw.
              </p>
              
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingMaturities.next7Days.map((fd) => {
                  const days = getDaysRemaining(fd.endDate);
                  return (
                    <Link
                      key={fd.id}
                      href={`/fds/${fd.id}`}
                      className="flex justify-between items-center bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 rounded-xl p-3.5 transition-all text-xs group"
                    >
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                          {fd.holderName}
                        </p>
                        <p className="text-[10px] text-slate-500">{fd.receiptNumber}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold mb-0.5">
                          {days === 0 ? 'Matures today' : days === 1 ? '1 day left' : `${days} days left`}
                        </span>
                        <p className="text-slate-300 font-semibold">{formatCurrency(fd.withdrawAmount)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Principal */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Active Principal</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">
              {formatCurrency(summary.activePrincipal)}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>{summary.activeCount} active fixed deposits</span>
            </div>
          </div>
        </div>

        {/* Card 2: Expected Maturity */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Projected Maturity</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">
              {formatCurrency(summary.activeMaturity)}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-xs text-blue-400">
              <ArrowUpRight className="h-3 w-3" />
              <span>Expected return value</span>
            </div>
          </div>
        </div>

        {/* Card 3: Interest Earned */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Active Returns</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">
              {formatCurrency(summary.activeInterestEarned)}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-xs text-teal-400">
              <span>Avg interest rate: </span>
              <span className="font-semibold">
                {summary.activeCount > 0 
                  ? (stats.recentlyAdded.filter(f => f.status === 'ACTIVE').reduce((acc, f) => acc + f.interestRate, 0) / Math.max(1, stats.recentlyAdded.filter(f => f.status === 'ACTIVE').length)).toFixed(2)
                  : '0.00'}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: All-Time Returns */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Total Interest Earned</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">
              {formatCurrency(summary.allTimeInterestEarned)}
            </h3>
            <div className="mt-1 flex items-center gap-1 text-xs text-violet-400">
              <span>Matured: {summary.maturedCount} | Withdrawn: {summary.withdrawnCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart 1: Growth Area Chart */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Portfolio Asset Growth</h3>
            <p className="text-xs text-slate-400">Active Fixed Deposit principal progression over start dates</p>
          </div>
          <div className="mt-6 h-[250px] w-full">
            {charts.growthChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">No active deposits for growth timeline.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.growthChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v/100000).toFixed(1)}L`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}
                    itemStyle={{ color: '#10b981', fontSize: '13px' }}
                    formatter={(v: any) => [formatCurrency(v), 'Asset Value']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#growthGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Holder Distribution Pie Chart */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Deposit Holders</h3>
            <p className="text-xs text-slate-400">Distribution of active principal by family member</p>
          </div>
          <div className="mt-6 h-[200px] w-full flex items-center justify-center">
            {charts.holderDistribution.length === 0 ? (
              <div className="text-sm text-slate-500">No active deposits.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.holderDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="totalPrincipal"
                  >
                    {charts.holderDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                    formatter={(v: any) => [formatCurrency(v), 'Principal']}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center text-xs">
            {charts.holderDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-slate-350">{item.name}</span>
                <span className="text-slate-500 font-semibold">({((item.totalPrincipal / summary.activePrincipal) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Maturity Bar Chart */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
        <h3 className="text-lg font-bold text-white tracking-tight">Maturity Timeline (Next 12 Months)</h3>
        <p className="text-xs text-slate-400">Total expected cash inflow per month from maturing active FDs</p>
        <div className="mt-6 h-[250px] w-full">
          {charts.monthlyMaturityChart.filter(c => c.amount > 0).length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">No maturities scheduled in the next 12 months.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyMaturityChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${(v/100000).toFixed(1)}L`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}
                  formatter={(v: any) => [formatCurrency(v), 'Cash Inflow']}
                />
                <Bar dataKey="amount" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Table 1: Upcoming maturities (next 30 days) */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white tracking-tight">Maturing in 30 Days</h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold">
                {upcomingMaturities.count30Days} Total
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Deposits reaching end of term soon</p>
          </div>

          <div className="mt-6 flex-1 overflow-x-auto">
            {upcomingMaturities.next30Days.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No active FDs maturing in the next 30 days.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-350">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Holder</th>
                    <th className="pb-3">Maturity Date</th>
                    <th className="pb-3 text-right">Maturity Amt</th>
                    <th className="pb-3 text-right">Interest Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {upcomingMaturities.next30Days.slice(0, 5).map((fd) => (
                    <tr key={fd.id} className="group hover:bg-slate-900/30">
                      <td className="py-3 font-semibold text-slate-200">
                        <Link href={`/fds/${fd.id}`} className="hover:text-emerald-400 transition-colors">
                          {fd.holderName}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-400">{formatDate(fd.endDate)}</td>
                      <td className="py-3 text-right font-bold text-slate-200">{formatCurrency(fd.withdrawAmount)}</td>
                      <td className="py-3 text-right text-emerald-450 font-medium">{fd.interestRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-end">
            <Link
              href="/fds?status=ACTIVE"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-350 transition-colors font-medium cursor-pointer"
            >
              View all active FDs
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Table 2: Recently added FDs */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Recently Added</h3>
            <p className="text-xs text-slate-400 mt-1">Latest fixed deposits registered</p>
          </div>

          <div className="mt-6 flex-1 overflow-x-auto">
            {recentlyAdded.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No fixed deposits registered yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-350">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">Holder</th>
                    <th className="pb-3">Start Date</th>
                    <th className="pb-3 text-right">Principal</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recentlyAdded.slice(0, 5).map((fd) => (
                    <tr key={fd.id} className="group hover:bg-slate-900/30">
                      <td className="py-3 font-semibold text-slate-200">
                        <Link href={`/fds/${fd.id}`} className="hover:text-emerald-400 transition-colors">
                          {fd.holderName}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-400">{formatDate(fd.startDate)}</td>
                      <td className="py-3 text-right font-bold text-slate-200">{formatCurrency(fd.principalAmount)}</td>
                      <td className="py-3 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${
                          fd.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : fd.status === 'MATURED'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : fd.status === 'RENEWED'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            : 'bg-slate-700/20 border-slate-750 text-slate-400'
                        }`}>
                          {fd.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-end">
            <Link
              href="/fds"
              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-350 transition-colors font-medium cursor-pointer"
            >
              View entire deposit list
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
