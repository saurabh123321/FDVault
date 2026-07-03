'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  Search, 
  Filter, 
  Calendar, 
  ArrowUpDown, 
  Eye, 
  Edit, 
  Trash2, 
  RefreshCw, 
  ArrowDownRight, 
  Plus, 
  X,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Loader2,
  Trash
} from 'lucide-react';

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

export default function FDList() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [fds, setFds] = useState<FDData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedHolder, setSelectedHolder] = useState('');
  const [sortBy, setSortBy] = useState('endDate');
  const [sortOrder, setSortOrder] = useState('asc'); // asc or desc
  
  // Date ranges
  const [startRangeFrom, setStartRangeFrom] = useState('');
  const [startRangeTo, setStartRangeTo] = useState('');
  const [endRangeFrom, setEndRangeFrom] = useState('');
  const [endRangeTo, setEndRangeTo] = useState('');

  const [showFilters, setShowFilters] = useState(false);
  const [holders, setHolders] = useState<string[]>([]);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch FDs with active filters
  const fetchFds = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedStatuses.length > 0) params.append('status', selectedStatuses.join(','));
      if (selectedHolder) params.append('holderName', selectedHolder);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      
      if (startRangeFrom) params.append('startRangeFrom', startRangeFrom);
      if (startRangeTo) params.append('startRangeTo', startRangeTo);
      if (endRangeFrom) params.append('endRangeFrom', endRangeFrom);
      if (endRangeTo) params.append('endRangeTo', endRangeTo);

      const res = await fetch(`/api/fds?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load fixed deposits');
      
      const data = await res.json();
      setFds(data);

      // Collect unique holders for filter dropdown if not already set
      if (holders.length === 0) {
        const uniqueHolders: string[] = Array.from(new Set(data.map((fd: FDData) => fd.holderName)));
        setHolders(uniqueHolders);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedStatuses, selectedHolder, sortBy, sortOrder, startRangeFrom, startRangeTo, endRangeFrom, endRangeTo, holders.length]);

  useEffect(() => {
    fetchFds();
  }, [fetchFds]);

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedStatuses([]);
    setSelectedHolder('');
    setSortBy('endDate');
    setSortOrder('asc');
    setStartRangeFrom('');
    setStartRangeTo('');
    setEndRangeFrom('');
    setEndRangeTo('');
  };

  const softDeleteFd = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Fixed Deposit? This will soft delete the record.')) {
      return;
    }

    try {
      const res = await fetch(`/api/fds/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete');
      }
      
      // Update list
      setFds((prev) => prev.filter((fd) => fd.id !== id));
      alert('Fixed Deposit deleted successfully.');
    } catch (err: any) {
      alert(err.message || 'Error deleting FD');
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Fixed Deposits
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            View, search, filter, and manage family fixed deposits.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/fds/new"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:from-emerald-450 hover:to-teal-450 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.2)] cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 text-slate-950 stroke-[3px]" />
            New Deposit
          </Link>
        )}
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-3.5 h-full w-4.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search account no, receipt no, or holder name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-900/40 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/80 transition-all text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-3.5 flex items-center text-slate-500 hover:text-slate-350 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter toggler & Reset */}
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
              showFilters || selectedStatuses.length > 0 || selectedHolder || startRangeFrom || endRangeFrom
                ? 'border-emerald-500/35 bg-emerald-500/5 text-emerald-400'
                : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-900'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {(selectedStatuses.length > 0 || selectedHolder || startRangeFrom || endRangeFrom) && (
              <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">
                !
              </span>
            )}
          </button>

          {(searchTerm || selectedStatuses.length > 0 || selectedHolder || startRangeFrom || endRangeFrom) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/20 px-3.5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 backdrop-blur-sm">
          {/* Holder Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">FD Holder</label>
            <select
              value={selectedHolder}
              onChange={(e) => setSelectedHolder(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              <option value="">All Family Members</option>
              {holders.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Status Checkboxes */}
          <div className="space-y-1.5 lg:col-span-2">
            <label className="text-xs font-semibold text-slate-400">Status</label>
            <div className="flex flex-wrap gap-2">
              {['ACTIVE', 'MATURED', 'RENEWED', 'WITHDRAWN'].map((status) => {
                const isChecked = selectedStatuses.includes(status);
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusToggle(status)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-450'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Default Sort</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            >
              <option value="endDate-asc">Maturity Date (Closest First)</option>
              <option value="endDate-desc">Maturity Date (Farthest First)</option>
              <option value="principalAmount-desc">Principal Amount (Highest First)</option>
              <option value="principalAmount-asc">Principal Amount (Lowest First)</option>
              <option value="interestRate-desc">Interest Rate (Highest First)</option>
              <option value="startDate-desc">Start Date (Newest First)</option>
            </select>
          </div>

          {/* Date range filters */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-400">Start Date Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startRangeFrom}
                onChange={(e) => setStartRangeFrom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={startRangeTo}
                onChange={(e) => setStartRangeTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-400">Maturity Date Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={endRangeFrom}
                onChange={(e) => setEndRangeFrom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endRangeTo}
                onChange={(e) => setEndRangeTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-300 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden shadow-2xl backdrop-blur-sm">
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <span className="text-sm font-medium">Fetching deposits...</span>
          </div>
        ) : fds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/40 text-slate-400 border border-slate-800">
              <Filter className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-base font-bold text-white">No Fixed Deposits Found</h3>
            <p className="mt-1.5 text-xs text-slate-400 max-w-xs leading-normal">
              We couldn't find any deposits matching your current search criteria or filters.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-slate-800 text-xs font-semibold text-slate-350 hover:text-white rounded-xl bg-slate-900/30 cursor-pointer"
              >
                Clear Filters
              </button>
              {isAdmin && (
                <Link
                  href="/fds/new"
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl cursor-pointer"
                >
                  Create Deposit
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/20 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  <th className="py-4 px-4 font-semibold">
                    <button onClick={() => handleSort('holderName')} className="flex items-center gap-1 hover:text-white cursor-pointer">
                      Holder
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-4 font-semibold hidden md:table-cell">Account / Receipt</th>
                  <th className="py-4 px-4 font-semibold">
                    <button onClick={() => handleSort('startDate')} className="flex items-center gap-1 hover:text-white cursor-pointer">
                      Start Date
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-4 font-semibold">
                    <button onClick={() => handleSort('endDate')} className="flex items-center gap-1 hover:text-white cursor-pointer">
                      Maturity Date
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-4 font-semibold text-right">
                    <button onClick={() => handleSort('principalAmount')} className="flex items-center gap-1 justify-end ml-auto hover:text-white cursor-pointer">
                      Principal
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-4 font-semibold text-right hidden sm:table-cell">
                    <button onClick={() => handleSort('interestRate')} className="flex items-center gap-1 justify-end ml-auto hover:text-white cursor-pointer">
                      Rate
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-4 px-4 font-semibold text-center">Status</th>
                  <th className="py-4 px-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {fds.map((fd) => (
                  <tr key={fd.id} className="group hover:bg-slate-900/20 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-200">
                      {fd.holderName}
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell space-y-0.5">
                      <p className="text-slate-350">{fd.accountNumber}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{fd.receiptNumber}</p>
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {formatDate(fd.startDate)}
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {formatDate(fd.endDate)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-200">
                      {formatCurrency(fd.principalAmount)}
                    </td>
                    <td className="py-4 px-4 text-right text-emerald-450 font-semibold hidden sm:table-cell">
                      {fd.interestRate.toFixed(2)}%
                    </td>
                    <td className="py-4 px-4 text-center">
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
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/fds/${fd.id}`}
                          title="View Details"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:text-emerald-400 text-slate-400 transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        {isAdmin && (
                          <>
                            <Link
                              href={`/fds/${fd.id}/edit`}
                              title="Edit"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:text-blue-400 text-slate-400 transition-all cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => softDeleteFd(fd.id)}
                              title="Delete"
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-rose-950/20 hover:text-rose-450 hover:border-rose-900/30 text-slate-400 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
