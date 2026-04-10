'use client';

import Link from 'next/link';
import { Package, Home, LogOut, FileCode } from 'lucide-react';
import { useState } from 'react';
import { ToastContainer, useToast } from '@/components/admin/Toast';
import { Toaster } from '@/components/ui/sonner';
import './windows-form.css';

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
    <div className="wf-root h-screen flex flex-col overflow-hidden">
      {/* Title Bar - Windows Style */}
      <div className="wf-titlebar shrink-0 px-2 py-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-white" />
            <span className="text-xs font-semibold text-white">
              Product Admin
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/admin"
              className="wf-menu-item text-white"
            >
              Products
            </Link>
            <Link
              href="/admin/api-docs"
              className="wf-menu-item text-white flex items-center gap-1"
            >
              <FileCode className="w-3 h-3" />
              API Docs
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="wf-button wf-focus-visible !min-h-0 !py-1 !px-2"
              aria-label="Back to site"
            >
              <Home className="w-3 h-3" />
            </Link>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="wf-button wf-focus-visible !min-h-0 !py-1 !px-2"
              aria-label="Logout"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Menu Bar */}
      <div className="wf-menubar shrink-0">
        <div className="flex items-center gap-4 px-2">
          <span className="wf-menu-item">File</span>
          <span className="wf-menu-item">Edit</span>
          <span className="wf-menu-item">View</span>
          <span className="wf-menu-item">Tools</span>
          <span className="wf-menu-item">Help</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden wf-bg">
        {children}
      </main>

      {/* Status Bar */}
      <div className="wf-statusbar shrink-0">
        <div className="flex items-center justify-between px-2">
          <span className="wf-text-muted">Ready</span>
          <span className="wf-text-muted">Product Administration System</span>
        </div>
      </div>

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
