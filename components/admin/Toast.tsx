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
    success: <CheckCircle className="w-4 h-4 text-green-700" />,
    error: <AlertCircle className="w-4 h-4 text-red-700" />,
    info: <Info className="w-4 h-4 text-blue-700" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-700" />,
  };

  const messageBoxTypes = {
    success: 'wf-messagebox-info',
    error: 'wf-messagebox-error',
    info: 'wf-messagebox-info',
    warning: 'wf-messagebox-warning',
  };

  return (
    <div
      className={`
        wf-messagebox ${messageBoxTypes[toast.type]}
        transition-all duration-200 ease-out
        ${isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-center gap-2">
        {icons[toast.type]}
        <p className="flex-1 text-xs wf-text">
          {toast.message}
        </p>
        <button
          onClick={() => {
            setIsLeaving(true);
            setTimeout(() => onDismiss(toast.id), 200);
          }}
          className="wf-button wf-focus-visible !min-h-0 !py-0 !px-1 ml-2"
          aria-label="Dismiss notification"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-1 max-w-sm w-full">
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
