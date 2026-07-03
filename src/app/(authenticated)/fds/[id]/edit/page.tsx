'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  AlertCircle,
  Percent
} from 'lucide-react';

export default function EditFD({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [id, setId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    accountNumber: '',
    receiptNumber: '',
    holderName: '',
    startDate: '',
    endDate: '',
    principalAmount: '',
    withdrawAmount: '',
    interestRate: '',
    status: 'ACTIVE',
    remarks: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Unwrap params in Next.js 15
  useEffect(() => {
    params.then((p) => {
      setId(p.id);
    });
  }, [params]);

  // Fetch current FD details
  useEffect(() => {
    if (!id) return;

    async function fetchDetails() {
      try {
        const res = await fetch(`/api/fds/${id}`);
        if (!res.ok) throw new Error('Failed to load fixed deposit details');
        const data = await res.json();
        
        // Format dates to YYYY-MM-DD for HTML input
        const formatInputDate = (dStr: string) => {
          return new Date(dStr).toISOString().substring(0, 10);
        };

        setFormData({
          accountNumber: data.accountNumber,
          receiptNumber: data.receiptNumber,
          holderName: data.holderName,
          startDate: formatInputDate(data.startDate),
          endDate: formatInputDate(data.endDate),
          principalAmount: String(data.principalAmount),
          withdrawAmount: String(data.withdrawAmount),
          interestRate: String(data.interestRate),
          status: data.status,
          remarks: data.remarks || '',
        });
      } catch (err: any) {
        setSubmitError(err.message || 'Error loading data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetails();
  }, [id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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

    if (!validateForm() || !id) return;

    setIsSaving(true);

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
        status: formData.status,
        remarks: formData.remarks || null,
      };

      const res = await fetch(`/api/fds/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update fixed deposit');
      }

      router.push(`/fds/${id}`);
      router.refresh();
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred while updating.');
    } finally {
      setIsSaving(false);
    }
  };

  // Guard view for admin only
  if (!isAdmin) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/20 p-8 text-center backdrop-blur-sm">
        <AlertCircle className="h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-lg font-bold text-white">Access Denied</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-xs leading-normal">
          Only administrators have permission to edit fixed deposits.
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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <span className="mt-3 text-xs font-semibold">Loading Fixed Deposit details...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/fds/${id}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-white sm:text-2xl">Edit Fixed Deposit</h1>
          <p className="text-xs text-slate-450 mt-0.5">Modify fixed deposit configuration</p>
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
              <label className="text-xs font-semibold text-slate-455">Account Number *</label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                disabled={isSaving}
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.accountNumber 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.accountNumber && (
                <p className="text-[10px] text-rose-450 font-semibold">{formErrors.accountNumber}</p>
              )}
            </div>

            {/* Receipt Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-455">Receipt Number *</label>
              <input
                type="text"
                name="receiptNumber"
                value={formData.receiptNumber}
                onChange={handleInputChange}
                disabled={isSaving}
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.receiptNumber 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.receiptNumber && (
                <p className="text-[10px] text-rose-450 font-semibold">{formErrors.receiptNumber}</p>
              )}
            </div>

            {/* Holder Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-455">Holder Name *</label>
              <input
                type="text"
                name="holderName"
                value={formData.holderName}
                onChange={handleInputChange}
                disabled={isSaving}
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.holderName 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.holderName && (
                <p className="text-[10px] text-rose-450 font-semibold">{formErrors.holderName}</p>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-455">Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                disabled={isSaving}
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.startDate 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.startDate && (
                <p className="text-[10px] text-rose-455 font-semibold">{formErrors.startDate}</p>
              )}
            </div>

            {/* End Date (Maturity Date) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-455">Maturity Date *</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                disabled={isSaving}
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.endDate 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.endDate && (
                <p className="text-[10px] text-rose-455 font-semibold">{formErrors.endDate}</p>
              )}
            </div>

            {/* Principal Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-455">Principal Amount (₹) *</label>
              <input
                type="number"
                step="any"
                name="principalAmount"
                value={formData.principalAmount}
                onChange={handleInputChange}
                disabled={isSaving}
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.principalAmount 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.principalAmount && (
                <p className="text-[10px] text-rose-455 font-semibold">{formErrors.principalAmount}</p>
              )}
            </div>

            {/* Withdrawal Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-455">Withdrawal Amount (₹) *</label>
              <input
                type="number"
                step="any"
                name="withdrawAmount"
                value={formData.withdrawAmount}
                onChange={handleInputChange}
                disabled={isSaving}
                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                  formErrors.withdrawAmount 
                    ? 'border-rose-500/50 focus:ring-rose-500/50' 
                    : 'border-slate-800 focus:ring-emerald-500/50 focus:border-emerald-550'
                }`}
              />
              {formErrors.withdrawAmount && (
                <p className="text-[10px] text-rose-455 font-semibold">{formErrors.withdrawAmount}</p>
              )}
            </div>

            {/* Interest Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-455">Interest Rate (% p.a.) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="interestRate"
                  value={formData.interestRate}
                  onChange={handleInputChange}
                  disabled={isSaving}
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
                <p className="text-[10px] text-rose-455 font-semibold">{formErrors.interestRate}</p>
              )}
            </div>

            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-455">Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                disabled={isSaving}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-550"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="MATURED">MATURED</option>
                <option value="RENEWED">RENEWED</option>
                <option value="WITHDRAWN">WITHDRAWN</option>
              </select>
            </div>

            {/* Remarks */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-455">Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                disabled={isSaving}
                rows={3}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-550 resize-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <Link
              href={`/fds/${id}`}
              className="px-5 py-2.5 border border-slate-800 text-xs font-semibold text-slate-350 hover:text-white hover:bg-slate-900/40 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-450 hover:to-teal-450 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.15)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
