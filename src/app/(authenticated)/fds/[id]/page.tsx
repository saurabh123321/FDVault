'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  TrendingUp, 
  RefreshCw, 
  ArrowDownRight, 
  Plus, 
  Calendar,
  DollarSign,
  Percent,
  Layers,
  FileText,
  User,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  X,
  History
} from 'lucide-react';

interface Transaction {
  id: string;
  transactionType: string;
  amount: number;
  notes: string | null;
  createdAt: string;
}

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
  remarks: string | null;
  parentFdId: string | null;
  parentFd: FDData | null;
  childFds: FDData[];
  transactions: Transaction[];
}

export default function FDDetails({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [id, setId] = useState<string | null>(null);
  const [fd, setFd] = useState<FDData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In-line actions panels
  const [showRenewPanel, setShowRenewPanel] = useState(false);
  const [showWithdrawPanel, setShowWithdrawPanel] = useState(false);

  // Renewal Form State
  const [renewForm, setRenewForm] = useState({
    accountNumber: '',
    receiptNumber: '',
    startDate: '',
    endDate: '',
    principalAmount: '',
    withdrawAmount: '',
    interestRate: '',
    remarks: '',
  });
  const [renewErrors, setRenewErrors] = useState<Record<string, string>>({});
  const [renewLoading, setRenewLoading] = useState(false);

  // Withdrawal Form State
  const [withdrawForm, setWithdrawForm] = useState({
    withdrawAmount: '',
    remarks: '',
  });
  const [withdrawErrors, setWithdrawErrors] = useState<Record<string, string>>({});
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Unwrap params in Next.js 15
  useEffect(() => {
    params.then((p) => {
      setId(p.id);
    });
  }, [params]);

  const fetchFdDetails = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/fds/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Fixed Deposit not found');
        throw new Error('Failed to load fixed deposit details');
      }
      const data = await res.json();
      setFd(data);

      // Prepopulate renewal form with sensible defaults
      setRenewForm({
        accountNumber: data.accountNumber,
        receiptNumber: '',
        startDate: new Date(data.endDate).toISOString().substring(0, 10),
        endDate: '',
        principalAmount: String(data.withdrawAmount), // Default to full maturity amount
        withdrawAmount: '',
        interestRate: '',
        remarks: `Renewed from parent FD ${data.receiptNumber}`,
      });

      // Prepopulate withdrawal form
      setWithdrawForm({
        withdrawAmount: String(data.withdrawAmount),
        remarks: 'Matured funds withdrawn',
      });
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFdDetails();
  }, [id]);

  const softDeleteFd = async () => {
    if (!confirm('Are you sure you want to delete this Fixed Deposit? This will soft delete the record.')) {
      return;
    }

    try {
      const res = await fetch(`/api/fds/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete');
      }
      alert('Fixed Deposit deleted successfully.');
      router.push('/fds');
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error deleting FD');
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRenewErrors({});

    // Validate renewal
    const errors: Record<string, string> = {};
    if (!renewForm.accountNumber) errors.accountNumber = 'Account number is required';
    if (!renewForm.receiptNumber) errors.receiptNumber = 'Receipt number is required';
    if (!renewForm.startDate) errors.startDate = 'Start date is required';
    if (!renewForm.endDate) errors.endDate = 'Maturity date is required';
    if (!renewForm.principalAmount || isNaN(Number(renewForm.principalAmount)) || Number(renewForm.principalAmount) <= 0) {
      errors.principalAmount = 'Principal must be a positive number';
    }
    if (!renewForm.withdrawAmount || isNaN(Number(renewForm.withdrawAmount)) || Number(renewForm.withdrawAmount) <= 0) {
      errors.withdrawAmount = 'Expected maturity amount must be a positive number';
    }
    if (!renewForm.interestRate || isNaN(Number(renewForm.interestRate)) || Number(renewForm.interestRate) < 0) {
      errors.interestRate = 'Interest rate must be non-negative';
    }

    if (renewForm.startDate && renewForm.endDate) {
      const start = new Date(renewForm.startDate);
      const end = new Date(renewForm.endDate);
      if (end <= start) {
        errors.endDate = 'Maturity date must be after start date';
      }
    }

    if (Object.keys(errors).length > 0) {
      setRenewErrors(errors);
      return;
    }

    setRenewLoading(true);

    try {
      const res = await fetch(`/api/fds/${id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: renewForm.accountNumber,
          receiptNumber: renewForm.receiptNumber,
          startDate: renewForm.startDate,
          endDate: renewForm.endDate,
          principalAmount: Number(renewForm.principalAmount),
          withdrawAmount: Number(renewForm.withdrawAmount),
          interestRate: Number(renewForm.interestRate),
          remarks: renewForm.remarks || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to renew fixed deposit');
      }

      const newFd = await res.json();
      alert('FD renewed successfully!');
      setShowRenewPanel(false);
      router.push(`/fds/${newFd.id}`);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error renewing FD');
    } finally {
      setRenewLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawErrors({});

    // Validate
    const errors: Record<string, string> = {};
    if (!withdrawForm.withdrawAmount || isNaN(Number(withdrawForm.withdrawAmount)) || Number(withdrawForm.withdrawAmount) <= 0) {
      errors.withdrawAmount = 'Withdraw amount must be positive';
    }

    if (Object.keys(errors).length > 0) {
      setWithdrawErrors(errors);
      return;
    }

    setWithdrawLoading(true);

    try {
      const res = await fetch(`/api/fds/${id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawAmount: Number(withdrawForm.withdrawAmount),
          remarks: withdrawForm.remarks || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to withdraw');
      }

      alert('Fixed deposit marked as withdrawn!');
      setShowWithdrawPanel(false);
      fetchFdDetails();
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error withdrawing FD');
    } finally {
      setWithdrawLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <span className="mt-3 text-xs font-semibold">Loading details...</span>
      </div>
    );
  }

  if (error || !fd) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/20 p-8 text-center backdrop-blur-sm">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-lg font-bold text-white">Error Loading Details</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-xs">{error || 'Record is unavailable.'}</p>
        <Link
          href="/fds"
          className="mt-6 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
        >
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/fds"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white sm:text-2xl">{fd.holderName}</h1>
              <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase ${
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
            </div>
            <p className="text-xs text-slate-450 mt-0.5">Account: {fd.accountNumber} | Receipt: {fd.receiptNumber}</p>
          </div>
        </div>

        {/* Admin CRUD options */}
        {isAdmin && (
          <div className="flex gap-3">
            <Link
              href={`/fds/${fd.id}/edit`}
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              <Edit className="h-4 w-4" />
              Edit FD
            </Link>
            <button
              onClick={softDeleteFd}
              className="flex items-center gap-2 rounded-xl border border-rose-900/30 bg-rose-950/10 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Financial details & Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Breakdown Card */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
            <h3 className="text-base font-bold text-white tracking-tight border-b border-slate-800/80 pb-3">Financial Information</h3>
            <div className="grid gap-6 mt-6 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-450 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                  Principal Amount
                </span>
                <p className="text-xl font-extrabold text-white tracking-tight">{formatCurrency(fd.principalAmount)}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-455 flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-teal-400" />
                  Interest Rate
                </span>
                <p className="text-xl font-extrabold text-teal-400 tracking-tight">{fd.interestRate}% <span className="text-xs text-slate-500 font-medium">p.a.</span></p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-455 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                  Expected Maturity Value
                </span>
                <p className="text-xl font-extrabold text-white tracking-tight">{formatCurrency(fd.withdrawAmount)}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-455 flex items-center gap-1.5">
                  <ArrowDownRight className="h-3.5 w-3.5 text-emerald-450" />
                  Interest Earned
                </span>
                <p className="text-xl font-extrabold text-emerald-450 tracking-tight">+{formatCurrency(fd.interestEarned)}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-455 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Deposit Start Date
                </span>
                <p className="text-sm font-bold text-slate-200">{formatDate(fd.startDate)}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-455 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Maturity Date
                </span>
                <p className="text-sm font-bold text-slate-200">{formatDate(fd.endDate)}</p>
              </div>
            </div>

            {fd.remarks && (
              <div className="mt-6 pt-4 border-t border-slate-800/80">
                <span className="text-xs font-medium text-slate-455 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  Remarks
                </span>
                <p className="text-xs text-slate-350 mt-1.5 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-850 whitespace-pre-line font-mono">
                  {fd.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Transaction History Logs */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
            <h3 className="text-base font-bold text-white tracking-tight border-b border-slate-800/80 pb-3 flex items-center gap-2">
              <History className="h-4.5 w-4.5 text-emerald-400" />
              Transaction Log
            </h3>
            
            <div className="mt-6 flow-root">
              <ul className="-mb-8">
                {fd.transactions.map((tx, idx) => (
                  <li key={tx.id}>
                    <div className="relative pb-8">
                      {idx !== fd.transactions.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-800" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`h-8 w-8 rounded-lg flex items-center justify-center ring-4 ring-slate-900/20 ${
                            tx.transactionType === 'CREATE'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-450'
                              : tx.transactionType === 'RENEW'
                              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-450'
                              : tx.transactionType === 'WITHDRAW'
                              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-450'
                              : 'bg-slate-800 border border-slate-700 text-slate-300'
                          }`}>
                            {tx.transactionType === 'CREATE' && <Plus className="h-4 w-4" />}
                            {tx.transactionType === 'RENEW' && <RefreshCw className="h-3.5 w-3.5" />}
                            {tx.transactionType === 'WITHDRAW' && <ArrowDownRight className="h-4 w-4" />}
                            {tx.transactionType === 'ADD' && <Clock className="h-3.5 w-3.5" />}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-xs font-bold text-slate-200">
                              {tx.transactionType === 'CREATE' && 'Deposit Created'}
                              {tx.transactionType === 'RENEW' && 'Deposit Renewed'}
                              {tx.transactionType === 'WITHDRAW' && 'Funds Withdrawn'}
                              {tx.transactionType === 'ADD' && 'Record Edited'}
                              <span className="font-mono ml-2 text-slate-400">{formatCurrency(tx.amount)}</span>
                            </p>
                            {tx.notes && (
                              <p className="text-[10px] text-slate-500 mt-1 leading-normal">{tx.notes}</p>
                            )}
                          </div>
                          <div className="text-right text-[10px] whitespace-nowrap text-slate-500">
                            <time dateTime={tx.createdAt}>{formatDate(tx.createdAt)}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Side: Operations Panel & Renewal Tree */}
        <div className="space-y-6">
          {/* Admin Operations Actions */}
          {isAdmin && (fd.status === 'ACTIVE' || fd.status === 'MATURED') && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm space-y-4">
              <h3 className="text-base font-bold text-white tracking-tight border-b border-slate-800/80 pb-3">Vault Actions</h3>
              
              {!showRenewPanel && !showWithdrawPanel && (
                <div className="grid gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowRenewPanel(true);
                      setShowWithdrawPanel(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-semibold text-slate-950 hover:from-emerald-450 hover:to-teal-450 transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4 stroke-[3px]" />
                    Renew Deposit
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowWithdrawPanel(true);
                      setShowRenewPanel(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 py-3 text-sm font-semibold text-slate-200 transition-all cursor-pointer"
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    Withdraw Deposit
                  </button>
                </div>
              )}

              {/* Renewal Form Panel */}
              {showRenewPanel && (
                <form onSubmit={handleRenewSubmit} className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Renewal Configuration
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRenewPanel(false)}
                      className="text-slate-500 hover:text-slate-350 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Receipt Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-455">New Receipt No. *</label>
                    <input
                      type="text"
                      required
                      value={renewForm.receiptNumber}
                      onChange={(e) => setRenewForm({...renewForm, receiptNumber: e.target.value})}
                      placeholder="e.g. FD/2026/016"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Start Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-455">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={renewForm.startDate}
                      onChange={(e) => setRenewForm({...renewForm, startDate: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Maturity Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-455">Maturity Date *</label>
                    <input
                      type="date"
                      required
                      value={renewForm.endDate}
                      onChange={(e) => setRenewForm({...renewForm, endDate: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Principal */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-455">Renewed Principal (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={renewForm.principalAmount}
                      onChange={(e) => setRenewForm({...renewForm, principalAmount: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Expected Maturity */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-455">Maturity Amount (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={renewForm.withdrawAmount}
                      onChange={(e) => setRenewForm({...renewForm, withdrawAmount: e.target.value})}
                      placeholder="Projected returns"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Rate */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-455">Interest Rate (%) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={renewForm.interestRate}
                      onChange={(e) => setRenewForm({...renewForm, interestRate: e.target.value})}
                      placeholder="e.g. 7.50"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowRenewPanel(false)}
                      className="flex-1 px-4 py-2 border border-slate-800 text-[11px] font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-950/30 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={renewLoading}
                      className="flex-1 flex items-center justify-center gap-1 px-4 py-2 text-[11px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl cursor-pointer"
                    >
                      {renewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-950" /> : 'Confirm Renewal'}
                    </button>
                  </div>
                </form>
              )}

              {/* Withdrawal Form Panel */}
              {showWithdrawPanel && (
                <form onSubmit={handleWithdrawSubmit} className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      Maturity Withdrawal
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowWithdrawPanel(false)}
                      className="text-slate-500 hover:text-slate-350 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-455">Actual Amount Received (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={withdrawForm.withdrawAmount}
                      onChange={(e) => setWithdrawForm({...withdrawForm, withdrawAmount: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-455">Remarks / Settlement Bank</label>
                    <textarea
                      value={withdrawForm.remarks}
                      onChange={(e) => setWithdrawForm({...withdrawForm, remarks: e.target.value})}
                      placeholder="e.g. Credited to Ramesh SBI account"
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowWithdrawPanel(false)}
                      className="flex-1 px-4 py-2 border border-slate-800 text-[11px] font-semibold text-slate-400 hover:text-white rounded-xl bg-slate-950/30 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={withdrawLoading}
                      className="flex-1 flex items-center justify-center gap-1 px-4 py-2 text-[11px] font-semibold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl cursor-pointer"
                    >
                      {withdrawLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-950" /> : 'Confirm Withdrawal'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Renewal Tree Relations Card */}
          {(fd.parentFd || fd.childFds.length > 0) && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm space-y-4">
              <h3 className="text-base font-bold text-white tracking-tight border-b border-slate-800/80 pb-3 flex items-center gap-2">
                <Layers className="h-4.5 w-4.5 text-blue-400" />
                Renewal Tree
              </h3>
              
              <div className="space-y-4">
                {/* Parent relation link */}
                {fd.parentFd && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Parent FD (Prior Term)</span>
                    <Link
                      href={`/fds/${fd.parentFd.id}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-800/60 bg-slate-950/45 hover:bg-slate-950 text-xs font-semibold text-slate-200 group transition-all"
                    >
                      <div className="space-y-0.5">
                        <p className="group-hover:text-blue-400 transition-colors">{fd.parentFd.receiptNumber}</p>
                        <p className="text-[10px] text-slate-500">{formatDate(fd.parentFd.startDate)} – {formatDate(fd.parentFd.endDate)}</p>
                      </div>
                      <span className="text-[10px] text-slate-500">{formatCurrency(fd.parentFd.withdrawAmount)}</span>
                    </Link>
                  </div>
                )}

                {/* Child relation links */}
                {fd.childFds.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Child FDs (Renewed Terms)</span>
                    <div className="space-y-2">
                      {fd.childFds.map((child) => (
                        <Link
                          key={child.id}
                          href={`/fds/${child.id}`}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-800/60 bg-slate-950/45 hover:bg-slate-950 text-xs font-semibold text-slate-200 group transition-all"
                        >
                          <div className="space-y-0.5">
                            <p className="group-hover:text-emerald-400 transition-colors">{child.receiptNumber}</p>
                            <p className="text-[10px] text-slate-500">{formatDate(child.startDate)} – {formatDate(child.endDate)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 font-bold mb-0.5">{formatCurrency(child.principalAmount)}</p>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-[8px] text-emerald-450 uppercase font-bold">
                              {child.status}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
