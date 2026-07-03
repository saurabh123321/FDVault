'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function FamilyPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [members, setMembers] = useState<any[]>([]);
  const [familyName, setFamilyName] = useState('Your Family');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VIEWER'
  });

  const fetchFamily = async () => {
    try {
      const res = await fetch('/api/family');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
        setFamilyName(data.familyName);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamily();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to add member');
        return;
      }
      
      // Reset and close
      setFormData({ name: '', email: '', password: '', role: 'VIEWER' });
      setShowAddModal(false);
      fetchFamily();
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-8 w-8 text-emerald-400" />
            {familyName} Members
          </h1>
          <p className="text-gray-400 mt-1">Manage who has access to your family's FD records.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="border-b border-gray-800 bg-gray-900/80 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {members.map((member) => (
                <tr key={member.id} className="transition-colors hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium text-white">{member.name}</td>
                  <td className="px-6 py-4">{member.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        member.role === 'ADMIN'
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {member.role === 'ADMIN' ? <ShieldAlert className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(member.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Add Family Member</h2>
            <p className="text-sm text-gray-400 mb-6">Create credentials for a family member so they can securely log in and view your family's records.</p>
            
            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                {typeof error === 'string' ? error : JSON.stringify(error)}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Rahul Sharma"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="rahul@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="VIEWER">Viewer (Read Only)</option>
                  <option value="ADMIN">Admin (Full Access)</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
