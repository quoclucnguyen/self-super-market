'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
            <div className="flex-1">
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription className="mt-2">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">"{productName}"</span>?
                This action cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting…
              </>
            ) : (
              'Delete Product'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
