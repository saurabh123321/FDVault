'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { 
  TrendingUp, 
  Layers, 
  Upload, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  User,
  Users,
  Shield
} from 'lucide-react';

interface NavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: TrendingUp },
    { name: 'Fixed Deposits', href: '/fds', icon: Layers },
    { name: 'Import Excel', href: '/fds/import', icon: Upload },
    { name: 'Family', href: '/family', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    const callbackUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/login`
      : '/login';

    try {
      await signOut({ callbackUrl, redirect: true });
    } catch {
      window.location.href = callbackUrl;
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              FD
            </div>
            <span className="text-lg font-bold tracking-tight text-white sm:block">
              Vault<span className="text-emerald-400">.</span>
            </span>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex md:items-center md:gap-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-slate-800/60 text-emerald-400 border border-slate-700/50 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User Profile & Logout (Desktop) */}
          <div className="hidden md:flex md:items-center md:gap-4">
            <div className="flex items-center gap-3 border-r border-slate-800 pr-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 border border-slate-750">
                <User className="h-4 w-4 text-slate-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200 max-w-[120px] truncate">
                  {user.name || 'User'}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Shield className="h-2.5 w-2.5 text-emerald-400" />
                  {user.role === 'ADMIN' ? 'Admin' : 'Viewer'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/20 transition-all duration-300 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white focus:outline-none cursor-pointer"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-900 bg-slate-950 px-2 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
          <div className="border-t border-slate-900 mt-4 pt-4 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800">
                <User className="h-4 w-4 text-slate-300" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-200">
                  {user.name || 'User'}
                </span>
                <span className="text-xs text-slate-400">
                  {user.role === 'ADMIN' ? 'Admin' : 'Viewer'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-2 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
