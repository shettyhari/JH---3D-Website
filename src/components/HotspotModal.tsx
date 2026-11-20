import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Sparkles } from 'lucide-react';
import { ProductHotspot } from '../types';

interface HotspotModalProps {
  hotspot: ProductHotspot | null;
  onClose: () => void;
}

export const HotspotModal: React.FC<HotspotModalProps> = ({ hotspot, onClose }) => {
  return (
    <AnimatePresence>
      {hotspot && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="absolute bottom-6 left-6 max-w-sm bg-stone-900/95 backdrop-blur-xl border border-stone-800 text-stone-100 p-4 rounded-2xl shadow-2xl z-30 pointer-events-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-amber-400">
                Craftsmanship Detail
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-100 p-1 rounded-full hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="mt-2 text-sm font-serif font-medium text-stone-100">
            {hotspot.title}
          </h4>

          <p className="mt-1 text-xs text-stone-300 leading-relaxed font-light">
            {hotspot.description}
          </p>

          <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Hand-Finished
            </span>
            <span className="text-[10px] text-stone-500 uppercase tracking-wider">
              Studio Archive
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
