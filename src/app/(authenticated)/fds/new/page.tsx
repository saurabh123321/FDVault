'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Percent
} from 'lucide-react';

export default function NewFD() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [formData, setFormData] = useState({
    accountNumber: '',
    receiptNumber: '',
    holderName: '',
    startDate: '',
    endDate: '',
    principalAmount: '',
    withdrawAmount: '',
    interestRate: '',
    remarks: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear errors for this field as the user types
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.accountNumber) errors.accountNumber = 'Account number is required';
    if (!formData.receiptNumber) errors.receiptNumber = 'Receipt number is required';
    if (!formData.holderName) errors.holderName = 'Holder name is required';
    if (!formData.startDate) errors.startDate = 'Start date is required';
    if (!formData.endDate) errors.endDate = 'Maturity date is required';
    if (!formData.principalAmount) errors.principalAmount = 'Principal amount is required';
    else if (isNaN(Number(formData.principalAmount)) || Number(formData.principalAmount) <= 0) {
      errors.principalAmount = 'Principal amount must be a positive number';
    }
    if (!formData.withdrawAmount) errors.withdrawAmount = 'Maturity amount is required';
    else if (isNaN(Number(formData.withdrawAmount)) || Number(formData.withdrawAmount) <= 0) {
      errors.withdrawAmount = 'Maturity amount must be a positive number';
    }
    if (!formData.interestRate) errors.interestRate = 'Interest rate is required';
    else if (isNaN(Number(formData.interestRate)) || Number(formData.interestRate) < 0) {
      errors.interestRate = 'Interest rate must be non-negative';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        errors.endDate = 'Maturity date must be after start date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const payload = {
        accountNumber: formData.accountNumber,
        receiptNumber: formData.receiptNumber,
        holderName: formData.holderName,
        startDate: formData.startDate,
        endDate: formData.endDate,
        principalAmount: Number(formData.principalAmount),
        withdrawAmount: Number(formData.withdrawAmount),
        interestRate: Number(formData.interestRate),
        remarks: formData.remarks || null,
      };

      const res = await fetch('/api/fds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create fixed deposit');
      }

      router.push('/fds');
      router.refresh();
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred while creating the fixed deposit.');
    } finally {
      setIsLoading(false);
    }
  };

  // Guard view for admin only
  if (!isAdmin) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/20 p-8 text-center backdrop-blur-sm">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-lg font-bold text-white">Access Denied</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-xs leading-normal">
          Only administrators have permission to register new fixed deposits.
        </p>
        <Link
          href="/fds"
          className="mt-6 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
        >
          Go back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/fds"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-white sm:text-2xl">New Fixed Deposit</h1>
          <p className="text-xs text-slate-450 mt-0.5">Register a new Fixed Deposit in the vault</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-2xl backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-4 text-xs text-rose-400 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-450" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Account Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-450">Account Number *</label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="e.g. 1092837465"
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.accountNumber 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.accountNumber && (
                <p className="text-[10px] text-rose-400 font-semibold">{formErrors.accountNumber}</p>
              )}
            </div>

            {/* Receipt Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-450">Receipt Number *</label>
              <input
                type="text"
                name="receiptNumber"
                value={formData.receiptNumber}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="e.g. FD/2026/012"
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.receiptNumber 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.receiptNumber && (
                <p className="text-[10px] text-rose-400 font-semibold">{formErrors.receiptNumber}</p>
              )}
            </div>

            {/* Holder Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-450">Holder Name *</label>
              <input
                type="text"
                name="holderName"
                value={formData.holderName}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="e.g. Ramesh Sharma"
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.holderName 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.holderName && (
                <p className="text-[10px] text-rose-400 font-semibold">{formErrors.holderName}</p>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-450">Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                disabled={isLoading}
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.startDate 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.startDate && (
                <p className="text-[10px] text-rose-400 font-semibold">{formErrors.startDate}</p>
              )}
            </div>

            {/* End Date (Maturity Date) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-450">Maturity Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                disabled={isLoading}
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.endDate 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.endDate && (
                <p className="text-[10px] text-rose-400 font-semibold">{formErrors.endDate}</p>
              )}
            </div>

            {/* Principal Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-450">Principal Amount (₹) *</label>
              <input
                type="number"
                step="any"
                name="principalAmount"
                value={formData.principalAmount}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="e.g. 500000"
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.principalAmount 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.principalAmount && (
                <p className="text-[10px] text-rose-400 font-semibold">{formErrors.principalAmount}</p>
              )}
            </div>

            {/* Withdrawal Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-450">Projected Maturity Amount (₹) *</label>
              <input
                type="number"
                step="any"
                name="withdrawAmount"
                value={formData.withdrawAmount}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="e.g. 536250"
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.withdrawAmount 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.withdrawAmount && (
                <p className="text-[10px] text-rose-400 font-semibold">{formErrors.withdrawAmount}</p>
              )}
            </div>

            {/* Interest Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-450">Interest Rate (% p.a.) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="interestRate"
                  value={formData.interestRate}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  placeholder="e.g. 7.25"
                  className={`w-full pl-3 pr-10 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                    formErrors.interestRate 
                      ? 'border-rose-500/50 focus:ring-rose-500/50' 
                      : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <Percent className="h-3.5 w-3.5 text-slate-500" />
                </div>
              </div>
              {formErrors.interestRate && (
                <p className="text-[10px] text-rose-400 font-semibold">{formErrors.interestRate}</p>
              )}
            </div>

            {/* Remarks */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-450">Remarks (Optional)</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                disabled={isLoading}
                rows={3}
                placeholder="Add bank details or other investment details..."
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-550 resize-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Link
              href="/fds"
              className="px-5 py-2.5 border border-slate-800 text-xs font-semibold text-slate-350 hover:text-white hover:bg-slate-900/40 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-450 hover:to-teal-450 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.15)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Deposit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
