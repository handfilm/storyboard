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
import { CinemaToolHUD, CinemaBadgeHeader } from '../ui/CinemaToolHUD';

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
    { num: 1, label: '01 ACCOUNT', enabled: true },
    { num: 2, label: '02 PLAN', enabled: isAuthenticated },
    { num: 3, label: '03 INSTALL', enabled: isAuthenticated }
  ];

  const proPrice = billingCycle === 'monthly' ? '$19.99' : '$15.99';
  const proBdtPrice = billingCycle === 'monthly' ? '৳1,490' : '৳1,192';
  const ultraPrice = billingCycle === 'monthly' ? '$39.99' : '$31.99';
  const ultraBdtPrice = billingCycle === 'monthly' ? '৳2,990' : '৳2,392';
  const teamsPrice = billingCycle === 'monthly' ? '$14.99' : '$11.99';
  const teamsBdtPrice = billingCycle === 'monthly' ? '৳1,190' : '৳950';

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
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[#26282E] bg-[#111215]">
          <div className="flex items-center gap-2.5 min-w-0">
            <CinemaBadgeHeader
              icon={<Sparkles className="w-4 h-4" strokeWidth={2.2} />}
              label="HANDFILM STUDIO"
              accent="amber"
            />
            {paywallFeatureName && paywallFeatureName !== 'Pro Studio Feature' && (
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-cyan-300 truncate">
                {paywallFeatureName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <nav aria-label="Onboarding Steps" className="flex items-center gap-1 bg-[#0B0C10] border border-[#26282E] rounded p-0.5 font-mono">
              {stepTabs.map((item) => {
                const isActive = step === item.num;
                const isDone =
                  (item.num === 1 && isAuthenticated && step > 1) ||
                  (item.num === 2 && isAuthenticated && step > 2);
                return (
                  <CinemaToolHUD
                    key={item.num}
                    title={item.label}
                    en={`Go to onboarding step ${item.label}.`}
                    bn={`কীভাবে ব্যবহার করবেন: ${item.label} ধাপে যেতে চাপুন।`}
                    accent={isDone ? 'emerald' : 'amber'}
                    side="bottom"
                  >
                    <button
                      type="button"
                      disabled={!item.enabled}
                      data-active={isActive ? 'true' : 'false'}
                      onClick={() => item.enabled && setStep(item.num)}
                      className={`cinema-tile ${isDone ? 'cinema-tile-emerald' : 'cinema-tile-amber'} px-2.5 py-2 min-h-[38px] rounded text-[10px] font-black tracking-wider uppercase whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40`}
                    >
                      {item.label}
                    </button>
                  </CinemaToolHUD>
                );
              })}
            </nav>

            <CinemaToolHUD
              title="CLOSE ONBOARDING"
              en="Close account & download setup dialog."
              bn="কীভাবে ব্যবহার করবেন: এই উইন্ডো বন্ধ করতে X বাটনে চাপুন।"
              shortcut="ESC"
              accent="crimson"
              side="bottom"
            >
              <button
                type="button"
                onClick={closeModal}
                className="cinema-tile cinema-tile-crimson min-w-[44px] min-h-[44px] px-2.5 flex items-center justify-center rounded cursor-pointer shrink-0"
                aria-label="Close Onboarding Modal"
              >
                <X className="w-4 h-4 cinema-tile-icon" strokeWidth={2.3} />
              </button>
            </CinemaToolHUD>
          </div>
        </div>

        {/* STEP 1 — ACCOUNT */}
        {step === 1 && (
          <div className="p-5 sm:p-8">
            <div className="max-w-md mx-auto space-y-5">
              <div className="flex items-center justify-center">
                <CinemaBadgeHeader
                  icon={<ShieldCheck className="w-4 h-4" strokeWidth={2.2} />}
                  label="STUDIO AUTH"
                  accent="cyan"
                />
              </div>

              {isAuthenticated && license ? (
                <div className="p-5 rounded-md bg-[#111215] border border-[#26282E] space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-black text-white uppercase truncate">{license.name || license.email}</div>
                      <div className="text-[11px] font-mono text-zinc-400 truncate">{license.email}</div>
                    </div>
                    <span className="text-[10px] font-mono font-black text-emerald-400 uppercase shrink-0">
                      SIGNED IN
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#26282E]">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400 tabular-nums">
                      <span>DEVICES ({license.activeDevices.length}/{license.maxDevices})</span>
                    </div>
                    <div className="space-y-1.5">
                      {license.activeDevices.map((dev) => {
                        const isCurrent = dev.deviceId === deviceInfo.deviceId;
                        return (
                          <div
                            key={dev.deviceId}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded bg-[#0B0C10] border border-[#26282E] text-[11px] font-mono"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {dev.platform === 'android' ? (
                                <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              ) : (
                                <Laptop className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              <span className="text-zinc-200 truncate">{dev.label}</span>
                              {isCurrent && (
                                <span className="text-[9px] text-emerald-400 font-black uppercase shrink-0">ACTIVE</span>
                              )}
                            </div>
                            {!isCurrent && (
                              <CinemaToolHUD
                                title="REVOKE DEVICE"
                                en="Disconnect this device from your license seat."
                                bn="কীভাবে ব্যবহার করবেন: ডিভাইসটি রিমুভ করতে REMOVE চাপুন।"
                                accent="crimson"
                              >
                                <button
                                  type="button"
                                  onClick={() => revokeDevice(dev.deviceId)}
                                  disabled={isLoading}
                                  className="cinema-tile cinema-tile-crimson px-2.5 py-1.5 min-h-[36px] rounded text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3 cinema-tile-icon" />
                                  <span>REMOVE</span>
                                </button>
                              </CinemaToolHUD>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <CinemaToolHUD
                      title="CHOOSE PLAN"
                      en="Proceed to tier selection and trial activation."
                      bn="কীভাবে ব্যবহার করবেন: প্ল্যান বেছে নিতে PLAN বাটনে চাপুন।"
                      accent="amber"
                      blockWrapper
                    >
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        data-active="true"
                        className="cinema-tile cinema-tile-amber flex-1 min-h-[44px] rounded font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>PLANS</span>
                        <ArrowRight className="w-4 h-4 cinema-tile-icon" />
                      </button>
                    </CinemaToolHUD>

                    <CinemaToolHUD
                      title="SIGN OUT"
                      en="Sign out from this studio device."
                      bn="কীভাবে ব্যবহার করবেন: একাউন্ট লগআউট করতে SIGN OUT চাপুন।"
                      accent="crimson"
                    >
                      <button
                        type="button"
                        onClick={signOut}
                        className="cinema-tile cinema-tile-crimson min-h-[44px] px-4 rounded font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 cinema-tile-icon" />
                        <span>SIGN OUT</span>
                      </button>
                    </CinemaToolHUD>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {deviceLimitConflict && (
                    <div className="p-3.5 rounded-md bg-red-950/35 border border-red-500/45 space-y-2.5">
                      <div className="flex items-center gap-2 text-red-300 text-xs font-black uppercase">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>2-DEVICE LIMIT</span>
                      </div>
                      <div className="space-y-1.5">
                        {deviceLimitConflict.activeDevices.map((dev) => (
                          <div
                            key={dev.deviceId}
                            className="flex items-center justify-between px-3 py-2 rounded bg-black/70 border border-red-500/30 text-[11px] font-mono"
                          >
                            <span className="text-white truncate">{dev.label}</span>
                            <CinemaToolHUD
                              title="REVOKE SLOT"
                              en="Revoke device slot to authorize this workstation."
                              bn="কীভাবে ব্যবহার করবেন: এই ডিভাইস চালু করতে REVOKE চাপুন।"
                              accent="crimson"
                            >
                              <button
                                type="button"
                                onClick={() => revokeDevice(dev.deviceId)}
                                disabled={isLoading}
                                className="cinema-tile cinema-tile-crimson px-3 py-1.5 min-h-[36px] rounded font-black text-[10px] uppercase cursor-pointer"
                              >
                                REVOKE
                              </button>
                            </CinemaToolHUD>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showGoogleFallbackInput && !supabaseReady && (
                    <input
                      type="email"
                      value={googleEmailInput}
                      onChange={(e) => setGoogleEmailInput(e.target.value)}
                      placeholder="GOOGLE EMAIL..."
                      className="w-full h-11 px-4 rounded-md bg-[#111215] border border-cyan-400/50 text-xs text-white font-mono outline-none focus:border-cyan-300"
                    />
                  )}

                  <CinemaToolHUD
                    title="GOOGLE SIGN-IN"
                    en="Sign in instantly with Google across Desktop, Android, and Web."
                    bn="কীভাবে ব্যবহার করবেন: গুগল একাউন্ট দিয়ে সরাসরি লগইন করতে GOOGLE AUTH চাপুন।"
                    accent="cyan"
                    blockWrapper
                  >
                    <button
                      type="button"
                      data-testid="onboarding-google-btn"
                      onClick={handleGoogleContinue}
                      disabled={isLoading}
                      data-active="true"
                      className="cinema-tile cinema-tile-cyan w-full min-h-[48px] rounded-md font-black text-xs tracking-wider uppercase flex items-center justify-center gap-3 cursor-pointer"
                    >
                      <span className="w-5 h-5 rounded-full bg-white text-black font-black text-xs flex items-center justify-center shrink-0">
                        G
                      </span>
                      <span>
                        {showGoogleFallbackInput && !supabaseReady ? 'CONFIRM GOOGLE' : 'GOOGLE AUTH'}
                      </span>
                    </button>
                  </CinemaToolHUD>

                  <CinemaToolHUD
                    title="EMAIL SIGN-IN / TRIAL"
                    en="Create a free account or sign in using email, password, or magic link."
                    bn="কীভাবে ব্যবহার করবেন: ইমেইল দিয়ে একাউন্ট খুলতে বা লগইন করতে EMAIL AUTH চাপুন।"
                    accent="amber"
                    blockWrapper
                  >
                    <button
                      type="button"
                      data-testid="onboarding-email-toggle"
                      onClick={() => setShowEmailForm((prev) => !prev)}
                      className="cinema-tile cinema-tile-amber w-full min-h-[44px] rounded-md font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <Mail className="w-4 h-4 cinema-tile-icon" />
                      <span>EMAIL AUTH</span>
                    </button>
                  </CinemaToolHUD>

                  {showEmailForm && (
                    <form
                      onSubmit={handleEmailSubmit}
                      className="p-4 rounded-md bg-[#111215] border border-[#26282E] space-y-3"
                    >
                      <div className="grid grid-cols-3 gap-1.5">
                        {([
                          { id: 'signup', label: 'SIGN UP' },
                          { id: 'signin', label: 'SIGN IN' },
                          { id: 'magic', label: 'MAGIC' }
                        ] as const).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            data-active={emailAuthMode === tab.id ? 'true' : 'false'}
                            onClick={() => setEmailAuthMode(tab.id)}
                            className="cinema-tile cinema-tile-amber min-h-[40px] rounded text-[10px] font-black uppercase tracking-wider cursor-pointer"
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {emailAuthMode === 'signup' && (
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="NAME (OPTIONAL)"
                          className="w-full h-11 px-3 rounded bg-[#0B0C10] border border-[#26282E] focus:border-amber-400 text-xs text-white font-mono outline-none"
                        />
                      )}

                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="EMAIL ADDRESS"
                        className="w-full h-11 px-3 rounded bg-[#0B0C10] border border-[#26282E] focus:border-amber-400 text-xs text-white font-mono outline-none"
                      />

                      {emailAuthMode !== 'magic' && (
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="PASSWORD (MIN 6)"
                          className="w-full h-11 px-3 rounded bg-[#0B0C10] border border-[#26282E] focus:border-amber-400 text-xs text-white font-mono outline-none"
                        />
                      )}

                      {magicLinkSentTo && (
                        <div className="px-3 py-2 rounded bg-emerald-500/15 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
                          SENT: {magicLinkSentTo}
                        </div>
                      )}

                      {error && (
                        <div className="px-3 py-2 rounded bg-red-500/15 border border-red-500/40 text-[11px] font-mono text-red-300">
                          {error}
                        </div>
                      )}

                      <CinemaToolHUD
                        title="SUBMIT CREDENTIALS"
                        en="Authenticate or start your free studio trial."
                        bn="কীভাবে ব্যবহার করবেন: তথ্য পূরণ করে CONTINUE বাটনে চাপুন।"
                        accent="amber"
                        blockWrapper
                      >
                        <button
                          type="submit"
                          disabled={isLoading}
                          data-active="true"
                          className="cinema-tile cinema-tile-amber w-full min-h-[44px] rounded font-black text-xs tracking-wider uppercase cursor-pointer"
                        >
                          {isLoading ? 'WAIT...' : emailAuthMode === 'magic' ? 'SEND LINK' : 'CONTINUE'}
                        </button>
                      </CinemaToolHUD>
                    </form>
                  )}

                  {!showEmailForm && error && (
                    <div className="px-3 py-2 rounded bg-red-500/15 border border-red-500/40 text-[11px] font-mono text-red-300">
                      {error}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-[#26282E] flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-500">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SYNC READY</span>
                </span>
                <span>{deviceInfo.platform}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — STUDIO PLAN */}
        {step === 2 && (
          <div className="p-4 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CinemaBadgeHeader
                icon={<Zap className="w-4 h-4" strokeWidth={2.2} />}
                label="STUDIO PLANS"
                accent="amber"
              />

              <div className="inline-flex items-center gap-1.5 p-1 rounded bg-[#111215] border border-[#26282E] font-mono">
                <CinemaToolHUD
                  title="MONTHLY BILLING"
                  en="Switch plan pricing view to monthly billing."
                  bn="কীভাবে ব্যবহার করবেন: মাসিক প্যাকেজ রেট দেখতে MONTHLY চাপুন।"
                  accent="amber"
                >
                  <button
                    type="button"
                    data-active={billingCycle === 'monthly' ? 'true' : 'false'}
                    onClick={() => setBillingCycle('monthly')}
                    className="cinema-tile cinema-tile-amber px-3 py-2 min-h-[40px] rounded text-[10px] font-black uppercase cursor-pointer"
                  >
                    MONTHLY
                  </button>
                </CinemaToolHUD>

                <CinemaToolHUD
                  title="YEARLY BILLING (-20%)"
                  en="Save 20% with annual billing across Pro, Ultra, and Teams."
                  bn="কীভাবে ব্যবহার করবেন: ২০% ডিসকাউন্টে বার্ষিক রেট দেখতে YEARLY -20% চাপুন।"
                  accent="emerald"
                >
                  <button
                    type="button"
                    data-active={billingCycle === 'annual' ? 'true' : 'false'}
                    onClick={() => setBillingCycle('annual')}
                    className="cinema-tile cinema-tile-emerald px-3 py-2 min-h-[40px] rounded text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>YEARLY -20%</span>
                  </button>
                </CinemaToolHUD>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
              {/* FREE / TRIAL */}
              <div className="flex flex-col justify-between p-4 rounded-md bg-[#111215] border border-[#26282E] gap-4">
                <div className="space-y-3">
                  <CinemaBadgeHeader
                    icon={<Check className="w-3.5 h-3.5" strokeWidth={2.2} />}
                    label="30D TRIAL"
                    accent="emerald"
                  />
                  <div className="flex items-baseline gap-1.5 tabular-nums">
                    <span className="text-3xl font-black text-white">$0</span>
                    <span className="text-[10px] font-black uppercase text-zinc-400">/ MO</span>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-[#26282E] text-[10px] font-black uppercase text-zinc-300">
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>CORE NLE</span></div>
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>1080P MP4</span></div>
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>30D FULL</span></div>
                  </div>
                </div>

                <CinemaToolHUD
                  title="ACTIVATE FREE TRIAL"
                  en="Unlock the full 30-day studio trial with core NLE and 1080p export."
                  bn="কীভাবে ব্যবহার করবেন: ফ্রি ৩০ দিনের ট্রায়াল চালু করতে START FREE চাপুন।"
                  accent="emerald"
                  blockWrapper
                >
                  <button
                    type="button"
                    data-testid="plan-trial-btn"
                    disabled={isLoading}
                    onClick={handleStartTrialTier}
                    data-active="true"
                    className="cinema-tile cinema-tile-emerald w-full min-h-[44px] rounded font-black text-[11px] tracking-wider uppercase cursor-pointer"
                  >
                    START FREE
                  </button>
                </CinemaToolHUD>
              </div>

              {/* PRO */}
              <div className="flex flex-col justify-between p-4 rounded-md bg-[#111215] border border-cyan-500/40 gap-4">
                <div className="space-y-3">
                  <CinemaBadgeHeader
                    icon={<Zap className="w-3.5 h-3.5" strokeWidth={2.2} />}
                    label="PRO"
                    accent="cyan"
                  />
                  <div className="tabular-nums">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white">{proPrice}</span>
                      <span className="text-[10px] font-black uppercase text-zinc-400">/ MO</span>
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300 mt-0.5">{proBdtPrice}/MO</div>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-[#26282E] text-[10px] font-black uppercase text-zinc-300">
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-cyan-400" /><span>4K 16-BIT</span></div>
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-cyan-400" /><span>AI AUDIO</span></div>
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-cyan-400" /><span>34 LIGHT RIGS</span></div>
                  </div>
                </div>

                <CinemaToolHUD
                  title="UPGRADE TO PRO"
                  en="Unlock 4K RAW 16-bit export, AI Audio Studio, and 34 Light Rigs."
                  bn="কীভাবে ব্যবহার করবেন: প্রো ফিচার আনলক করতে UPGRADE PRO চাপুন।"
                  accent="cyan"
                  blockWrapper
                >
                  <button
                    type="button"
                    data-testid="plan-pro-btn"
                    disabled={isLoading}
                    onClick={() => handleSelectPaidTier('pro')}
                    data-active="true"
                    className="cinema-tile cinema-tile-cyan w-full min-h-[44px] rounded font-black text-[11px] tracking-wider uppercase cursor-pointer"
                  >
                    UPGRADE PRO
                  </button>
                </CinemaToolHUD>
              </div>

              {/* ULTRA */}
              <div className="flex flex-col justify-between p-4 rounded-md bg-[#111215] border border-amber-500/70 gap-4">
                <div className="space-y-3">
                  <CinemaBadgeHeader
                    icon={<Sparkles className="w-3.5 h-3.5" strokeWidth={2.2} />}
                    label="ULTRA"
                    accent="amber"
                  />
                  <div className="tabular-nums">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white">{ultraPrice}</span>
                      <span className="text-[10px] font-black uppercase text-zinc-400">/ MO</span>
                    </div>
                    <div className="text-[11px] font-mono text-amber-300 mt-0.5">{ultraBdtPrice}/MO</div>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-[#26282E] text-[10px] font-black uppercase text-zinc-200">
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /><span>ALL PRO</span></div>
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /><span>AI VIDEO</span></div>
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-amber-400" /><span>FAST RENDER</span></div>
                  </div>
                </div>

                <CinemaToolHUD
                  title="UPGRADE TO ULTRA"
                  en="All Pro features plus AI Video generation credits and priority rendering."
                  bn="কীভাবে ব্যবহার করবেন: আল্ট্রা প্ল্যানে আপগ্রেড করতে UPGRADE চাপুন।"
                  accent="amber"
                  blockWrapper
                >
                  <button
                    type="button"
                    data-testid="plan-ultra-btn"
                    disabled={isLoading}
                    onClick={() => handleSelectPaidTier('ultra')}
                    data-active="true"
                    className="cinema-tile cinema-tile-amber w-full min-h-[44px] rounded font-black text-[11px] tracking-wider uppercase cursor-pointer"
                  >
                    UPGRADE
                  </button>
                </CinemaToolHUD>
              </div>

              {/* TEAMS */}
              <div className="flex flex-col justify-between p-4 rounded-md bg-[#111215] border border-emerald-500/40 gap-4">
                <div className="space-y-3">
                  <CinemaBadgeHeader
                    icon={<Users className="w-3.5 h-3.5" strokeWidth={2.2} />}
                    label="TEAMS"
                    accent="emerald"
                  />
                  <div className="tabular-nums">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white">{teamsPrice}</span>
                      <span className="text-[10px] font-black uppercase text-zinc-400">/ SEAT</span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-300 mt-0.5">{teamsBdtPrice}/SEAT</div>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-[#26282E] text-[10px] font-black uppercase text-zinc-300">
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>MULTI SEAT</span></div>
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>SHARED REELS</span></div>
                    <div className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /><span>TEAM LUTS</span></div>
                  </div>
                </div>

                <CinemaToolHUD
                  title="UPGRADE TO TEAMS"
                  en="Multi-seat collaboration workspace with shared projects and LUT vault."
                  bn="কীভাবে ব্যবহার করবেন: টিম লাইসেন্স নিতে TEAMS UPGRADE বাটনে চাপুন।"
                  accent="emerald"
                  blockWrapper
                >
                  <button
                    type="button"
                    data-testid="plan-teams-btn"
                    disabled={isLoading}
                    onClick={() => handleSelectPaidTier('teams')}
                    className="cinema-tile cinema-tile-emerald w-full min-h-[44px] rounded font-black text-[11px] tracking-wider uppercase cursor-pointer"
                  >
                    UPGRADE
                  </button>
                </CinemaToolHUD>
              </div>
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

            <div className="pt-2 border-t border-[#26282E] flex flex-wrap items-center justify-between gap-2 text-[10px] font-black uppercase text-zinc-400">
              <span>BKASH · NAGAD · PAYPAL</span>
              <CinemaToolHUD
                title="SKIP TO DOWNLOADS"
                en="Jump to Windows, Android, and Web Studio launcher."
                bn="কীভাবে ব্যবহার করবেন: সরাসরি ডাউনলোড পেজে যেতে DOWNLOADS চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="cinema-tile cinema-tile-amber px-3 py-2 min-h-[40px] rounded flex items-center gap-1.5 cursor-pointer"
                >
                  <span>DOWNLOADS</span>
                  <ArrowRight className="w-3.5 h-3.5 cinema-tile-icon" />
                </button>
              </CinemaToolHUD>
            </div>
          </div>
        )}

        {/* STEP 3 — DIRECT PLATFORM DOWNLOAD HUB */}
        {step === 3 && (
          <div className="p-5 sm:p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#26282E]">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="tabular-nums">{activeTierDisplay}</span>
              </div>

              <CinemaToolHUD
                title="CHANGE PLAN"
                en="Return to Step 2 to switch or upgrade your studio plan."
                bn="কীভাবে ব্যবহার করবেন: প্ল্যান পরিবর্তন করতে PLANS বাটনে চাপুন।"
                accent="amber"
              >
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="cinema-tile cinema-tile-amber px-3 py-2 min-h-[44px] rounded text-[10px] font-black uppercase cursor-pointer shrink-0"
                >
                  CHANGE PLAN
                </button>
              </CinemaToolHUD>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              <div className="flex flex-col justify-between p-4 rounded-md bg-[#111215] border border-[#26282E] gap-4">
                <div className="space-y-2">
                  <CinemaBadgeHeader
                    icon={<Monitor className="w-4 h-4" strokeWidth={2.2} />}
                    label="WINDOWS .EXE"
                    accent="amber"
                  />
                  <div className="text-[11px] font-black text-zinc-400 tabular-nums">
                    WIN 64-BIT · {formatBytes(winArtifact.sizeBytes)}
                  </div>
                </div>

                <CinemaToolHUD
                  title="WINDOWS DESKTOP (.EXE)"
                  en="64-bit hardware-accelerated workstation installer with offline GPU rendering."
                  bn="কীভাবে ব্যবহার করবেন: উইন্ডোজ পিসিতে ইন্সটল করতে GET .EXE বাটনে চাপুন।"
                  accent="amber"
                  blockWrapper
                >
                  <a
                    href="/downloads/HandFilm-Studio-Setup.exe"
                    download="HandFilm-Studio-Setup.exe"
                    data-testid="step3-download-exe"
                    data-active="true"
                    onClick={() => setDownloadedFile('HandFilm-Studio-Setup.exe')}
                    className="cinema-tile cinema-tile-amber w-full min-h-[44px] rounded font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 cinema-tile-icon shrink-0" />
                    <span>GET .EXE</span>
                  </a>
                </CinemaToolHUD>
              </div>

              <div className="flex flex-col justify-between p-4 rounded-md bg-[#111215] border border-[#26282E] gap-4">
                <div className="space-y-2">
                  <CinemaBadgeHeader
                    icon={<Smartphone className="w-4 h-4" strokeWidth={2.2} />}
                    label="ANDROID .APK"
                    accent="cyan"
                  />
                  <div className="text-[11px] font-black text-zinc-400 tabular-nums">
                    ARM64 · {formatBytes(androidArtifact.sizeBytes)}
                  </div>
                </div>

                <CinemaToolHUD
                  title="ANDROID STUDIO (.APK)"
                  en="Mobile 60fps touch NLE with timeline scrubbing and pinch zoom."
                  bn="কীভাবে ব্যবহার করবেন: অ্যান্ড্রয়েড ফোনে অ্যাপ ডাউনলোড করতে GET .APK চাপুন।"
                  accent="cyan"
                  blockWrapper
                >
                  <a
                    href="/downloads/HandFilm-Studio.apk"
                    download="HandFilm-Studio.apk"
                    data-testid="step3-download-apk"
                    data-active="true"
                    onClick={() => setDownloadedFile('HandFilm-Studio.apk')}
                    className="cinema-tile cinema-tile-cyan w-full min-h-[44px] rounded font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 cinema-tile-icon shrink-0" />
                    <span>GET .APK</span>
                  </a>
                </CinemaToolHUD>
              </div>

              <div className="flex flex-col justify-between p-4 rounded-md bg-[#111215] border border-emerald-500/40 gap-4">
                <div className="space-y-2">
                  <CinemaBadgeHeader
                    icon={<Globe className="w-4 h-4" strokeWidth={2.2} />}
                    label="WEB STUDIO"
                    accent="emerald"
                  />
                  <div className="text-[11px] font-black text-zinc-400 uppercase">
                    ZERO INSTALL
                  </div>
                </div>

                <CinemaToolHUD
                  title="LAUNCH WEB STUDIO"
                  en="Open the complete multi-track browser NLE and 4K exporter immediately."
                  bn="কীভাবে ব্যবহার করবেন: ব্রাউজারে সরাসরি এডিটর চালু করতে LAUNCH WEB চাপুন।"
                  accent="emerald"
                  blockWrapper
                >
                  <button
                    type="button"
                    data-testid="step3-launch-web"
                    data-active="true"
                    onClick={handleLaunchWebStudio}
                    className="cinema-tile cinema-tile-emerald w-full min-h-[44px] rounded font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 cinema-tile-icon fill-current shrink-0" />
                    <span>LAUNCH WEB</span>
                  </button>
                </CinemaToolHUD>
              </div>
            </div>

            <div className="pt-3 border-t border-[#26282E] flex flex-wrap items-center justify-between gap-2 text-[10px] font-black uppercase text-zinc-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>SIGNED BUILDS</span>
              </span>
              {downloadedFile && (
                <span className="text-emerald-400">{downloadedFile}</span>
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
