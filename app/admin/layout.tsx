'use client';

import Link from 'next/link';
import { Package, Home, LogOut, FileCode } from 'lucide-react';
import { useState } from 'react';
import { ToastContainer, useToast } from '@/components/admin/Toast';

function AdminContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleLogout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
      window.location.href = '/admin/login';
    } catch (error) {
      toast.error('Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Navigation */}
      <nav className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between h-14">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Product Admin
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-4">
                <Link
                  href="/admin"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-1.5 rounded-md text-sm font-medium"
                >
                  Products
                </Link>
                <Link
                  href="/admin/api-docs"
                  className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-3 py-1.5 rounded-md text-sm font-medium"
                >
                  <FileCode className="w-4 h-4" />
                  API Docs
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Site</span>
              </Link>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 px-2.5 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{loading ? '...' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Full height */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />
    </div>
  );
}

export default function AdminLayout(props: { children: React.ReactNode }) {
  return <AdminContent {...props} />;
}
