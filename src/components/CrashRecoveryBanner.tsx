/**
 * @file /src/components/CrashRecoveryBanner.tsx
 * @description Floating Cinema Banner for Crash Recovery.
 * Displays when a previous browser session ended abnormally, offering instant restoration.
 */

import React from 'react';
import { ProjectV1 } from '../types/projectSchema';
import { AlertCircle, RotateCcw, X } from 'lucide-react';

interface CrashRecoveryBannerProps {
  recoveredProject: ProjectV1;
  onRestore: (project: ProjectV1) => void;
  onDismiss: () => void;
}

export const CrashRecoveryBanner: React.FC<CrashRecoveryBannerProps> = ({
  recoveredProject,
  onRestore,
  onDismiss
}) => {
  return (
    <aside 
      aria-label="Crash Recovery Notice"
      className="fixed top-12 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92vw] bg-[#0F0C08] border border-[#D4AF37] shadow-[0_10px_35px_rgba(0,0,0,0.9)] p-3 rounded-[2px] flex items-center justify-between gap-3 text-xs font-mono-tech animate-in slide-in-from-top-4"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-[1px] bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#FFE066] shrink-0">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="font-cinzel text-xs font-bold text-[#FFE066] tracking-wider uppercase truncate">
            Session Recovery Available
          </h4>
          <p className="text-[10px] text-white/70 truncate">
            Restore "{recoveredProject.meta.title}" ({recoveredProject.shots.length} shots) from last session?
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onRestore(recoveredProject)}
          className="px-3 py-1 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-bold text-[10px] rounded-[1px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESTORE</span>
        </button>
        <button
          onClick={onDismiss}
          className="p-1 text-white/40 hover:text-white rounded hover:bg-white/10 cursor-pointer transition-colors"
          title="Dismiss recovery"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
