/**
 * @file /src/services/licenseService.ts
 * @description Commercial SaaS Authentication, Persistent Device Fingerprint Binding (2-Device Limit),
 * Server-Timestamped 30-Day Free Trial, Pro Feature Gate, & Billing Checkout Store.
 */

import { create } from 'zustand';
import { getSupabaseClient, hasSupabaseConfig } from './supabaseClient';

export type LicenseTier = 'trial' | 'pro' | 'free' | 'unauthenticated';
export type SubscriptionPlan = 'monthly' | 'annual';
export type PaymentProvider = 'stripe' | 'lemonsqueezy' | 'sslcommerz';

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

interface LicenseStoreState {
  license: SignedLicenseResponse | null;
  sessionToken: string;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  isPaywallModalOpen: boolean;
  isDownloadModalOpen: boolean;
  paywallFeatureName: string;
  deviceLimitConflict: DeviceLimitConflict | null;
  error: string | null;

  openAuthModal: (featureContext?: string) => void;
  closeAuthModal: () => void;
  openPaywallModal: (featureName?: string) => void;
  closePaywallModal: () => void;
  openDownloadModal: () => void;
  closeDownloadModal: () => void;
  clearError: () => void;

  syncLicenseStatus: () => Promise<SignedLicenseResponse | null>;
  registerTrial: (params: { email: string; password: string; name?: string }) => Promise<boolean>;
  loginWithPassword: (params: { email: string; password: string }) => Promise<boolean>;
  signInWithGoogle: (fallbackProfile?: { email: string; name?: string }) => Promise<boolean>;
  revokeDevice: (targetDeviceId: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  checkoutPro: (params: { plan: SubscriptionPlan; provider: PaymentProvider }) => Promise<{
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
  isAuthModalOpen: false,
  isPaywallModalOpen: false,
  isDownloadModalOpen: false,
  paywallFeatureName: 'Pro Studio Feature',
  deviceLimitConflict: null,
  error: null,

  openAuthModal: (featureContext) =>
    set({
      isAuthModalOpen: true,
      error: null,
      ...(featureContext ? { paywallFeatureName: featureContext } : {})
    }),
  closeAuthModal: () => set({ isAuthModalOpen: false, deviceLimitConflict: null, error: null }),
  openPaywallModal: (featureName) =>
    set({
      isPaywallModalOpen: true,
      paywallFeatureName: featureName || 'Pro Studio Feature',
      error: null
    }),
  closePaywallModal: () => set({ isPaywallModalOpen: false, error: null }),
  openDownloadModal: () => set({ isDownloadModalOpen: true }),
  closeDownloadModal: () => set({ isDownloadModalOpen: false }),
  clearError: () => set({ error: null }),

  syncLicenseStatus: async () => {
    const { deviceId } = getOrCreateDeviceFingerprint();
    try {
      // If Supabase OAuth session exists, bridge it automatically on load
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
      const sb = getSupabaseClient();
      if (sb) {
        await sb.auth.signUp({ email, password }).catch(() => null);
      }
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
        body: JSON.stringify({ email, password, name, deviceId, deviceLabel, platform })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        set({ isLoading: false, error: data?.error || 'Could not start 30-day free trial.' });
        return false;
      }
      writeStoredToken(data.sessionToken);
      set({
        isLoading: false,
        sessionToken: data.sessionToken,
        license: data.license,
        isAuthModalOpen: false,
        deviceLimitConflict: null,
        error: null
      });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Network error activating trial.' });
      return false;
    }
  },

  loginWithPassword: async ({ email, password }) => {
    set({ isLoading: true, error: null, deviceLimitConflict: null });
    const { deviceId, deviceLabel, platform } = getOrCreateDeviceFingerprint();
    try {
      const sb = getSupabaseClient();
      if (sb) {
        await sb.auth.signInWithPassword({ email, password }).catch(() => null);
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId },
        body: JSON.stringify({ email, password, deviceId, deviceLabel, platform })
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
        isAuthModalOpen: false,
        deviceLimitConflict: null,
        error: null
      });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Network error during sign in.' });
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
        isAuthModalOpen: false,
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

      // Retry pending sign-in immediately if triggered from device-limit dialog
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
      set({ sessionToken: '' });
      await get().syncLicenseStatus();
    }
  },

  checkoutPro: async ({ plan, provider }) => {
    const lic = get().license;
    if (!lic?.authenticated || !get().sessionToken) {
      set({ isPaywallModalOpen: false, isAuthModalOpen: true });
      return { ok: false, message: 'Sign in first to upgrade your account.' };
    }

    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: getLicenseAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ plan, provider })
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

      if (data.license) {
        set({
          isLoading: false,
          license: data.license,
          isPaywallModalOpen: false,
          error: null
        });
      } else {
        set({ isLoading: false, isPaywallModalOpen: false });
        await get().syncLicenseStatus();
      }
      return { ok: true, message: 'PRO STUDIO subscription activated.' };
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
        isAuthModalOpen: true,
        error: null
      });
      return false;
    }
    set({
      paywallFeatureName: featureName,
      isPaywallModalOpen: true,
      error: null
    });
    return false;
  },

  handleApiLicenseError: (status, payload, featureName) => {
    const code = payload?.code;
    if (status === 401 && code === 'AUTH_REQUIRED') {
      set({
        isAuthModalOpen: true,
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
        isPaywallModalOpen: true,
        paywallFeatureName: featureName || 'Pro Studio AI Engine',
        error: payload?.error || 'Upgrade to PRO STUDIO to continue.'
      });
      return true;
    }
    return false;
  }
}));
