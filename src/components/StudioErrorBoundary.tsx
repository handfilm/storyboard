/**
 * @file /src/components/StudioErrorBoundary.tsx
 * @description Master Studio Integrity Shield & Error Boundary.
 * Catches any unexpected React render exceptions, completely preventing black screen voids,
 * and provides one-click restoration of all 100 shots with diagnostic export.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { exportFullIdbBackup } from '../utils/backup';
import { storageManager } from '../core/storage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isResetting: boolean;
}

export class StudioErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isResetting: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isResetting: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RAWx Studio Shield] Intercepted runtime exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleResetVault = async () => {
    this.setState({ isResetting: true });
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('rawx_components_v1');
        localStorage.removeItem('rawx_layout_settings_v1');
      }
      await storageManager.resetVault();
      window.location.reload();
    } catch (err) {
      console.error('Error resetting vault:', err);
      window.location.reload();
    }
  };

  private handleDownloadBackup = async () => {
    try {
      await exportFullIdbBackup();
    } catch (err) {
      alert('Could not export backup: ' + err);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#050505] text-[#EDEDED] flex items-center justify-center p-4 font-mono-tech select-none">
          <div className="max-w-2xl w-full bg-[#0A0B0E] border border-[#D4AF37] rounded-[2px] shadow-[0_30px_90px_rgba(0,0,0,0.98)] p-6 sm:p-8 flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#D4AF37] animate-pulse" />
                <h1 className="font-cinzel text-base sm:text-lg font-bold tracking-[0.2em] text-white">
                  RAWx // STUDIO INTEGRITY SHIELD
                </h1>
              </div>
              <span className="px-2 py-0.5 rounded-[1px] bg-red-500/20 border border-red-500/40 text-[9px] font-mono-tech text-red-300">
                CRASH INTERCEPTED
              </span>
            </div>

            {/* Explanatory notice */}
            <p className="text-xs text-white/70 leading-relaxed">
              A runtime exception was intercepted before it could cause a black screen. Your creative data is intact in the vault. You can instantly restore the full 100-shot sequence or download a data backup below.
            </p>

            {/* Error diagnostics box */}
            <div className="bg-black/80 border border-white/10 rounded-[1px] p-3 text-[10px] text-amber-300/90 font-mono-tech overflow-x-auto max-h-36">
              <div className="text-white/40 mb-1">// EXCEPTION MESSAGE:</div>
              <div>{this.state.error?.message || 'Unknown runtime error'}</div>
              {this.state.error?.stack && (
                <div className="text-white/30 text-[8.5px] mt-2 whitespace-pre-wrap">
                  {this.state.error.stack.slice(0, 350)}...
                </div>
              )}
            </div>

            {/* Recovery actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={this.handleResetVault}
                disabled={this.state.isResetting}
                className="flex-1 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#FFE066] text-black font-mono-tech text-xs font-bold tracking-wider rounded-[1px] cursor-pointer transition-colors text-center"
              >
                {this.state.isResetting ? 'RESTORING 100 SHOTS...' : 'RESTORE 100 STUDIO SHOTS'}
              </button>

              <button
                onClick={this.handleDownloadBackup}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono-tech text-xs tracking-wider rounded-[1px] cursor-pointer transition-colors"
              >
                DOWNLOAD BACKUP (JSON)
              </button>

              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-mono-tech text-xs tracking-wider rounded-[1px] cursor-pointer transition-colors"
              >
                RELOAD
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
