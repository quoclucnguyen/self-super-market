'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  };

  const backgrounds = {
    success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-lg border shadow-lg
        transition-all duration-200 ease-out
        ${backgrounds[toast.type]}
        ${isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
        {toast.message}
      </p>
      <button
        onClick={() => {
          setIsLeaving(true);
          setTimeout(() => onDismiss(toast.id), 200);
        }}
        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Hook for managing toasts
let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toastState: Toast[] = [];

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastState);

  useEffect(() => {
    toastListeners.push(setToasts);
    return () => {
      toastListeners = toastListeners.filter(l => l !== setToasts);
    };
  }, []);

  const showToast = (type: ToastType, message: string, duration?: number) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, type, message, duration };
    toastState = [...toastState, newToast];
    toastListeners.forEach(listener => listener([...toastState]));
    return id;
  };

  const dismissToast = (id: string) => {
    toastState = toastState.filter(t => t.id !== id);
    toastListeners.forEach(listener => listener([...toastState]));
  };

  return {
    toasts,
    success: (message: string, duration?: number) => showToast('success', message, duration),
    error: (message: string, duration?: number) => showToast('error', message, duration),
    info: (message: string, duration?: number) => showToast('info', message, duration),
    warning: (message: string, duration?: number) => showToast('warning', message, duration),
    dismiss: dismissToast,
  };
}
