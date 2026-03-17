"use client";

import { useState, useCallback } from "react";

interface DialogState {
  isOpen: boolean;
  title: string;
  description: string;
  type: "info" | "warning" | "success";
  confirmText: string;
  cancelText: string;
  showCancel: boolean;
  onConfirm?: () => void;
}

const initialState: DialogState = {
  isOpen: false,
  title: "",
  description: "",
  type: "info",
  confirmText: "确定",
  cancelText: "取消",
  showCancel: true,
};

export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<DialogState>(initialState);

  const showDialog = useCallback(
    (options: Partial<Omit<DialogState, "isOpen">> & { onConfirm?: () => void }) => {
      setDialogState({
        ...initialState,
        ...options,
        isOpen: true,
      });
    },
    []
  );

  const closeDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showWarning = useCallback(
    (title: string, description: string, onConfirm?: () => void) => {
      showDialog({
        title,
        description,
        type: "warning",
        confirmText: "知道了",
        showCancel: false,
        onConfirm,
      });
    },
    [showDialog]
  );

  const showError = useCallback(
    (title: string, description: string, onConfirm?: () => void) => {
      showDialog({
        title,
        description,
        type: "warning",
        confirmText: "重试",
        showCancel: false,
        onConfirm,
      });
    },
    [showDialog]
  );

  return {
    dialogState,
    showDialog,
    closeDialog,
    showWarning,
    showError,
  };
}
