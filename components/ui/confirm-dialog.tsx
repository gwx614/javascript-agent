"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description: string;
  type?: "info" | "warning" | "success";
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  type = "info",
  confirmText = "确定",
  cancelText = "取消",
  showCancel = true,
}: ConfirmDialogProps) {
  const icons = {
    info: <Info className="h-6 w-6 text-blue-500" />,
    warning: <AlertCircle className="h-6 w-6 text-amber-500" />,
    success: <CheckCircle2 className="h-6 w-6 text-green-500" />,
  };

  const buttonVariants = {
    info: "default" as const,
    warning: "default" as const,
    success: "default" as const,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="gap-4">
          <div className="flex items-center gap-3">
            {icons[type]}
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-base leading-relaxed">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          {showCancel && (
            <Button variant="outline" onClick={onClose}>
              {cancelText}
            </Button>
          )}
          <Button
            variant={buttonVariants[type]}
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
