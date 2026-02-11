import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

interface DialogState {
  isOpen: boolean;
  options: ConfirmOptions;
}

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    options: { title: '', message: '' },
  });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      resolveRef.current = resolve;
      setDialog({ isOpen: true, options });
    });
  }, []);

  const handleResult = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    if (dialog.isOpen && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [dialog.isOpen]);

  useEffect(() => {
    if (!dialog.isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleResult(false);
      if (e.key === 'Tab') {
        const focusable = document.querySelectorAll<HTMLElement>('[data-confirm-dialog] button');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [dialog.isOpen, handleResult]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {dialog.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
              onClick={() => handleResult(false)}
            >
              <motion.div
                data-confirm-dialog
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {dialog.options.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  {dialog.options.message}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleResult(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    {dialog.options.cancelText || '取消'}
                  </button>
                  <button
                    ref={confirmBtnRef}
                    onClick={() => handleResult(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    {dialog.options.confirmText || '確認'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ((options: ConfirmOptions) => Promise<boolean>) => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context.confirm;
};
