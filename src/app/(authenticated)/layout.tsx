import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import Navbar from '@/components/Navbar';
import { SessionProvider } from 'next-auth/react';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/login');
  }

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-400">
        {/* Background radial glow */}
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(10,15,30,1)_40%,rgba(16,185,129,0.04)_75%,rgba(16,185,129,0)_100%)] pointer-events-none" />
        
        {/* Top Navbar */}
        <Navbar user={session.user} />
        
        {/* Main Content Area */}
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
