'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  KeyRound, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save, 
  Database,
  Lock,
  UserCheck,
  Server
} from 'lucide-react';

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  // State for Profile settings
  const [name, setName] = useState(session?.user?.name || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // State for Security settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(false);
    setProfileError(null);

    if (!name.trim()) {
      setProfileError('Name cannot be empty.');
      setProfileLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update profile.');
      }

      // Update the next-auth session context
      await update({
        ...session,
        user: {
          ...session?.user,
          name: name,
        }
      });

      setProfileSuccess(true);
      router.refresh();
    } catch (err: any) {
      setProfileError(err.message || 'An error occurred.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityLoading(true);
    setSecuritySuccess(false);
    setSecurityError(null);
    setValidationErrors({});

    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = 'Current password is required';
    if (!newPassword) errors.newPassword = 'New password is required';
    else if (newPassword.length < 6) errors.newPassword = 'New password must be at least 6 characters';
    
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSecurityLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update password.');
      }

      setSecuritySuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setSecurityError(err.message || 'An error occurred.');
    } finally {
      setSecurityLoading(false);
    }
  };

  const isSystemAdmin = (session?.user as any)?.role === 'ADMIN';

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your personal details, security parameters, and system credentials.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left column: Profile & Security settings */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Card 1: Profile Details */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Profile Details</h3>
                <p className="text-xs text-slate-450">Change public info visible to other vault users.</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-5">
              {profileSuccess && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-4 text-xs text-emerald-400 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-450" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              {profileError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-4 text-xs text-rose-450 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-450" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-550"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Email Address (Read-only)</label>
                  <input
                    type="email"
                    disabled
                    value={session?.user?.email || ''}
                    className="w-full px-3 py-2.5 bg-slate-950/40 border border-slate-900 rounded-xl text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-450 hover:to-teal-450 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.15)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {profileLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-955" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Details
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Security settings */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Password Security</h3>
                <p className="text-xs text-slate-450">Change password to protect vault access.</p>
              </div>
            </div>

            <form onSubmit={handleSecuritySubmit} className="mt-6 space-y-5">
              {securitySuccess && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-4 text-xs text-emerald-400 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-450" />
                  <span>Password changed successfully!</span>
                </div>
              )}

              {securityError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-4 text-xs text-rose-450 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-rose-450" />
                  <span>{securityError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                      validationErrors.currentPassword 
                        ? 'border-rose-500/50 focus:ring-rose-500/50' 
                        : 'border-slate-800 focus:ring-emerald-500/50'
                    }`}
                  />
                  {validationErrors.currentPassword && (
                    <p className="text-[10px] text-rose-400 font-semibold">{validationErrors.currentPassword}</p>
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                        validationErrors.newPassword 
                          ? 'border-rose-500/50 focus:ring-rose-500/50' 
                          : 'border-slate-800 focus:ring-emerald-500/50'
                      }`}
                    />
                    {validationErrors.newPassword && (
                      <p className="text-[10px] text-rose-400 font-semibold">{validationErrors.newPassword}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className={`w-full px-3 py-2.5 bg-slate-950 border rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 ${
                        validationErrors.confirmPassword 
                          ? 'border-rose-500/50 focus:ring-rose-500/50' 
                          : 'border-slate-800 focus:ring-emerald-500/50'
                      }`}
                    />
                    {validationErrors.confirmPassword && (
                      <p className="text-[10px] text-rose-400 font-semibold">{validationErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={securityLoading}
                  className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl hover:from-emerald-450 hover:to-teal-450 transition-all shadow-[0_4px_15px_rgba(16,185,129,0.15)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {securityLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-955" />
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right column: Diagnostics & system info */}
        <div className="space-y-8">
          
          {/* Card 3: Session diagnostics */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
            <h3 className="text-base font-bold text-white tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
              <UserCheck className="h-4.5 w-4.5 text-emerald-400" />
              Session Info
            </h3>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                <span className="text-slate-400">Active Role</span>
                <span className="font-bold text-white">{isSystemAdmin ? 'Administrator' : 'Viewer'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                <span className="text-slate-400">Role Permissions</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isSystemAdmin 
                    ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' 
                    : 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'
                }`}>
                  {isSystemAdmin ? 'Read & Write' : 'Read Only'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Identifier token</span>
                <span className="font-mono text-slate-500 text-[9px] truncate max-w-[150px]">{session?.user?.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Card 4: System Information */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 shadow-xl backdrop-blur-sm">
            <h3 className="text-base font-bold text-white tracking-tight border-b border-slate-800 pb-3 flex items-center gap-2">
              <Server className="h-4.5 w-4.5 text-blue-400" />
              System Meta
            </h3>

            <div className="mt-4 space-y-4 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                <span className="text-slate-400">Framework</span>
                <span className="font-bold text-slate-300">Next.js 15.5</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800/40">
                <span className="text-slate-400">Database Engine</span>
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <Database className="h-3 w-3 text-blue-450" />
                  PostgreSQL
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Prisma Engine</span>
                <span className="font-bold text-slate-300">v6.4.0</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
