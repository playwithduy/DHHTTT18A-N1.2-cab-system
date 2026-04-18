'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: string; // e.g. 'h-[70vh]' or 'h-auto'
  showClose?: boolean;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'h-auto',
  showClose = false,
}) => {
  const [mounted, setMounted] = useState(false);
  const dragControls = useDragControls();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[999] max-w-sm mx-auto"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            className={cn(
              'fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-2xl z-[1000] overflow-hidden max-w-sm mx-auto flex flex-col',
              height
            )}
          >
            {/* Handle Bar */}
            <div 
              className="flex justify-center flex-shrink-0 pt-4 pb-2 cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            {(title || showClose) && (
              <div className="flex items-center justify-between px-6 py-2 border-b border-slate-50 flex-shrink-0">
                {title && <h3 className="font-bold text-slate-800 text-lg">{title}</h3>}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 pb-8">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
