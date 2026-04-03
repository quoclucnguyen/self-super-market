'use client';

import Link from 'next/link';
import { Package, Home, LogOut, FileCode } from 'lucide-react';
import { useState } from 'react';
import { ToastContainer, useToast } from '@/components/admin/Toast';
import { Toaster } from '@/components/ui/sonner';

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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="shrink-0 bg-card border-b border-border">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between h-14">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="text-lg font-bold text-foreground">
                  Product Admin
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-4">
                <Link
                  href="/admin"
                  className="text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                >
                  Products
                </Link>
                <Link
                  href="/admin/api-docs"
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                >
                  <FileCode className="w-4 h-4" />
                  API Docs
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors touch-action-manipulation"
                aria-label="Back to site"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Site</span>
              </Link>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-destructive px-2.5 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{loading ? '...' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Toast Container */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />

      {/* Sonner Toaster */}
      <Toaster />
    </div>
  );
}

export default function AdminLayout(props: { children: React.ReactNode }) {
  return <AdminContent {...props} />;
}
