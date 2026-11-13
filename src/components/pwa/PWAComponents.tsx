import React, { useState } from 'react';
import { Download, Smartphone, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const PWAInstallButton: React.FC<{ onTriggered?: () => void }> = ({ onTriggered }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={async () => {
          await install();
          onTriggered?.();
        }}
        className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-emerald-300"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Download className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-[11px] flex items-center gap-1.5">
              <span>INSTALL OFFLINE APP</span>
              <span className="text-[7.5px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                PWA
              </span>
            </div>
            <div className="text-[8.5px] text-zinc-400">Add HANDFILM Studio to desktop</div>
          </div>
        </div>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="w-full px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-left transition-colors cursor-pointer group text-white/90 hover:text-amber-300"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-[11px]">INSTALL ON iOS</div>
              <div className="text-[8.5px] text-zinc-400">Safari Add to Home Screen guide</div>
            </div>
          </div>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-xl bg-[#0B0C11] border border-amber-500/40 p-5 shadow-2xl text-zinc-200 font-mono"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                Install HANDFILM on iOS
              </h3>
              <p className="mt-2.5 text-xs text-zinc-300 leading-relaxed">
                1. Tap the <strong>Share</strong> button in the Safari toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> for full offline studio access.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 py-2 text-xs font-bold text-amber-200 cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-[99990] flex items-center gap-2 rounded-lg bg-amber-500/95 border border-amber-300/60 px-3 py-1.5 text-[11px] font-mono font-bold text-black shadow-xl backdrop-blur-md"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>OFFLINE VAULT MODE — CACHED ASSETS ACTIVE</span>
    </div>
  );
};
