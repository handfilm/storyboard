/**
 * @file /src/components/modals/ProPaywallModal.tsx
 * @description Commercial SaaS Upgrade Paywall ("👑 PRO FEATURE — SUBSCRIBE TO CONTINUE")
 * with Monthly ($9.99 / ৳990) & Annual ($79 / ৳7,900) plans and Stripe / Lemon Squeezy / SSLCommerz billing hooks.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Crown,
  Check,
  Sparkles,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import {
  PaymentProvider,
  SubscriptionPlan,
  useLicenseStore
} from '../../services/licenseService';

const PRO_FEATURES_LIST = [
  '4K / 16-Bit Master Cinema Export (.MP4 & Production Packages)',
  'Gemini Cinema Image & Google Flow / Veo Video AI Generation',
  'AI Vocal Remover & Gemini Neural Voice Studio (TTS / Lyria / Foley)',
  '34 Pro Light Rigs & Volumetric Studio Lighting Bench',
  'Multi-Cam Sync (Quad 4-Camera Live Director Switcher)',
  '2 Bound Workstations (Windows .EXE + Android .APK + Web)'
];

export const ProPaywallModal: React.FC = () => {
  const isOpen = useLicenseStore((s) => s.isPaywallModalOpen);
  const closePaywallModal = useLicenseStore((s) => s.closePaywallModal);
  const paywallFeatureName = useLicenseStore((s) => s.paywallFeatureName);
  const license = useLicenseStore((s) => s.license);
  const isLoading = useLicenseStore((s) => s.isLoading);
  const error = useLicenseStore((s) => s.error);
  const checkoutPro = useLicenseStore((s) => s.checkoutPro);
  const openAuthModal = useLicenseStore((s) => s.openAuthModal);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('annual');
  const [provider, setProvider] = useState<PaymentProvider>('stripe');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNotice(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePaywallModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closePaywallModal]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCheckout = async () => {
    if (!license?.authenticated) {
      closePaywallModal();
      openAuthModal(paywallFeatureName);
      return;
    }
    const res = await checkoutPro({ plan: selectedPlan, provider });
    if (res.ok && res.checkoutUrl) {
      setNotice(`Redirecting to ${provider.toUpperCase()} secure checkout...`);
      window.location.assign(res.checkoutUrl);
    } else if (res.ok && res.message) {
      setNotice(res.message);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1220] flex items-center justify-center bg-black/88 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) closePaywallModal();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="HandFilm Pro Studio Subscription Paywall"
    >
      <div className="w-full max-w-2xl bg-[#0B0B0D] border border-amber-500/50 rounded-lg shadow-[0_24px_90px_rgba(245,158,11,0.18)] overflow-hidden my-auto">
        {/* Top Banner */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-500/25 bg-gradient-to-r from-[#1A1408] via-[#121216] to-[#121216]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-amber-500 text-black flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.5)]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black tracking-[0.15em] uppercase text-amber-300">
                👑 PRO FEATURE — SUBSCRIBE TO CONTINUE
              </h2>
              <p className="text-[10.5px] font-mono text-zinc-300 mt-0.5">
                Locked Module: <span className="text-white font-bold">{paywallFeatureName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closePaywallModal}
            className="w-8 h-8 flex items-center justify-center rounded border border-white/15 bg-black/60 text-zinc-400 hover:text-white touch-manipulation"
            aria-label="Close Paywall Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Plan Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Monthly Plan */}
            <button
              type="button"
              onClick={() => setSelectedPlan('monthly')}
              className={`text-left p-4 rounded-md border transition-all touch-manipulation ${
                selectedPlan === 'monthly'
                  ? 'bg-[#191610] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-[#131317] border-white/12 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-400">
                  MONTHLY STUDIO
                </span>
                {selectedPlan === 'monthly' && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-black uppercase">
                    SELECTED
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">$9.99</span>
                <span className="text-xs font-mono text-amber-300">/ ৳990 mo</span>
              </div>
              <p className="text-[10px] font-mono text-zinc-400 mt-1">
                Flexible month-to-month access across 2 devices.
              </p>
            </button>

            {/* Annual Plan */}
            <button
              type="button"
              onClick={() => setSelectedPlan('annual')}
              className={`text-left p-4 rounded-md border transition-all touch-manipulation ${
                selectedPlan === 'annual'
                  ? 'bg-[#191610] border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.28)]'
                  : 'bg-[#131317] border-white/12 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> ANNUAL STUDIO
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[9px] font-black uppercase">
                  SAVE 34%
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">$79</span>
                <span className="text-xs font-mono text-amber-300">/ ৳7,900 yr</span>
              </div>
              <p className="text-[10px] font-mono text-zinc-400 mt-1">
                Full cinema suite · Priority Flow &amp; Veo render quota.
              </p>
            </button>
          </div>

          {/* Features Checklist */}
          <div className="bg-[#121216] border border-white/10 rounded-md p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRO_FEATURES_LIST.map((feat) => (
              <div key={feat} className="flex items-start gap-2 text-[10.5px] font-mono text-zinc-200">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Payment Gateway Selector */}
          <div className="space-y-1.5">
            <div className="text-[9.5px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <CreditCard className="w-3 h-3 text-amber-400" />
              PAYMENT GATEWAY (WEBHOOK-READY)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'stripe', label: 'STRIPE CARD' },
                { id: 'lemonsqueezy', label: 'LEMON SQUEEZY' },
                { id: 'sslcommerz', label: 'SSLCOMMERZ (BDT ৳)' }
              ] as const).map((gw) => (
                <button
                  key={gw.id}
                  type="button"
                  onClick={() => setProvider(gw.id)}
                  className={`h-9 px-2 rounded border text-[9.5px] font-mono font-bold uppercase tracking-wider transition-colors touch-manipulation ${
                    provider === gw.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-black/60 border-white/12 text-zinc-400 hover:text-white'
                  }`}
                >
                  {gw.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded bg-red-500/15 border border-red-500/40 text-[11px] font-mono text-red-300">
              {error}
            </div>
          )}
          {notice && (
            <div className="px-3 py-2 rounded bg-emerald-500/15 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
              {notice}
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={isLoading}
              className="flex-1 h-11 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-black text-[11px] tracking-[0.15em] uppercase flex items-center justify-center gap-2 shadow-[0_0_26px_rgba(245,158,11,0.4)] touch-manipulation"
            >
              <Crown className="w-4 h-4" />
              {isLoading
                ? 'PROCESSING LICENSE...'
                : !license?.authenticated
                  ? 'SIGN IN TO SUBSCRIBE'
                  : selectedPlan === 'annual'
                    ? 'SUBSCRIBE PRO ANNUAL ($79 / ৳7,900)'
                    : 'SUBSCRIBE PRO MONTHLY ($9.99 / ৳990)'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 text-[9.5px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Basic timeline editing, cutting, 1080p/XML/PDF export &amp; previewing remain FREE forever.
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
