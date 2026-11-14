/**
 * @file /src/components/CrashRecoveryBanner.tsx
 * @description Floating Cinema Banner for Crash Recovery.
 * Displays when a previous browser session ended abnormally, offering instant restoration.
 */

import React from 'react';
import { ProjectV1 } from '../types/projectSchema';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { CinemaToolHUD, CinemaBadgeHeader } from './ui/CinemaToolHUD';

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
      className="fixed top-12 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92vw] bg-[#111215] border border-amber-500/60 shadow-[0_14px_40px_rgba(0,0,0,0.94)] px-3 py-2 rounded-lg flex items-center justify-between gap-3 text-xs font-mono-tech animate-in slide-in-from-top-4"
    >
      <div className="flex items-center gap-2 min-w-0">
        <CinemaBadgeHeader
          icon={<AlertCircle className="w-3.5 h-3.5" strokeWidth={2.2} />}
          label="RECOVERY"
          accent="amber"
        />
        <span className="text-[10px] font-black tracking-wider uppercase text-zinc-200 truncate">
          {recoveredProject.meta.title} ({recoveredProject.shots.length})
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <CinemaToolHUD
          title="RESTORE SESSION"
          en={`Restore "${recoveredProject.meta.title}" (${recoveredProject.shots.length} shots) from previous autosave.`}
          bn="কীভাবে ব্যবহার করবেন: আগের অটোসেভ করা সেশন ফিরিয়ে আনতে RESTORE বাটনে চাপুন।"
          accent="amber"
          side="bottom"
        >
          <button
            type="button"
            onClick={() => onRestore(recoveredProject)}
            data-active="true"
            className="cinema-tile cinema-tile-amber px-3 py-2 min-h-[44px] rounded-md flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 cinema-tile-icon" strokeWidth={2.2} />
            <span className="font-black tracking-wider text-[10px] uppercase">RESTORE</span>
          </button>
        </CinemaToolHUD>

        <CinemaToolHUD
          title="DISMISS RECOVERY"
          en="Discard recovery snapshot and keep current timeline."
          bn="কীভাবে ব্যবহার করবেন: রিকভারি নোটিফিকেশন বন্ধ করতে X বাটনে চাপুন।"
          accent="crimson"
          side="bottom"
        >
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss recovery"
            className="cinema-tile cinema-tile-crimson min-h-[44px] min-w-[44px] px-2 rounded-md flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4 cinema-tile-icon" strokeWidth={2.3} />
          </button>
        </CinemaToolHUD>
      </div>
    </aside>
  );
};

