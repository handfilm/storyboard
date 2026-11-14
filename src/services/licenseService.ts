/**
 * @file /src/services/licenseService.ts
 * @description Commercial SaaS Authentication, Persistent Device Fingerprint Binding (2-Device Limit),
 * Server-Timestamped 30-Day Free Trial, Pro Feature Gate, & Billing Checkout Store.
 */

import { create } from 'zustand';
import { getSupabaseClient, hasSupabaseConfig } from './supabaseClient';

export type LicenseTier = 'trial' | 'pro' | 'free' | 'unauthenticated';
export type ProTierName = 'pro' | 'ultra' | 'teams';
export type SubscriptionPlan = 'monthly' | 'annual';
export type PaymentCurrency = 'USD' | 'BDT';
export type PaymentProvider =
  | 'paypal'
  | 'bkash'
  | 'nagad'
  | 'manual'
  | 'stripe'
  | 'lemonsqueezy'
  | 'sslcommerz';
export type OnboardingStep = 1 | 2 | 3;

export interface PaymentTransactionRecord {
  id: string;
  userId: string;
  email: string;
  provider: PaymentProvider;
  transactionId: string;
  plan: SubscriptionPlan;
  proTier: ProTierName;
  amount: number;
  currency: PaymentCurrency;
  status: 'completed' | 'pending' | 'failed';
  createdAt: number;
}

export interface PaymentGatewayConfig {
  gateways: {
    bkash: { configured: boolean };
    nagad: { configured: boolean; merchantNumber?: string };
    paypal: { configured: boolean; clientId?: string };
    manual: { configured: boolean; bkashNumber: string; nagadNumber: string };
  };
}

export const CLIENT_PRICING_MATRIX: Record<
  ProTierName,
  {
    monthlyUSD: number;
    annualUSD: number;
    annualPerMonthUSD: number;
    monthlyBDT: number;
    annualBDT: number;
    annualPerMonthBDT: number;
    label: string;
  }
> = {
  pro: {
    monthlyUSD: 19.99,
    annualUSD: 191,
    annualPerMonthUSD: 15.99,
    monthlyBDT: 1490,
    annualBDT: 14300,
    annualPerMonthBDT: 1192,
    label: 'PRO'
  },
  ultra: {
    monthlyUSD: 39.99,
    annualUSD: 383,
    annualPerMonthUSD: 31.99,
    monthlyBDT: 2990,
    annualBDT: 28700,
    annualPerMonthBDT: 2392,
    label: 'ULTRA'
  },
  teams: {
    monthlyUSD: 14.99,
    annualUSD: 143,
    annualPerMonthUSD: 11.99,
    monthlyBDT: 1190,
    annualBDT: 11400,
    annualPerMonthBDT: 950,
    label: 'TEAMS'
  }
};

export interface ActiveDeviceRecord {
  deviceId: string;
  label: string;
  platform: string;
  lastSeenAt: number;
  createdAt: number;
}

export interface SignedLicenseResponse {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  tier: LicenseTier;
  trialStartedAt: number | null;
  trialEndsAt: number | null;
  proPlan: SubscriptionPlan | null;
  proTier: ProTierName | null;
  proExpiresAt: number | null;
  daysRemaining: number;
  maxDevices: number;
  activeDevices: ActiveDeviceRecord[];
  deviceId: string;
  serverNow: number;
  signedAt: number;
  signature: string;
}

export interface DeviceLimitConflict {
  code: 'DEVICE_LIMIT_REACHED';
  error: string;
  maxDevices: number;
  activeDevices: ActiveDeviceRecord[];
  pendingEmail?: string;
  pendingPassword?: string;
  pendingOAuth?: boolean;
}

const SESSION_TOKEN_KEY = 'handfilm_session_token_v1';
const DEVICE_ID_KEY = 'handfilm_device_id_v1';

function detectPlatform(): { platform: 'windows' | 'android' | 'macos' | 'linux' | 'web'; label: string } {
  if (typeof navigator === 'undefined') {
    return { platform: 'web', label: 'Web NLE Browser' };
  }
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) {
    return { platform: 'android', label: 'Android Studio Mobile' };
  }
  if (/Windows/i.test(ua)) {
    return { platform: 'windows', label: 'Windows Desktop Studio' };
  }
  if (/Macintosh|Mac OS/i.test(ua)) {
    return { platform: 'macos', label: 'macOS Studio' };
  }
  if (/Linux/i.test(ua)) {
    return { platform: 'linux', label: 'Linux Workstation' };
  }
  return { platform: 'web', label: 'Web NLE Browser' };
}

function stableHash32(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(6, '0');
}

export function getOrCreateDeviceFingerprint(): {
  deviceId: string;
  deviceLabel: string;
  platform: string;
} {
  const { platform, label } = detectPlatform();
  if (typeof window === 'undefined') {
    return { deviceId: 'ssr_workstation', deviceLabel: label, platform };
  }

  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length >= 10) {
      return { deviceId: existing, deviceLabel: label, platform };
    }
  } catch {
    // Ignore storage access failure
  }

  const hwSignal = [
    navigator.userAgent || '',
    navigator.language || '',
    String(navigator.hardwareConcurrency || 0),
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '0x0'
  ].join('|');

  const entropy =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 16);

  const generated = `hf_${platform.slice(0, 3)}_${stableHash32(hwSignal)}_${entropy}`;
  try {
    window.localStorage.setItem(DEVICE_ID_KEY, generated);
  } catch {
    // Ignore storage access failure
  }
  return { deviceId: generated, deviceLabel: label, platform };
}

function readStoredToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(SESSION_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function writeStoredToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage access failure
  }
}

export function getLicenseAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const { deviceId } = getOrCreateDeviceFingerprint();
  const token = useLicenseStore.getState().sessionToken || readStoredToken();
  const headers: Record<string, string> = {
    ...(extra || {}),
    'x-device-id': deviceId
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function syncSupabaseProfilePlan(plan: 'trial' | 'pro' | 'ultra' | 'teams', extra?: { trialStartedAt?: number | null; trialEndsAt?: number | null }) {
  try {
    const sb = getSupabaseClient();
    if (!sb) return;
    const { data } = await sb.auth.getUser();
    const user = data?.user;
    if (!user?.id) return;
    await sb
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email,
          plan,
          ...(extra?.trialStartedAt ? { trial_started_at: new Date(extra.trialStartedAt).toISOString() } : {}),
          ...(extra?.trialEndsAt ? { trial_ends_at: new Date(extra.trialEndsAt).toISOString() } : {}),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );
  } catch {
    // Supabase profiles table may not be provisioned yet; server license store remains authoritative
  }
}

async function syncSupabasePaymentTransaction(tx?: PaymentTransactionRecord | null) {
  if (!tx) return;
  try {
    const sb = getSupabaseClient();
    if (!sb) return;
    const { data } = await sb.auth.getUser();
    const user = data?.user;
    if (!user?.id) return;
    await sb.from('payment_transactions').upsert(
      {
        id: tx.id,
        user_id: user.id,
        email: user.email || tx.email,
        provider: tx.provider,
        transaction_id: tx.transactionId,
        plan: tx.proTier,
        billing_cycle: tx.plan,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  } catch {
    // Best-effort client replication
  }
}

interface LicenseStoreState {
  license: SignedLicenseResponse | null;
  sessionToken: string;
  isLoading: boolean;
  isOnboardingModalOpen: boolean;
  onboardingStep: OnboardingStep;
  selectedPlanLabel: string | null;
  isAuthModalOpen: boolean;
  isPaywallModalOpen: boolean;
  isDownloadModalOpen: boolean;
  paywallFeatureName: string;
  deviceLimitConflict: DeviceLimitConflict | null;
  error: string | null;
  magicLinkSentTo: string | null;
  paymentBannerMessage: string | null;

  openOnboardingFlow: (preferredStep?: OnboardingStep, featureContext?: string) => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  closeOnboardingFlow: () => void;
  openAuthModal: (featureContext?: string) => void;
  closeAuthModal: () => void;
  openPaywallModal: (featureName?: string) => void;
  closePaywallModal: () => void;
  openDownloadModal: () => void;
  closeDownloadModal: () => void;
  clearError: () => void;
  clearPaymentBanner: () => void;

  syncLicenseStatus: () => Promise<SignedLicenseResponse | null>;
  fetchPaymentGatewayConfig: () => Promise<PaymentGatewayConfig | null>;
  processPaymentCallbackFromUrl: () => Promise<void>;
  registerTrial: (params: { email: string; password: string; name?: string }) => Promise<boolean>;
  loginWithPassword: (params: { email: string; password: string }) => Promise<boolean>;
  sendMagicLink: (email: string) => Promise<boolean>;
  signInWithGoogle: (fallbackProfile?: { email: string; name?: string }) => Promise<boolean>;
  revokeDevice: (targetDeviceId: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  activateTrialPlan: () => Promise<{ ok: boolean; error?: string }>;
  startBkashCheckout: (params: { plan: SubscriptionPlan; planTier: ProTierName }) => Promise<{
    ok: boolean;
    checkoutUrl?: string;
    code?: string;
    message?: string;
  }>;
  startNagadCheckout: (params: { plan: SubscriptionPlan; planTier: ProTierName }) => Promise<{
    ok: boolean;
    checkoutUrl?: string;
    code?: string;
    message?: string;
  }>;
  createPaypalOrder: (params: { plan: SubscriptionPlan; planTier: ProTierName }) => Promise<{
    ok: boolean;
    orderId?: string;
    approveUrl?: string;
    code?: string;
    message?: string;
  }>;
  capturePaypalOrder: (params: { orderId: string; plan: SubscriptionPlan; planTier: ProTierName }) => Promise<{
    ok: boolean;
    message?: string;
  }>;
  verifyManualTrxId: (params: {
    trxId: string;
    method: 'bkash' | 'nagad';
    plan: SubscriptionPlan;
    planTier: ProTierName;
    currency?: PaymentCurrency;
    senderNumber?: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  checkoutPro: (params: {
    plan: SubscriptionPlan;
    planTier?: ProTierName;
    provider: PaymentProvider;
  }) => Promise<{
    ok: boolean;
    checkoutUrl?: string;
    message?: string;
  }>;
  hasActiveProOrTrial: () => boolean;
  requireProAccess: (featureName: string) => boolean;
  handleApiLicenseError: (status: number, payload: any, featureName?: string) => boolean;
}

export const useLicenseStore = create<LicenseStoreState>((set, get) => ({
  license: null,
  sessionToken: readStoredToken(),
  isLoading: false,
  isOnboardingModalOpen: false,
  onboardingStep: 1,
  selectedPlanLabel: null,
  isAuthModalOpen: false,
  isPaywallModalOpen: false,
  isDownloadModalOpen: false,
  paywallFeatureName: 'Pro Studio Feature',
  deviceLimitConflict: null,
  error: null,
  magicLinkSentTo: null,
  paymentBannerMessage: null,

  clearPaymentBanner: () => set({ paymentBannerMessage: null }),

  openOnboardingFlow: (preferredStep, featureContext) => {
    const lic = get().license;
    const isSignedIn = Boolean(lic?.authenticated && get().sessionToken);
    const resolvedStep: OnboardingStep =
      preferredStep || (isSignedIn ? 2 : 1);
    set({
      isOnboardingModalOpen: true,
      onboardingStep: resolvedStep,
      error: null,
      magicLinkSentTo: null,
      ...(featureContext ? { paywallFeatureName: featureContext } : {})
    });

    // Double-check live Supabase session asynchronously if state isn't authenticated yet
    if (!isSignedIn) {
      void get().syncLicenseStatus().then((synced) => {
        if (synced?.authenticated && get().isOnboardingModalOpen && get().onboardingStep === 1) {
          set({ onboardingStep: 2 });
        }
      });
    }
  },
  setOnboardingStep: (step) => set({ onboardingStep: step, error: null }),
  closeOnboardingFlow: () =>
    set({
      isOnboardingModalOpen: false,
      isAuthModalOpen: false,
      isPaywallModalOpen: false,
      isDownloadModalOpen: false,
      deviceLimitConflict: null,
      error: null
    }),

  openAuthModal: (featureContext) => {
    const isSignedIn = Boolean(get().license?.authenticated && get().sessionToken);
    set({
      isOnboardingModalOpen: true,
      onboardingStep: isSignedIn ? 2 : 1,
      error: null,
      ...(featureContext ? { paywallFeatureName: featureContext } : {})
    });
  },
  closeAuthModal: () => set({ isOnboardingModalOpen: false, isAuthModalOpen: false, deviceLimitConflict: null, error: null }),
  openPaywallModal: (featureName) => {
    const isSignedIn = Boolean(get().license?.authenticated && get().sessionToken);
    set({
      isOnboardingModalOpen: true,
      onboardingStep: isSignedIn ? 2 : 1,
      paywallFeatureName: featureName || 'Pro Studio Feature',
      error: null
    });
  },
  closePaywallModal: () => set({ isOnboardingModalOpen: false, isPaywallModalOpen: false, error: null }),
  openDownloadModal: () => {
    const isSignedIn = Boolean(get().license?.authenticated && get().sessionToken);
    set({
      isOnboardingModalOpen: true,
      onboardingStep: isSignedIn ? 3 : 1,
      error: null
    });
  },
  closeDownloadModal: () => set({ isOnboardingModalOpen: false, isDownloadModalOpen: false }),
  clearError: () => set({ error: null }),

  syncLicenseStatus: async () => {
    const { deviceId } = getOrCreateDeviceFingerprint();
    try {
      // If Supabase OAuth/Magic-Link session exists, bridge it automatically on load
      const sb = getSupabaseClient();
      if (sb && !get().sessionToken) {
        const { data } = await sb.auth.getSession();
        const sbSession = data?.session;
        if (sbSession?.access_token && sbSession.user?.email) {
          const { deviceLabel, platform } = getOrCreateDeviceFingerprint();
          const bridgeRes = await fetch('/api/auth/oauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
            body: JSON.stringify({
              email: sbSession.user.email,
              name: sbSession.user.user_metadata?.full_name || sbSession.user.email.split('@')[0],
              supabaseAccessToken: sbSession.access_token,
              supabaseUserId: sbSession.user.id,
              deviceId,
              deviceLabel,
              platform
            })
          });
          const bridgeJson = await bridgeRes.json().catch(() => null);
          if (bridgeRes.ok && bridgeJson?.sessionToken && bridgeJson?.license) {
            writeStoredToken(bridgeJson.sessionToken);
            set({ sessionToken: bridgeJson.sessionToken, license: bridgeJson.license });
            return bridgeJson.license;
          }
        }
      }

      const res = await fetch(`/api/license/status?deviceId=${encodeURIComponent(deviceId)}`, {
        headers: getLicenseAuthHeaders()
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.license) {
        const lic = json.license as SignedLicenseResponse;
        if (!lic.authenticated && get().sessionToken) {
          writeStoredToken('');
          set({ sessionToken: '', license: lic });
        } else {
          set({ license: lic });
        }
        return lic;
      }
      return null;
    } catch {
      return null;
    }
  },

  registerTrial: async ({ email, password, name }) => {
    set({ isLoading: true, error: null, deviceLimitConflict: null });
    const { deviceId, deviceLabel, platform } = getOrCreateDeviceFingerprint();
    try {
      let supabaseUserId: string | undefined;
      const sb = getSupabaseClient();
      if (sb) {
        const sbRes = await sb.auth.signUp({ email, password }).catch(() => null);
        supabaseUserId = sbRes?.data?.user?.id || undefined;
      }
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
        body: JSON.stringify({ email, password, name, deviceId, deviceLabel, platform, supabaseUserId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        set({ isLoading: false, error: data?.error || 'Could not create account.' });
        return false;
      }
      writeStoredToken(data.sessionToken);
      void syncSupabaseProfilePlan('trial', {
        trialStartedAt: data.license?.trialStartedAt,
        trialEndsAt: data.license?.trialEndsAt
      });
      set({
        isLoading: false,
        sessionToken: data.sessionToken,
        license: data.license,
        onboardingStep: 2,
        deviceLimitConflict: null,
        error: null
      });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Network error creating account.' });
      return false;
    }
  },

  loginWithPassword: async ({ email, password }) => {
    set({ isLoading: true, error: null, deviceLimitConflict: null });
    const { deviceId, deviceLabel, platform } = getOrCreateDeviceFingerprint();
    try {
      let supabaseUserId: string | undefined;
      const sb = getSupabaseClient();
      if (sb) {
        const sbRes = await sb.auth.signInWithPassword({ email, password }).catch(() => null);
        supabaseUserId = sbRes?.data?.user?.id || undefined;
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
        body: JSON.stringify({ email, password, deviceId, deviceLabel, platform, supabaseUserId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data?.code === 'DEVICE_LIMIT_REACHED') {
        set({
          isLoading: false,
          error: data.error,
          deviceLimitConflict: {
            code: 'DEVICE_LIMIT_REACHED',
            error: data.error,
            maxDevices: data.maxDevices || 2,
            activeDevices: Array.isArray(data.activeDevices) ? data.activeDevices : [],
            pendingEmail: email,
            pendingPassword: password
          }
        });
        return false;
      }
      if (!res.ok || !data?.success) {
        set({ isLoading: false, error: data?.error || 'Sign in failed.' });
        return false;
      }
      writeStoredToken(data.sessionToken);
      set({
        isLoading: false,
        sessionToken: data.sessionToken,
        license: data.license,
        onboardingStep: 2,
        deviceLimitConflict: null,
        error: null
      });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Network error during sign in.' });
      return false;
    }
  },

  sendMagicLink: async (email) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      set({ error: 'Enter a valid email address for magic link sign-in.' });
      return false;
    }
    set({ isLoading: true, error: null, magicLinkSentTo: null });
    try {
      const sb = getSupabaseClient();
      if (sb && hasSupabaseConfig()) {
        const { error } = await sb.auth.signInWithOtp({
          email: cleanEmail,
          options: { emailRedirectTo: window.location.href }
        });
        if (error) {
          set({ isLoading: false, error: error.message });
          return false;
        }
        set({ isLoading: false, magicLinkSentTo: cleanEmail });
        return true;
      }
      // When Supabase env vars aren't bound yet, bridge directly as magic-link instant session
      const ok = await get().signInWithGoogle({ email: cleanEmail });
      if (ok) {
        set({ magicLinkSentTo: cleanEmail });
      }
      return ok;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Could not send magic link.' });
      return false;
    }
  },

  signInWithGoogle: async (fallbackProfile) => {
    set({ isLoading: true, error: null, deviceLimitConflict: null });
    const { deviceId, deviceLabel, platform } = getOrCreateDeviceFingerprint();
    try {
      const sb = getSupabaseClient();
      if (sb && hasSupabaseConfig() && !fallbackProfile?.email) {
        const { error } = await sb.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.href }
        });
        if (error) {
          set({ isLoading: false, error: error.message });
          return false;
        }
        return true;
      }

      const email = fallbackProfile?.email?.trim();
      if (!email) {
        set({
          isLoading: false,
          error: 'Enter your Google email or configure VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY for hosted OAuth.'
        });
        return false;
      }

      const res = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
        body: JSON.stringify({
          email,
          name: fallbackProfile?.name || email.split('@')[0],
          deviceId,
          deviceLabel,
          platform
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data?.code === 'DEVICE_LIMIT_REACHED') {
        set({
          isLoading: false,
          error: data.error,
          deviceLimitConflict: {
            code: 'DEVICE_LIMIT_REACHED',
            error: data.error,
            maxDevices: data.maxDevices || 2,
            activeDevices: Array.isArray(data.activeDevices) ? data.activeDevices : [],
            pendingEmail: email,
            pendingOAuth: true
          }
        });
        return false;
      }
      if (!res.ok || !data?.success) {
        set({ isLoading: false, error: data?.error || 'Google sign-in failed.' });
        return false;
      }
      writeStoredToken(data.sessionToken);
      set({
        isLoading: false,
        sessionToken: data.sessionToken,
        license: data.license,
        onboardingStep: 2,
        deviceLimitConflict: null,
        error: null
      });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Google sign-in error.' });
      return false;
    }
  },

  revokeDevice: async (targetDeviceId) => {
    const conflict = get().deviceLimitConflict;
    const { deviceId } = getOrCreateDeviceFingerprint();
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/license/devices/revoke', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          targetDeviceId,
          deviceId,
          email: conflict?.pendingEmail,
          password: conflict?.pendingPassword,
          allowOAuthSlotReset: Boolean(conflict?.pendingOAuth)
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        set({ isLoading: false, error: data?.error || 'Could not revoke device.' });
        return false;
      }

      if (conflict?.pendingEmail && conflict?.pendingPassword) {
        return await get().loginWithPassword({
          email: conflict.pendingEmail,
          password: conflict.pendingPassword
        });
      }
      if (conflict?.pendingEmail && conflict?.pendingOAuth) {
        return await get().signInWithGoogle({ email: conflict.pendingEmail });
      }

      if (data.license) {
        set({ isLoading: false, license: data.license, deviceLimitConflict: null });
      } else {
        set({ isLoading: false, deviceLimitConflict: null });
        await get().syncLicenseStatus();
      }
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to revoke device.' });
      return false;
    }
  },

  signOut: async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getLicenseAuthHeaders()
      }).catch(() => null);
      const sb = getSupabaseClient();
      if (sb) await sb.auth.signOut().catch(() => null);
    } finally {
      writeStoredToken('');
      set({ sessionToken: '', onboardingStep: 1, selectedPlanLabel: null });
      await get().syncLicenseStatus();
    }
  },

  activateTrialPlan: async () => {
    const lic = get().license;
    if (!lic?.authenticated || !get().sessionToken) {
      set({ onboardingStep: 1, error: 'Sign in first to start your 30-day studio trial.' });
      return { ok: false, error: 'Sign in first.' };
    }
    set({ isLoading: true, error: null });
    try {
      let supabaseUserId: string | undefined;
      const sb = getSupabaseClient();
      if (sb) {
        const sbUser = await sb.auth.getUser().catch(() => null);
        supabaseUserId = sbUser?.data?.user?.id || undefined;
      }
      const res = await fetch('/api/billing/activate-trial', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ supabaseUserId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        set({
          isLoading: false,
          error: data?.error || 'Could not activate 30-day trial.',
          ...(data?.license ? { license: data.license } : {})
        });
        return { ok: false, error: data?.error };
      }
      const nextLicense = data.license as SignedLicenseResponse;
      await syncSupabaseProfilePlan('trial', {
        trialStartedAt: nextLicense.trialStartedAt,
        trialEndsAt: nextLicense.trialEndsAt
      });
      set({
        isLoading: false,
        license: nextLicense,
        selectedPlanLabel: '30-DAY PRO TRIAL',
        onboardingStep: 3,
        error: null
      });
      return { ok: true };
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Could not activate trial.' });
      return { ok: false, error: err?.message };
    }
  },

  fetchPaymentGatewayConfig: async () => {
    try {
      const res = await fetch('/api/payments/config');
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) return null;
      return { gateways: data.gateways };
    } catch {
      return null;
    }
  },

  processPaymentCallbackFromUrl: async () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paymentFlag = params.get('payment');
    if (!paymentFlag) return;

    const cleanUrl = window.location.pathname + window.location.hash;

    if (paymentFlag === 'paypal_return') {
      const tokenOrderId = params.get('token') || '';
      const tier = (params.get('tier') as ProTierName) || 'pro';
      const plan = (params.get('plan') as SubscriptionPlan) || 'monthly';
      if (tokenOrderId) {
        const cap = await get().capturePaypalOrder({ orderId: tokenOrderId, plan, planTier: tier });
        set({
          paymentBannerMessage: cap.ok
            ? `PayPal payment captured — ${tier.toUpperCase()} STUDIO active.`
            : cap.message || 'PayPal capture incomplete.'
        });
      }
      window.history.replaceState({}, '', cleanUrl);
      return;
    }

    if (paymentFlag === 'success') {
      const provider = (params.get('provider') || '').toUpperCase();
      const rawTier = (params.get('tier') || 'pro').toLowerCase();
      const tierKey: ProTierName =
        rawTier === 'ultra' || rawTier === 'teams' ? rawTier : 'pro';
      const tier = tierKey.toUpperCase();
      const synced = await get().syncLicenseStatus();
      await syncSupabaseProfilePlan(tierKey, { trialEndsAt: synced?.proExpiresAt });
      set({
        isOnboardingModalOpen: true,
        onboardingStep: 3,
        selectedPlanLabel: `${tier} STUDIO`,
        paymentBannerMessage: `${provider || 'Gateway'} payment verified — ${tier} STUDIO unlocked.`
      });
      window.history.replaceState({}, '', cleanUrl);
      return;
    }

    if (paymentFlag === 'failed') {
      const reason = params.get('reason') || 'cancelled';
      set({
        isOnboardingModalOpen: true,
        onboardingStep: 2,
        error: `Payment was not completed (${reason}). You can retry or use Manual TrxID verification.`
      });
      window.history.replaceState({}, '', cleanUrl);
    }
  },

  startBkashCheckout: async ({ plan, planTier }) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/payments/bkash/create', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ plan, planTier })
      });
      const data = await res.json().catch(() => ({}));
      set({ isLoading: false });
      if (!res.ok || !data?.success) {
        return {
          ok: false,
          code: data?.code,
          message: data?.error || 'Could not start bKash checkout.'
        };
      }
      return { ok: true, checkoutUrl: data.checkoutUrl };
    } catch (err: any) {
      set({ isLoading: false });
      return { ok: false, message: err?.message || 'bKash request failed.' };
    }
  },

  startNagadCheckout: async ({ plan, planTier }) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/payments/nagad/create', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ plan, planTier })
      });
      const data = await res.json().catch(() => ({}));
      set({ isLoading: false });
      if (!res.ok || !data?.success) {
        return {
          ok: false,
          code: data?.code,
          message: data?.error || 'Could not start Nagad checkout.'
        };
      }
      return { ok: true, checkoutUrl: data.checkoutUrl };
    } catch (err: any) {
      set({ isLoading: false });
      return { ok: false, message: err?.message || 'Nagad request failed.' };
    }
  },

  createPaypalOrder: async ({ plan, planTier }) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ plan, planTier })
      });
      const data = await res.json().catch(() => ({}));
      set({ isLoading: false });
      if (!res.ok || !data?.success) {
        return {
          ok: false,
          code: data?.code,
          message: data?.error || 'Could not create PayPal order.'
        };
      }
      return { ok: true, orderId: data.orderId, approveUrl: data.approveUrl };
    } catch (err: any) {
      set({ isLoading: false });
      return { ok: false, message: err?.message || 'PayPal order request failed.' };
    }
  },

  capturePaypalOrder: async ({ orderId, plan, planTier }) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/payments/paypal/capture-order', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ orderId, plan, planTier })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        set({ isLoading: false, error: data?.error || 'PayPal capture failed.' });
        return { ok: false, message: data?.error };
      }
      await syncSupabaseProfilePlan(planTier, { trialEndsAt: data.license?.proExpiresAt });
      await syncSupabasePaymentTransaction(data.transaction);
      set({
        isLoading: false,
        license: data.license,
        selectedPlanLabel: `${planTier.toUpperCase()} STUDIO`,
        onboardingStep: 3,
        error: null
      });
      return { ok: true, message: `${planTier.toUpperCase()} STUDIO unlocked via PayPal.` };
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'PayPal capture failed.' });
      return { ok: false, message: err?.message };
    }
  },

  verifyManualTrxId: async ({ trxId, method, plan, planTier, currency = 'BDT', senderNumber }) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/payments/manual/verify', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ trxId, method, plan, planTier, currency, senderNumber })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        set({ isLoading: false, error: data?.error || 'TrxID verification failed.' });
        return { ok: false, message: data?.error };
      }
      await syncSupabaseProfilePlan(planTier, { trialEndsAt: data.license?.proExpiresAt });
      await syncSupabasePaymentTransaction(data.transaction);
      set({
        isLoading: false,
        license: data.license,
        selectedPlanLabel: `${planTier.toUpperCase()} STUDIO`,
        onboardingStep: 3,
        error: null
      });
      return {
        ok: true,
        message: `${method.toUpperCase()} TrxID ${data.transactionId} verified — ${planTier.toUpperCase()} unlocked!`
      };
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Manual verification error.' });
      return { ok: false, message: err?.message };
    }
  },

  checkoutPro: async ({ plan, planTier = 'pro', provider }) => {
    const lic = get().license;
    if (!lic?.authenticated || !get().sessionToken) {
      set({ onboardingStep: 1, isOnboardingModalOpen: true });
      return { ok: false, message: 'Sign in first to upgrade your account.' };
    }

    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ plan, planTier, provider })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        set({ isLoading: false, error: data?.error || 'Checkout request failed.' });
        return { ok: false, message: data?.error };
      }

      if (data.mode === 'external_checkout' && data.checkoutUrl) {
        set({ isLoading: false });
        return { ok: true, checkoutUrl: data.checkoutUrl };
      }

      await syncSupabaseProfilePlan(planTier);

      if (data.license) {
        set({
          isLoading: false,
          license: data.license,
          selectedPlanLabel: `${planTier.toUpperCase()} STUDIO`,
          onboardingStep: 3,
          error: null
        });
      } else {
        set({ isLoading: false, selectedPlanLabel: `${planTier.toUpperCase()} STUDIO`, onboardingStep: 3 });
        await get().syncLicenseStatus();
      }
      return { ok: true, message: `${planTier.toUpperCase()} STUDIO subscription activated.` };
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Checkout failed.' });
      return { ok: false, message: err?.message };
    }
  },

  hasActiveProOrTrial: () => {
    const lic = get().license;
    if (!lic?.authenticated) return false;
    return lic.tier === 'pro' || lic.tier === 'trial';
  },

  requireProAccess: (featureName) => {
    const lic = get().license;
    if (lic?.authenticated && (lic.tier === 'pro' || lic.tier === 'trial')) {
      return true;
    }
    if (!lic?.authenticated || !get().sessionToken) {
      set({
        paywallFeatureName: featureName,
        isOnboardingModalOpen: true,
        onboardingStep: 1,
        error: null
      });
      return false;
    }
    set({
      paywallFeatureName: featureName,
      isOnboardingModalOpen: true,
      onboardingStep: 2,
      error: null
    });
    return false;
  },

  handleApiLicenseError: (status, payload, featureName) => {
    const code = payload?.code;
    if (status === 401 && code === 'AUTH_REQUIRED') {
      set({
        isOnboardingModalOpen: true,
        onboardingStep: 1,
        paywallFeatureName: featureName || 'Pro Studio AI Engine',
        error: payload?.error || 'Sign in to activate your 30-day free trial.'
      });
      return true;
    }
    if (status === 402 || code === 'PRO_LICENSE_REQUIRED') {
      if (payload?.license) {
        set({ license: payload.license });
      }
      set({
        isOnboardingModalOpen: true,
        onboardingStep: 2,
        paywallFeatureName: featureName || 'Pro Studio AI Engine',
        error: payload?.error || 'Choose a plan to continue using Studio AI engines.'
      });
      return true;
    }
    return false;
  }
}));
