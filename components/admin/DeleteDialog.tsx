'use client';

import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useEffect } from 'react';

interface DeleteDialogProps {
  isOpen: boolean;
  productName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDialog({
  isOpen,
  productName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteDialogProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen || isDeleting) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={!isDeleting ? onCancel : undefined}>
      {/* Message Box - Windows Form Style */}
      <div
        className="wf-messagebox wf-messagebox-error relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute top-2 right-2 wf-button !min-h-0 !py-0 !px-1 wf-focus-visible disabled:wf-disabled"
          aria-label="Close"
        >
          <X className="w-3 h-3" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4 pr-6">
          <div className="shrink-0">
            <div className="wf-panel w-10 h-10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="flex-1 pt-1">
            <h3 className="wf-label font-semibold text-sm mb-2">
              Delete Product
            </h3>
            <p className="text-xs wf-text mb-4">
              Are you sure you want to delete{' '}
              <span className="font-semibold wf-text">"{productName}"</span>?
              <br />
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="wf-button wf-focus-visible disabled:wf-disabled"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="wf-button wf-focus-visible disabled:wf-disabled border-red-900 !bg-red-100 hover:!bg-red-200"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
