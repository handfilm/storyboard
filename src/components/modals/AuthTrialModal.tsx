/**
 * @file /src/components/modals/AuthTrialModal.tsx
 * @description Brutalist Sign In / Start 30-Day Free Trial Modal with Email/Password,
 * Google Sign-In (@supabase/supabase-js + Express fallback), persistent deviceId binding,
 * and 2-device active session slot management.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Zap,
  Shield,
  Laptop,
  Smartphone,
  Trash2,
  AlertTriangle,
  LogOut,
  Crown,
  Lock
} from 'lucide-react';
import {
  getOrCreateDeviceFingerprint,
  useLicenseStore
} from '../../services/licenseService';
import { hasSupabaseConfig } from '../../services/supabaseClient';

export const AuthTrialModal: React.FC = () => {
  const isOpen = useLicenseStore((s) => s.isAuthModalOpen);
  const closeAuthModal = useLicenseStore((s) => s.closeAuthModal);
  const license = useLicenseStore((s) => s.license);
  const isLoading = useLicenseStore((s) => s.isLoading);
  const error = useLicenseStore((s) => s.error);
  const deviceLimitConflict = useLicenseStore((s) => s.deviceLimitConflict);
  const registerTrial = useLicenseStore((s) => s.registerTrial);
  const loginWithPassword = useLicenseStore((s) => s.loginWithPassword);
  const signInWithGoogle = useLicenseStore((s) => s.signInWithGoogle);
  const revokeDevice = useLicenseStore((s) => s.revokeDevice);
  const signOut = useLicenseStore((s) => s.signOut);
  const openPaywallModal = useLicenseStore((s) => s.openPaywallModal);
  const paywallFeatureName = useLicenseStore((s) => s.paywallFeatureName);

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [showGoogleFallbackInput, setShowGoogleFallbackInput] = useState(false);

  const deviceInfo = getOrCreateDeviceFingerprint();
  const supabaseReady = hasSupabaseConfig();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeAuthModal]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register') {
      await registerTrial({ email, password, name });
    } else {
      await loginWithPassword({ email, password });
    }
  };

  const handleGoogleClick = async () => {
    if (supabaseReady) {
      await signInWithGoogle();
      return;
    }
    if (!showGoogleFallbackInput) {
      setShowGoogleFallbackInput(true);
      return;
    }
    await signInWithGoogle({
      email: googleEmailInput || email,
      name: name || undefined
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1210] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="HandFilm Studio Account and 30-Day Trial"
    >
      <div className="w-full max-w-lg bg-[#0B0B0D] border border-amber-500/45 rounded-lg shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#121216]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-500 text-black flex items-center justify-center">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black tracking-[0.16em] uppercase text-white">
                {license?.authenticated ? 'STUDIO ACCOUNT // LICENSE' : 'START 30-DAY FREE TRIAL'}
              </h2>
              <p className="text-[10px] font-mono text-zinc-400">
                Server-Verified Clock · 2-Device License Binding
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            className="w-8 h-8 flex items-center justify-center rounded border border-white/15 bg-black/60 text-zinc-400 hover:text-white touch-manipulation"
            aria-label="Close Auth Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Active Authenticated Account View */}
          {license?.authenticated ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded bg-[#141418] border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white">{license.name || license.email}</div>
                  <div className="text-[10px] font-mono text-zinc-400">{license.email}</div>
                </div>
                <div className="text-right">
                  {license.tier === 'pro' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-black text-[10px] font-black tracking-wider uppercase">
                      <Crown className="w-3 h-3" /> PRO STUDIO
                    </span>
                  ) : license.tier === 'trial' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/50 text-amber-300 text-[10px] font-black tracking-wider uppercase">
                      <Zap className="w-3 h-3" /> {license.daysRemaining}D LEFT IN TRIAL
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 border border-white/15 text-zinc-300 text-[10px] font-bold uppercase">
                      <Lock className="w-3 h-3" /> FREE TIER
                    </span>
                  )}
                </div>
              </div>

              {/* Active Devices Slot Manager */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  <span>BOUND DEVICES ({license.activeDevices.length}/{license.maxDevices})</span>
                  <span className="text-emerald-400">HMAC-SHA256 VERIFIED</span>
                </div>
                <div className="space-y-1.5">
                  {license.activeDevices.map((dev) => {
                    const isCurrent = dev.deviceId === deviceInfo.deviceId;
                    return (
                      <div
                        key={dev.deviceId}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-black/60 border border-white/10 text-[11px] font-mono"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {dev.platform === 'android' ? (
                            <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="text-white font-bold">{dev.label}</span>
                            {isCurrent && (
                              <span className="ml-1.5 px-1 py-0.5 text-[8.5px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                                THIS DEVICE
                              </span>
                            )}
                            <div className="text-[9px] text-zinc-500 truncate">{dev.deviceId}</div>
                          </div>
                        </div>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => revokeDevice(dev.deviceId)}
                            disabled={isLoading}
                            className="px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/15 text-[9.5px] flex items-center gap-1 touch-manipulation"
                          >
                            <Trash2 className="w-3 h-3" /> REMOVE
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {license.tier !== 'pro' && (
                  <button
                    type="button"
                    onClick={() => {
                      closeAuthModal();
                      openPaywallModal('PRO STUDIO UPGRADE');
                    }}
                    className="flex-1 h-10 rounded bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] tracking-[0.14em] uppercase flex items-center justify-center gap-1.5 touch-manipulation"
                  >
                    <Crown className="w-3.5 h-3.5" /> UPGRADE TO PRO
                  </button>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  className="h-10 px-4 rounded border border-white/15 bg-black/60 hover:bg-white/10 text-zinc-300 font-bold text-[10.5px] tracking-wider uppercase flex items-center justify-center gap-1.5 touch-manipulation"
                >
                  <LogOut className="w-3.5 h-3.5" /> SIGN OUT
                </button>
              </div>
            </div>
          ) : (
            <>
              {paywallFeatureName && paywallFeatureName !== 'Pro Studio Feature' && (
                <div className="px-3 py-2 rounded bg-amber-500/10 border border-amber-500/35 text-[10.5px] font-mono text-amber-200">
                  Activate your <strong className="text-amber-400">30-Day Free Pro Trial</strong> to unlock{' '}
                  <span className="underline">{paywallFeatureName}</span>.
                </div>
              )}

              {/* 2-Device Limit Exceeded Recovery Panel */}
              {deviceLimitConflict && (
                <div className="p-3.5 rounded bg-red-950/40 border border-red-500/50 space-y-2.5">
                  <div className="flex items-start gap-2 text-red-300 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <div>2-DEVICE ACTIVE LIMIT REACHED</div>
                      <p className="text-[10px] font-mono font-normal text-red-200/80 mt-0.5">
                        Remove one existing device below to bind this workstation automatically.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {deviceLimitConflict.activeDevices.map((dev) => (
                      <div
                        key={dev.deviceId}
                        className="flex items-center justify-between px-2.5 py-2 rounded bg-black/70 border border-red-500/30 text-[10.5px] font-mono"
                      >
                        <div className="truncate">
                          <div className="text-white font-bold">{dev.label}</div>
                          <div className="text-[9px] text-zinc-500 truncate">{dev.deviceId}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => revokeDevice(dev.deviceId)}
                          disabled={isLoading}
                          className="px-2.5 py-1 rounded bg-red-500 hover:bg-red-400 text-black font-black text-[9.5px] uppercase tracking-wider touch-manipulation"
                        >
                          REVOKE &amp; SIGN IN
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/70 border border-white/10 rounded">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`h-8 rounded text-[10px] font-black tracking-[0.14em] uppercase transition-colors touch-manipulation ${
                    mode === 'register'
                      ? 'bg-amber-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  START 30D TRIAL
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`h-8 rounded text-[10px] font-black tracking-[0.14em] uppercase transition-colors touch-manipulation ${
                    mode === 'login'
                      ? 'bg-amber-500 text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  SIGN IN
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'register' && (
                  <div>
                    <label className="block text-[9.5px] font-mono uppercase tracking-widest text-zinc-400 mb-1">
                      DIRECTOR NAME
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Satyajit / Studio Lead"
                      className="w-full h-10 px-3 rounded bg-black/80 border border-white/15 focus:border-amber-500 text-xs text-white font-mono outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[9.5px] font-mono uppercase tracking-widest text-zinc-400 mb-1">
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="director@handfilm.studio"
                    className="w-full h-10 px-3 rounded bg-black/80 border border-white/15 focus:border-amber-500 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] font-mono uppercase tracking-widest text-zinc-400 mb-1">
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full h-10 px-3 rounded bg-black/80 border border-white/15 focus:border-amber-500 text-xs text-white font-mono outline-none"
                  />
                </div>

                {error && (
                  <div className="px-3 py-2 rounded bg-red-500/15 border border-red-500/40 text-[11px] font-mono text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded bg-[#F59E0B] hover:bg-amber-400 disabled:opacity-60 text-black font-black text-[11px] tracking-[0.16em] uppercase transition-all shadow-[0_0_24px_rgba(245,158,11,0.35)] touch-manipulation"
                >
                  {isLoading
                    ? 'VERIFYING ON SERVER...'
                    : mode === 'register'
                      ? '⚡ ACTIVATE 30-DAY FREE PRO TRIAL'
                      : 'SIGN IN & BIND WORKSTATION'}
                </button>
              </form>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-[9px] font-mono uppercase">
                  <span className="bg-[#0B0B0D] px-2 text-zinc-500">OR CONTINUE WITH GOOGLE</span>
                </div>
              </div>

              {showGoogleFallbackInput && !supabaseReady && (
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="Enter your Google Workspace email..."
                  className="w-full h-9 px-3 rounded bg-black/80 border border-cyan-500/40 text-xs text-white font-mono outline-none"
                />
              )}

              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isLoading}
                className="w-full h-10 rounded border border-white/15 bg-[#141418] hover:border-white/35 text-white font-bold text-[10.5px] tracking-[0.12em] uppercase flex items-center justify-center gap-2 transition-colors touch-manipulation"
              >
                <span className="w-4 h-4 rounded-full bg-white text-black font-black text-[10px] flex items-center justify-center">
                  G
                </span>
                {supabaseReady ? 'GOOGLE SIGN-IN (SUPABASE OAUTH)' : showGoogleFallbackInput ? 'CONFIRM GOOGLE EMAIL' : 'CONTINUE WITH GOOGLE'}
              </button>
            </>
          )}

          {/* Device Fingerprint Telemetry Footer */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9.5px] font-mono text-zinc-500">
            <span className="flex items-center gap-1.5 truncate">
              <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">DEVICE ID: {deviceInfo.deviceId}</span>
            </span>
            <span className="uppercase shrink-0">{deviceInfo.platform}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
