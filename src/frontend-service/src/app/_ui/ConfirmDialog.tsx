"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import React from "react";

interface ConfirmDialogProps {
  show: boolean;
  onClose: () => void;
  question: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDialog({
  show,
  onClose,
  question,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
}: ConfirmDialogProps) {
  return (
    <Dialog open={show} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
          <DialogTitle className="text-lg font-semibold text-gray-800 mb-4">
            {question}
          </DialogTitle>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                onCancel?.();
                onClose();
              }}
              className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
            >
              {cancelText}
            </button>

            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition"
            >
              {confirmText}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
