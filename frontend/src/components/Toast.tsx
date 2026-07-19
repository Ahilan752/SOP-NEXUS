import React, { useEffect } from 'react';
import { useAppStore } from '../context/store';
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useAppStore();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        clearToast();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, clearToast]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'REJECTION':
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'APPROVAL':
        return <AlertCircle className="w-5 h-5 text-blue-400" />;
      default:
        return <Info className="w-5 h-5 text-primary-400" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return 'border-emerald-500/30 bg-emerald-950/20';
      case 'REJECTION':
      case 'WARNING':
        return 'border-rose-500/30 bg-rose-950/20';
      case 'APPROVAL':
        return 'border-blue-500/30 bg-blue-950/20';
      default:
        return 'border-primary-500/30 bg-primary-950/20';
    }
  };

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 p-4 rounded-xl border backdrop-blur-lg shadow-xl shadow-black/40 max-w-sm ${getBorderColor(
            toast.type
          )}`}
        >
          <div className="mt-0.5">{getIcon(toast.type)}</div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Notification
            </h4>
            <p className="text-xs text-slate-100 font-medium leading-relaxed">
              {toast.message}
            </p>
          </div>
          <button
            onClick={clearToast}
            className="text-slate-400 hover:text-slate-100 transition-colors p-0.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
