/**
 * @file /src/components/modals/OnboardingDownloadModal.tsx
 * @description CapCut-inspired 3-step Onboarding, 4-Tier Pricing, and Cross-Platform Download Hub
 * styled in HANDFILM STUDIO's dark brutalist-editorial aesthetic.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  ArrowRight,
  Check,
  Zap,
  Monitor,
  Smartphone,
  Globe,
  Download,
  ShieldCheck,
  AlertTriangle,
  Laptop,
  Trash2,
  LogOut,
  CheckCircle2,
  Sparkles,
  Users
} from 'lucide-react';
import {
  getOrCreateDeviceFingerprint,
  OnboardingStep,
  ProTierName,
  SubscriptionPlan,
  useLicenseStore
} from '../../services/licenseService';
import { hasSupabaseConfig } from '../../services/supabaseClient';
import { eventBus } from '../../core/eventBus';
import { CheckoutModal } from './CheckoutModal';

interface DownloadArtifactMeta {
  filename: string;
  platform: 'windows' | 'android';
  mime: string;
  badge: string;
  version: string;
  url: string;
  available: boolean;
  sizeBytes: number;
  sha256: string;
}

const FALLBACK_ARTIFACTS: DownloadArtifactMeta[] = [
  {
    filename: 'HandFilm-Studio-Setup.exe',
    platform: 'windows',
    mime: 'application/vnd.microsoft.portable-executable',
    badge: '64-BIT NATIVE · GPU ACCELERATED · v1.0.0',
    version: '1.0.0',
    url: '/downloads/HandFilm-Studio-Setup.exe',
    available: true,
    sizeBytes: 16896,
    sha256: 'verified-server-artifact'
  },
  {
    filename: 'HandFilm-Studio.apk',
    platform: 'android',
    mime: 'application/vnd.android.package-archive',
    badge: 'ANDROID 10+ · ARM64 · 60FPS TOUCH ENGINE',
    version: '1.0.0',
    url: '/downloads/HandFilm-Studio.apk',
    available: true,
    sizeBytes: 16384,
    sha256: 'verified-server-artifact'
  }
];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return 'VERIFIED PACKAGE';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export interface OnboardingDownloadModalProps {
  onLaunchWebStudio?: () => void;
}

export const OnboardingDownloadModal: React.FC<OnboardingDownloadModalProps> = ({
  onLaunchWebStudio
}) => {
  const isOpen = useLicenseStore((s) => s.isOnboardingModalOpen);
  const step = useLicenseStore((s) => s.onboardingStep);
  const setStep = useLicenseStore((s) => s.setOnboardingStep);
  const closeModal = useLicenseStore((s) => s.closeOnboardingFlow);

  const license = useLicenseStore((s) => s.license);
  const sessionToken = useLicenseStore((s) => s.sessionToken);
  const isLoading = useLicenseStore((s) => s.isLoading);
  const error = useLicenseStore((s) => s.error);
  const magicLinkSentTo = useLicenseStore((s) => s.magicLinkSentTo);
  const deviceLimitConflict = useLicenseStore((s) => s.deviceLimitConflict);
  const paywallFeatureName = useLicenseStore((s) => s.paywallFeatureName);
  const selectedPlanLabel = useLicenseStore((s) => s.selectedPlanLabel);

  const registerTrial = useLicenseStore((s) => s.registerTrial);
  const loginWithPassword = useLicenseStore((s) => s.loginWithPassword);
  const sendMagicLink = useLicenseStore((s) => s.sendMagicLink);
  const signInWithGoogle = useLicenseStore((s) => s.signInWithGoogle);
  const revokeDevice = useLicenseStore((s) => s.revokeDevice);
  const signOut = useLicenseStore((s) => s.signOut);
  const activateTrialPlan = useLicenseStore((s) => s.activateTrialPlan);

  // Step 1 Auth Form States
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<'signup' | 'signin' | 'magic'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showGoogleFallbackInput, setShowGoogleFallbackInput] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');

  // Step 2 Pricing Grid States
  const [billingCycle, setBillingCycle] = useState<SubscriptionPlan>('monthly');
  const [pendingUpgradeTier, setPendingUpgradeTier] = useState<ProTierName | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  // Step 3 Download Hub States
  const [artifacts, setArtifacts] = useState<DownloadArtifactMeta[]>(FALLBACK_ARTIFACTS);
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);

  const supabaseReady = hasSupabaseConfig();
  const deviceInfo = getOrCreateDeviceFingerprint();
  const isAuthenticated = Boolean(license?.authenticated && sessionToken);

  // Skip Step 1 automatically whenever modal opens & user is already signed in
  useEffect(() => {
    if (!isOpen) return;
    setCheckoutNotice(null);
    setPendingUpgradeTier(null);
    if (isAuthenticated && step === 1) {
      setStep(2);
    }
  }, [isOpen, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load download manifest when entering Step 3
  useEffect(() => {
    if (!isOpen || step !== 3) return;
    let cancelled = false;
    fetch('/api/downloads/manifest')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.success && Array.isArray(data.artifacts) && data.artifacts.length > 0) {
          setArtifacts(data.artifacts);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [isOpen, step]);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleGoogleContinue = async () => {
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailAuthMode === 'magic') {
      await sendMagicLink(email);
      return;
    }
    if (emailAuthMode === 'signup') {
      await registerTrial({ email, password, name });
    } else {
      await loginWithPassword({ email, password });
    }
  };

  const handleStartTrialTier = async () => {
    setCheckoutNotice(null);
    setPendingUpgradeTier(null);
    setIsCheckoutModalOpen(false);
    await activateTrialPlan();
  };

  const handleSelectPaidTier = (tier: ProTierName) => {
    setCheckoutNotice(null);
    setPendingUpgradeTier(tier);
    setIsCheckoutModalOpen(true);
  };

  const handleLaunchWebStudio = () => {
    closeModal();
    if (onLaunchWebStudio) {
      onLaunchWebStudio();
    } else {
      eventBus.emit('studio:launch_web_studio');
    }
  };

  const winArtifact = artifacts.find((a) => a.platform === 'windows') || FALLBACK_ARTIFACTS[0];
  const androidArtifact = artifacts.find((a) => a.platform === 'android') || FALLBACK_ARTIFACTS[1];

  const activeTierDisplay = (() => {
    if (license?.tier === 'pro') {
      const tierTag = (license.proTier || 'pro').toUpperCase();
      return `${tierTag} STUDIO · ${license.proPlan === 'annual' ? 'ANNUAL' : 'MONTHLY'} ACTIVE`;
    }
    if (license?.tier === 'trial') {
      return `30-DAY FULL TRIAL · ${license.daysRemaining} ${license.daysRemaining === 1 ? 'DAY' : 'DAYS'} LEFT`;
    }
    if (selectedPlanLabel) return selectedPlanLabel;
    return 'FREE STUDIO TIER';
  })();

  const stepTabs: Array<{ num: OnboardingStep; label: string; enabled: boolean }> = [
    { num: 1, label: '01. Account', enabled: true },
    { num: 2, label: '02. Plan', enabled: isAuthenticated },
    { num: 3, label: '03. Download', enabled: isAuthenticated }
  ];

  const proPrice = billingCycle === 'monthly' ? '$19.99' : '$15.99';
  const ultraPrice = billingCycle === 'monthly' ? '$39.99' : '$31.99';
  const teamsPrice = billingCycle === 'monthly' ? '$14.99' : '$11.99';

  return createPortal(
    <div
      className="fixed inset-0 z-[1230] flex items-center justify-center bg-black/88 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="HandFilm Studio Onboarding, Plans, and Download Hub"
    >
      <div className="w-full max-w-5xl bg-[#0B0B0D] border border-white/[0.12] rounded-lg shadow-[0_24px_90px_rgba(0,0,0,0.96)] overflow-hidden my-auto">
        {/* Top Modal Header with 3-Step Progression */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/[0.08] bg-[#111115]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-space-grotesk font-black tracking-[0.14em] text-sm sm:text-base text-[#F4F4F5] whitespace-nowrap">
              HAND<span className="text-[#F59E0B]">FILM</span> STUDIO
            </span>
            <span aria-hidden="true" className="hidden sm:inline text-zinc-600">·</span>
            <span className="hidden sm:inline text-[11px] font-mono text-zinc-400 truncate">
              {paywallFeatureName && paywallFeatureName !== 'Pro Studio Feature'
                ? `Unlock ${paywallFeatureName}`
                : 'Cross-Platform NLE Setup'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Stepper Controls */}
            <nav aria-label="Onboarding Steps" className="flex items-center gap-1 bg-[#08080A] border border-white/[0.08] rounded p-0.5 font-mono">
              {stepTabs.map((item) => {
                const isActive = step === item.num;
                const isDone =
                  (item.num === 1 && isAuthenticated && step > 1) ||
                  (item.num === 2 && isAuthenticated && step > 2);
                return (
                  <button
                    key={item.num}
                    type="button"
                    disabled={!item.enabled}
                    onClick={() => item.enabled && setStep(item.num)}
                    className={`px-2.5 py-1.5 rounded-[3px] text-[10px] font-bold tracking-wider uppercase whitespace-nowrap shrink-0 transition-colors touch-manipulation ${
                      isActive
                        ? 'bg-[#F59E0B] text-[#0B0B0D]'
                        : isDone
                          ? 'text-emerald-400 hover:bg-white/[0.05] cursor-pointer'
                          : item.enabled
                            ? 'text-zinc-300 hover:text-white cursor-pointer'
                            : 'text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={closeModal}
              className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center rounded border border-white/[0.12] bg-[#141417] text-zinc-400 hover:text-white hover:border-white/30 transition-colors cursor-pointer touch-manipulation shrink-0"
              aria-label="Close Onboarding Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* STEP 1 — INSTANT ACCOUNT CREATION / SIGN-IN */}
        {step === 1 && (
          <div className="p-5 sm:p-8 md:p-10">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center space-y-2.5">
                <h2 className="font-space-grotesk text-xl sm:text-2xl font-black tracking-tight text-white leading-snug text-balance">
                  AI-Powered Video &amp; Storyboard Studio for Everyone
                </h2>
                <p className="text-xs sm:text-sm font-mono text-zinc-400">
                  No credit card required · Instant sync across Desktop, Android &amp; Web
                </p>
              </div>

              {isAuthenticated && license ? (
                <div className="p-5 rounded-md bg-[#141417] border border-white/[0.1] space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{license.name || license.email}</div>
                      <div className="text-[11px] font-mono text-zinc-400 truncate">{license.email}</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase shrink-0">
                      Signed In
                    </span>
                  </div>

                  {/* Active Devices Management (2-Device Limit) */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400 tabular-nums">
                      <span>Bound Devices ({license.activeDevices.length}/{license.maxDevices})</span>
                      <span className="text-zinc-500">Server-Verified</span>
                    </div>
                    <div className="space-y-1.5">
                      {license.activeDevices.map((dev) => {
                        const isCurrent = dev.deviceId === deviceInfo.deviceId;
                        return (
                          <div
                            key={dev.deviceId}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-[#0B0B0D] border border-white/[0.08] text-[11px] font-mono"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {dev.platform === 'android' ? (
                                <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              ) : (
                                <Laptop className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                              )}
                              <span className="text-zinc-200 truncate">{dev.label}</span>
                              {isCurrent && (
                                <span className="text-[9px] text-emerald-400 font-bold shrink-0">· Current</span>
                              )}
                            </div>
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => revokeDevice(dev.deviceId)}
                                disabled={isLoading}
                                className="px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/15 text-[10px] flex items-center gap-1 cursor-pointer touch-manipulation"
                              >
                                <Trash2 className="w-3 h-3" /> Remove
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex-1 h-11 rounded bg-[#F59E0B] hover:bg-amber-400 text-[#0B0B0D] font-black text-xs tracking-[0.12em] uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors touch-manipulation"
                    >
                      <span>Choose Your Plan</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={signOut}
                      className="h-11 px-4 rounded border border-white/[0.14] bg-[#0B0B0D] hover:bg-white/[0.06] text-zinc-300 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer touch-manipulation"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* 2-Device Conflict Recovery Panel */}
                  {deviceLimitConflict && (
                    <div className="p-3.5 rounded-md bg-red-950/35 border border-red-500/45 space-y-2.5">
                      <div className="flex items-start gap-2 text-red-300 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <div>2-Device Active Limit Reached</div>
                          <p className="text-[11px] font-mono font-normal text-red-200/80 mt-0.5">
                            Revoke one device slot below to authorize this workstation.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {deviceLimitConflict.activeDevices.map((dev) => (
                          <div
                            key={dev.deviceId}
                            className="flex items-center justify-between px-3 py-2 rounded bg-black/70 border border-red-500/30 text-[11px] font-mono"
                          >
                            <span className="text-white truncate">{dev.label}</span>
                            <button
                              type="button"
                              onClick={() => revokeDevice(dev.deviceId)}
                              disabled={isLoading}
                              className="px-2.5 py-1 rounded bg-red-500 hover:bg-red-400 text-black font-black text-[10px] uppercase cursor-pointer touch-manipulation"
                            >
                              Revoke Slot
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Continue with Google (Primary Dark/Cyan Pill Button) */}
                  {showGoogleFallbackInput && !supabaseReady && (
                    <input
                      type="email"
                      value={googleEmailInput}
                      onChange={(e) => setGoogleEmailInput(e.target.value)}
                      placeholder="Enter your Google account email..."
                      className="w-full h-11 px-4 rounded-full bg-[#141417] border border-cyan-400/50 text-xs text-white font-mono outline-none focus:border-cyan-300"
                    />
                  )}

                  <button
                    type="button"
                    data-testid="onboarding-google-btn"
                    onClick={handleGoogleContinue}
                    disabled={isLoading}
                    className="w-full h-12 rounded-full bg-[#0E171B] hover:bg-[#132229] border border-cyan-400/70 hover:border-cyan-300 text-white font-space-grotesk font-bold text-sm tracking-wide flex items-center justify-center gap-3 cursor-pointer transition-all shadow-[0_0_24px_rgba(34,211,238,0.18)] active:scale-[0.99] touch-manipulation"
                  >
                    <span className="w-5 h-5 rounded-full bg-white text-[#0B0B0D] font-black text-xs flex items-center justify-center shrink-0">
                      G
                    </span>
                    <span>
                      {showGoogleFallbackInput && !supabaseReady
                        ? 'Confirm Google Account'
                        : 'Continue with Google'}
                    </span>
                  </button>

                  {/* Continue with Email Button */}
                  <button
                    type="button"
                    data-testid="onboarding-email-toggle"
                    onClick={() => setShowEmailForm((prev) => !prev)}
                    className="w-full h-11 rounded-full bg-[#141417] hover:bg-[#1B1B20] border border-white/[0.14] hover:border-white/30 text-zinc-100 font-space-grotesk font-semibold text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-colors touch-manipulation"
                  >
                    <Mail className="w-4 h-4 text-[#F59E0B]" />
                    <span>Continue with Email</span>
                  </button>

                  {/* Expanded Email + Password / Magic Link Form */}
                  {showEmailForm && (
                    <form
                      onSubmit={handleEmailSubmit}
                      className="p-4 rounded-md bg-[#141417] border border-white/[0.1] space-y-3"
                    >
                      <div className="grid grid-cols-3 gap-1 p-1 rounded bg-[#0B0B0D] border border-white/[0.08] font-mono">
                        {([
                          { id: 'signup', label: 'Sign Up' },
                          { id: 'signin', label: 'Sign In' },
                          { id: 'magic', label: 'Magic Link' }
                        ] as const).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setEmailAuthMode(tab.id)}
                            className={`h-8 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors touch-manipulation ${
                              emailAuthMode === tab.id
                                ? 'bg-[#F59E0B] text-[#0B0B0D]'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {emailAuthMode === 'signup' && (
                        <div>
                          <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                            Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Studio Director"
                            className="w-full h-10 px-3 rounded bg-[#0B0B0D] border border-white/[0.14] focus:border-[#F59E0B] text-xs text-white font-mono outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="director@handfilm.studio"
                          className="w-full h-10 px-3 rounded bg-[#0B0B0D] border border-white/[0.14] focus:border-[#F59E0B] text-xs text-white font-mono outline-none"
                        />
                      </div>

                      {emailAuthMode !== 'magic' && (
                        <div>
                          <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                            Password
                          </label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            className="w-full h-10 px-3 rounded bg-[#0B0B0D] border border-white/[0.14] focus:border-[#F59E0B] text-xs text-white font-mono outline-none"
                          />
                        </div>
                      )}

                      {magicLinkSentTo && (
                        <div className="px-3 py-2 rounded bg-emerald-500/15 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
                          Magic sign-in link sent to {magicLinkSentTo}. Check your inbox to continue.
                        </div>
                      )}

                      {error && (
                        <div className="px-3 py-2 rounded bg-red-500/15 border border-red-500/40 text-[11px] font-mono text-red-300">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-10 rounded bg-[#F59E0B] hover:bg-amber-400 disabled:opacity-60 text-[#0B0B0D] font-black text-xs tracking-[0.12em] uppercase cursor-pointer transition-colors touch-manipulation"
                      >
                        {isLoading
                          ? 'Authenticating...'
                          : emailAuthMode === 'magic'
                            ? 'Send Magic Link'
                            : emailAuthMode === 'signup'
                              ? 'Create Free Account & Continue'
                              : 'Sign In & Continue'}
                      </button>
                    </form>
                  )}

                  {!showEmailForm && error && (
                    <div className="px-3 py-2 rounded bg-red-500/15 border border-red-500/40 text-[11px] font-mono text-red-300">
                      {error}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Supabase Auth &amp; Server Clock Protected</span>
                </span>
                <span className="uppercase">{deviceInfo.platform}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — CHOOSE YOUR PLAN (4-TIER PRICING GRID) */}
        {step === 2 && (
          <div className="p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2 className="font-space-grotesk text-xl sm:text-2xl font-black tracking-tight text-white">
                  Choose Your Studio Plan
                </h2>
                <p className="text-xs font-mono text-zinc-400 mt-1">
                  Signed in as <span className="text-zinc-200">{license?.email || 'Creator'}</span> · Switch or cancel anytime
                </p>
              </div>

              {/* Monthly / Yearly Toggle */}
              <div className="inline-flex items-center gap-1 p-1 rounded bg-[#141417] border border-white/[0.1] self-start sm:self-auto font-mono">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1.5 rounded-[3px] text-[11px] font-bold uppercase cursor-pointer transition-colors touch-manipulation ${
                    billingCycle === 'monthly'
                      ? 'bg-[#F59E0B] text-[#0B0B0D]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`px-3 py-1.5 rounded-[3px] text-[11px] font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors touch-manipulation ${
                    billingCycle === 'annual'
                      ? 'bg-[#F59E0B] text-[#0B0B0D]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Yearly</span>
                  <span
                    className={`text-[9px] font-black px-1 rounded ${
                      billingCycle === 'annual' ? 'bg-black/20 text-black' : 'text-emerald-400'
                    }`}
                  >
                    -20%
                  </span>
                </button>
              </div>
            </div>

            {/* 4-Tier Pricing Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
              {/* Tier 1: FREE / 30-DAY TRIAL */}
              <div className="flex flex-col justify-between p-4 rounded-md bg-[#141417] border border-white/[0.1]">
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                      For Solo Storytellers
                    </div>
                    <h3 className="font-space-grotesk text-base font-black text-white mt-0.5">
                      FREE / 30-DAY TRIAL
                    </h3>
                  </div>

                  <div className="flex items-baseline gap-1.5 tabular-nums">
                    <span className="text-3xl font-black text-white">$0</span>
                    <span className="text-xs font-mono text-zinc-400">/ month</span>
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-white/[0.08] text-xs text-zinc-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Basic &amp; core NLE timeline tools</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>1080p MP4 &amp; XML/PDF export</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Full 30-day studio trial unlocked</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  data-testid="plan-trial-btn"
                  disabled={isLoading}
                  onClick={handleStartTrialTier}
                  className="mt-5 w-full h-11 rounded bg-white hover:bg-zinc-200 text-[#0B0B0D] font-space-grotesk font-black text-xs tracking-wider uppercase cursor-pointer transition-colors touch-manipulation"
                >
                  Get started
                </button>
              </div>

              {/* Tier 2: PRO */}
              <div
                className={`flex flex-col justify-between p-4 rounded-md bg-[#141417] border transition-colors ${
                  pendingUpgradeTier === 'pro' ? 'border-cyan-400' : 'border-white/[0.12]'
                }`}
              >
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                      For Filmmakers &amp; Editors
                    </div>
                    <h3 className="font-space-grotesk text-base font-black text-white mt-0.5">
                      PRO
                    </h3>
                  </div>

                  <div className="tabular-nums">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white">{proPrice}</span>
                      <span className="text-xs font-mono text-zinc-400">/ month</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">$191 billed yearly</div>
                    )}
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-white/[0.08] text-xs text-zinc-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>4K RAW 16-bit master export</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>AI Audio Studio &amp; Voice Remover</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>34 Light Rigs &amp; unlimited cloud sync</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  data-testid="plan-pro-btn"
                  disabled={isLoading}
                  onClick={() => handleSelectPaidTier('pro')}
                  className="mt-5 w-full h-11 rounded bg-cyan-400 hover:bg-cyan-300 text-[#0B0B0D] font-space-grotesk font-black text-xs tracking-wider uppercase cursor-pointer transition-colors touch-manipulation"
                >
                  Upgrade
                </button>
              </div>

              {/* Tier 3: ULTRA (Most Popular) */}
              <div
                className={`relative flex flex-col justify-between p-4 rounded-md bg-[#17140E] border transition-colors ${
                  pendingUpgradeTier === 'ultra' ? 'border-amber-300 shadow-[0_0_28px_rgba(245,158,11,0.22)]' : 'border-[#F59E0B]/75'
                }`}
              >
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#F59E0B]">
                        Most Popular
                      </span>
                      <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                    </div>
                    <h3 className="font-space-grotesk text-base font-black text-white mt-0.5 flex items-center gap-1.5">
                      <span>ULTRA</span>
                    </h3>
                  </div>

                  <div className="tabular-nums">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white">{ultraPrice}</span>
                      <span className="text-xs font-mono text-zinc-400">/ month</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <div className="text-[10px] font-mono text-amber-300/80 mt-0.5">$383 billed yearly</div>
                    )}
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-white/[0.1] text-xs text-zinc-200">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
                      <span>Everything in Pro Studio</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
                      <span>AI Video &amp; Image generation credits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
                      <span>Priority rendering &amp; custom LUTs</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  data-testid="plan-ultra-btn"
                  disabled={isLoading}
                  onClick={() => handleSelectPaidTier('ultra')}
                  className="mt-5 w-full h-11 rounded bg-[#F59E0B] hover:bg-amber-400 text-[#0B0B0D] font-space-grotesk font-black text-xs tracking-wider uppercase cursor-pointer transition-colors shadow-[0_0_20px_rgba(245,158,11,0.3)] touch-manipulation"
                >
                  Upgrade
                </button>
              </div>

              {/* Tier 4: TEAMS */}
              <div
                className={`flex flex-col justify-between p-4 rounded-md bg-[#141417] border transition-colors ${
                  pendingUpgradeTier === 'teams' ? 'border-emerald-400' : 'border-white/[0.12]'
                }`}
              >
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                      <span>For Production Houses</span>
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-space-grotesk text-base font-black text-white mt-0.5">
                      TEAMS
                    </h3>
                  </div>

                  <div className="tabular-nums">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white">{teamsPrice}</span>
                      <span className="text-xs font-mono text-zinc-400">/ seat / mo</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">$143 / seat billed yearly</div>
                    )}
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-white/[0.08] text-xs text-zinc-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Multi-seat NLE workspace</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Shared storyboard projects</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Shared team asset &amp; LUT library</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  data-testid="plan-teams-btn"
                  disabled={isLoading}
                  onClick={() => handleSelectPaidTier('teams')}
                  className="mt-5 w-full h-11 rounded bg-[#1E1E24] hover:bg-emerald-400 text-white hover:text-[#0B0B0D] border border-emerald-400/50 font-space-grotesk font-black text-xs tracking-wider uppercase cursor-pointer transition-colors touch-manipulation"
                >
                  Upgrade
                </button>
              </div>
            </div>

            {/* Multi-Gateway Notice */}
            <div className="px-3.5 py-2.5 rounded bg-[#121216] border border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
              <span>Supported gateways: bKash · Nagad · Manual TrxID (BDT ৳) &amp; PayPal (USD $)</span>
              <span className="text-[#F59E0B] font-bold">Instant Auto-Upgrade</span>
            </div>

            {error && (
              <div className="px-3 py-2 rounded bg-red-500/15 border border-red-500/40 text-[11px] font-mono text-red-300">
                {error}
              </div>
            )}
            {checkoutNotice && (
              <div className="px-3 py-2 rounded bg-emerald-500/15 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
                {checkoutNotice}
              </div>
            )}

            <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
              <span>Basic editing, cutting, 1080p &amp; XML/PDF exports remain free after trial.</span>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-zinc-200 hover:text-[#F59E0B] font-bold flex items-center gap-1 cursor-pointer touch-manipulation"
              >
                <span>Go to Downloads</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — DIRECT PLATFORM DOWNLOAD HUB */}
        {step === 3 && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="tabular-nums">{activeTierDisplay}</span>
                </div>
                <h2 className="font-space-grotesk text-xl sm:text-2xl font-black tracking-tight text-white">
                  Your HandFilm Studio Account is Ready!
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="self-start sm:self-auto px-3 py-1.5 rounded border border-white/[0.14] bg-[#141417] hover:border-white/30 text-[11px] font-mono font-bold text-zinc-300 hover:text-white cursor-pointer touch-manipulation shrink-0"
              >
                Change Plan
              </button>
            </div>

            {/* 3 Direct Platform Cards: Windows, Android, Web Studio */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              {/* 1. Windows Desktop (.exe) */}
              <div className="flex flex-col justify-between p-4 sm:p-5 rounded-md bg-[#141417] border border-white/[0.1] hover:border-[#F59E0B]/50 transition-colors">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded bg-[#F59E0B]/15 border border-[#F59E0B]/40 flex items-center justify-center text-[#F59E0B]">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-space-grotesk text-sm font-black text-white uppercase tracking-wide">
                      Windows Desktop (.exe)
                    </h3>
                    <p className="text-[11px] font-mono text-zinc-400 mt-1 tabular-nums">
                      Windows 10/11 64-Bit · {formatBytes(winArtifact.sizeBytes)}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Hardware-accelerated 60FPS workstation installer with offline GPU rendering and OPFS media caching.
                  </p>
                </div>

                <a
                  href="/downloads/HandFilm-Studio-Setup.exe"
                  download="HandFilm-Studio-Setup.exe"
                  data-testid="step3-download-exe"
                  onClick={() => setDownloadedFile('HandFilm-Studio-Setup.exe')}
                  className="mt-5 w-full h-11 rounded bg-[#F59E0B] hover:bg-amber-400 text-[#0B0B0D] font-space-grotesk font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors touch-manipulation"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Download .EXE</span>
                </a>
              </div>

              {/* 2. Android App (.apk) */}
              <div className="flex flex-col justify-between p-4 sm:p-5 rounded-md bg-[#141417] border border-white/[0.1] hover:border-cyan-400/50 transition-colors">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-space-grotesk text-sm font-black text-white uppercase tracking-wide">
                      Android App (.apk)
                    </h3>
                    <p className="text-[11px] font-mono text-zinc-400 mt-1 tabular-nums">
                      Android 10+ ARM64 · {formatBytes(androidArtifact.sizeBytes)}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Capacitor-ready mobile NLE with touch timeline scrubbing, long-press drag reorder, and pinch stage zoom.
                  </p>
                </div>

                <a
                  href="/downloads/HandFilm-Studio.apk"
                  download="HandFilm-Studio.apk"
                  data-testid="step3-download-apk"
                  onClick={() => setDownloadedFile('HandFilm-Studio.apk')}
                  className="mt-5 w-full h-11 rounded bg-cyan-400 hover:bg-cyan-300 text-[#0B0B0D] font-space-grotesk font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors touch-manipulation"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Download .APK</span>
                </a>
              </div>

              {/* 3. Web Studio */}
              <div className="flex flex-col justify-between p-4 sm:p-5 rounded-md bg-[#141417] border border-emerald-500/40 hover:border-emerald-400 transition-colors">
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-space-grotesk text-sm font-black text-white uppercase tracking-wide">
                      Web Studio
                    </h3>
                    <p className="text-[11px] font-mono text-zinc-400 mt-1">
                      Instant Browser NLE · Zero Install
                    </p>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Launch the complete multi-track storyboard, AI image/video generation, and WebCodecs 4K export workspace directly.
                  </p>
                </div>

                <button
                  type="button"
                  data-testid="step3-launch-web"
                  onClick={handleLaunchWebStudio}
                  className="mt-5 w-full h-11 rounded bg-emerald-400 hover:bg-emerald-300 text-[#0B0B0D] font-space-grotesk font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-colors touch-manipulation"
                >
                  <Zap className="w-4 h-4 fill-current shrink-0" />
                  <span>Launch Web Studio Now</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-400">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Signed packages · AI calls authenticated via backend proxy</span>
              </span>
              {downloadedFile && (
                <span className="text-emerald-400 font-bold">
                  Downloading: {downloadedFile}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {pendingUpgradeTier && (
        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          planTier={pendingUpgradeTier}
          billingCycle={billingCycle}
          onChangeBillingCycle={setBillingCycle}
          onClose={() => setIsCheckoutModalOpen(false)}
          onSuccess={(message) => {
            setIsCheckoutModalOpen(false);
            setPendingUpgradeTier(null);
            setCheckoutNotice(message);
          }}
        />
      )}
    </div>,
    document.body
  );
};
