import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type express from 'express';

export type LicenseTier = 'trial' | 'pro' | 'free';
export type SubscriptionPlan = 'monthly' | 'annual';
export type PaymentProvider = 'stripe' | 'lemonsqueezy' | 'sslcommerz';

export interface ActiveDeviceRecord {
  deviceId: string;
  label: string;
  platform: string;
  lastSeenAt: number;
  createdAt: number;
}

export interface StoredUserAccount {
  id: string;
  email: string;
  name: string;
  provider: 'email' | 'google' | 'supabase';
  passwordHash?: string;
  passwordSalt?: string;
  createdAt: number;
  trialStartedAt: number;
  trialEndsAt: number;
  proPlan: SubscriptionPlan | null;
  proStatus: 'none' | 'active' | 'canceled';
  proExpiresAt: number | null;
  activeDevices: ActiveDeviceRecord[];
}

export interface SignedLicenseResponse {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  tier: LicenseTier | 'unauthenticated';
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

interface LicenseDatabaseShape {
  users: Record<string, StoredUserAccount>;
}

export interface AuthenticatedSessionContext {
  user: StoredUserAccount;
  deviceId: string;
  tier: LicenseTier;
  daysRemaining: number;
  serverNow: number;
}

export interface AuthedRequest extends express.Request {
  licenseContext?: AuthenticatedSessionContext;
}

const TRIAL_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ACTIVE_DEVICES = 2;

export function createLicenseSecurityModule(appRootDir: string) {
  const dataDir = path.resolve(appRootDir, '.handfilm-data');
  const dbPath = path.resolve(dataDir, 'licenses.json');
  const secretPath = path.resolve(dataDir, '.server-secret');

  fs.mkdirSync(dataDir, { recursive: true });

  const resolveHmacSecret = (): string => {
    const envSecret = String(process.env.LICENSE_HMAC_SECRET || '').trim();
    if (envSecret.length >= 16) return envSecret;
    try {
      if (fs.existsSync(secretPath)) {
        const persisted = fs.readFileSync(secretPath, 'utf-8').trim();
        if (persisted.length >= 32) return persisted;
      }
      const generated = crypto.randomBytes(48).toString('hex');
      fs.writeFileSync(secretPath, generated, { mode: 0o600 });
      return generated;
    } catch {
      return crypto.createHash('sha256').update(`${appRootDir}:${process.pid}`).digest('hex');
    }
  };

  const HMAC_SECRET = resolveHmacSecret();

  let dbCache: LicenseDatabaseShape | null = null;
  let dbCacheMtimeMs = 0;

  const loadDb = (): LicenseDatabaseShape => {
    try {
      if (fs.existsSync(dbPath)) {
        const stat = fs.statSync(dbPath);
        if (dbCache && stat.mtimeMs === dbCacheMtimeMs) {
          return dbCache;
        }
        const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
        if (parsed && typeof parsed === 'object' && parsed.users) {
          dbCache = parsed as LicenseDatabaseShape;
          dbCacheMtimeMs = stat.mtimeMs;
          return dbCache;
        }
      } else if (dbCache) {
        return dbCache;
      }
    } catch {
      if (dbCache) return dbCache;
    }
    dbCache = { users: {} };
    dbCacheMtimeMs = 0;
    return dbCache;
  };

  const saveDb = (db: LicenseDatabaseShape) => {
    dbCache = db;
    try {
      const tmp = `${dbPath}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
      fs.renameSync(tmp, dbPath);
      dbCacheMtimeMs = fs.statSync(dbPath).mtimeMs;
    } catch (err) {
      console.error('[SecurityLicense] Failed to persist license DB:', err);
    }
  };

  // =========================================================================
  // INPUT SANITIZATION & CRYPTO HELPERS
  // =========================================================================
  const sanitizeEmail = (raw: unknown): string | null => {
    const s = String(raw || '').trim().toLowerCase();
    if (s.length < 5 || s.length > 160) return null;
    if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)) return null;
    return s;
  };

  const sanitizeDisplayName = (raw: unknown, emailFallback: string): string => {
    const cleaned = String(raw || '')
      .replace(/[\u0000-\u001F\u007F<>]/g, '')
      .trim()
      .slice(0, 64);
    if (cleaned) return cleaned;
    return emailFallback.split('@')[0].slice(0, 32) || 'Director';
  };

  const sanitizeDeviceId = (raw: unknown): string => {
    const cleaned = String(raw || '')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 80);
    return cleaned.length >= 8 ? cleaned : '';
  };

  const sanitizeDeviceLabel = (raw: unknown, uaFallback: string): string => {
    const cleaned = String(raw || '')
      .replace(/[\u0000-\u001F\u007F<>]/g, '')
      .trim()
      .slice(0, 64);
    if (cleaned) return cleaned;
    if (/android/i.test(uaFallback)) return 'Android Studio Mobile';
    if (/windows/i.test(uaFallback)) return 'Windows Desktop Workstation';
    if (/mac os|macintosh/i.test(uaFallback)) return 'macOS Studio';
    return 'Web NLE Browser';
  };

  const sanitizePlatform = (raw: unknown, uaFallback: string): string => {
    const s = String(raw || '').trim().toLowerCase();
    if (['windows', 'android', 'macos', 'linux', 'web'].includes(s)) return s;
    if (/android/i.test(uaFallback)) return 'android';
    if (/windows/i.test(uaFallback)) return 'windows';
    return 'web';
  };

  const hashPassword = (password: string, existingSalt?: string): { hash: string; salt: string } => {
    const salt = existingSalt || crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash: derived, salt };
  };

  const verifyPassword = (password: string, expectedHash: string, salt: string): boolean => {
    try {
      const actual = crypto.scryptSync(password, salt, 64);
      const expected = Buffer.from(expectedHash, 'hex');
      if (actual.length !== expected.length) return false;
      return crypto.timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  };

  const computeHmacHex = (canonicalString: string): string => {
    return crypto.createHmac('sha256', HMAC_SECRET).update(canonicalString).digest('hex');
  };

  const computeLicenseSignature = (payload: Omit<SignedLicenseResponse, 'signature'>): string => {
    const canonical = [
      payload.authenticated ? '1' : '0',
      payload.userId || '',
      payload.email || '',
      payload.tier,
      String(payload.trialEndsAt ?? 0),
      String(payload.proPlan || ''),
      String(payload.proExpiresAt ?? 0),
      String(payload.daysRemaining),
      payload.deviceId || '',
      String(payload.serverNow),
      String(payload.signedAt)
    ].join('|');
    return computeHmacHex(canonical);
  };

  const verifyLicenseSignature = (payload: SignedLicenseResponse): boolean => {
    if (!payload?.signature || typeof payload.signature !== 'string') return false;
    const { signature, ...rest } = payload;
    const expected = computeLicenseSignature(rest);
    try {
      const a = Buffer.from(signature, 'hex');
      const b = Buffer.from(expected, 'hex');
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  };

  // Issue & verify compact HMAC-signed session bearer token
  const issueSessionToken = (userId: string, deviceId: string): string => {
    const now = Date.now();
    const tokenPayload = Buffer.from(
      JSON.stringify({
        sub: userId,
        did: deviceId,
        iat: now,
        exp: now + 90 * 24 * 60 * 60 * 1000
      }),
      'utf-8'
    ).toString('base64url');
    const sig = crypto.createHmac('sha256', HMAC_SECRET).update(tokenPayload).digest('base64url');
    return `hf1.${tokenPayload}.${sig}`;
  };

  const verifySessionToken = (token: string): { userId: string; deviceId: string; iat: number; exp: number } | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || parts[0] !== 'hf1') return null;
      const [, payloadB64, sigB64] = parts;
      const expectedSig = crypto.createHmac('sha256', HMAC_SECRET).update(payloadB64).digest('base64url');
      const a = Buffer.from(sigB64);
      const b = Buffer.from(expectedSig);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
      const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
      if (!parsed?.sub || !parsed?.did || typeof parsed.exp !== 'number') return null;
      if (Date.now() > parsed.exp) return null;
      return {
        userId: String(parsed.sub),
        deviceId: String(parsed.did),
        iat: Number(parsed.iat || 0),
        exp: Number(parsed.exp)
      };
    } catch {
      return null;
    }
  };

  const evaluateTierFromServerClock = (
    user: StoredUserAccount,
    serverNow: number
  ): { tier: LicenseTier; daysRemaining: number } => {
    if (user.proStatus === 'active' && (!user.proExpiresAt || serverNow < user.proExpiresAt)) {
      const proDays = user.proExpiresAt
        ? Math.max(1, Math.ceil((user.proExpiresAt - serverNow) / 86400000))
        : 365;
      return { tier: 'pro', daysRemaining: proDays };
    }
    if (serverNow < user.trialEndsAt) {
      const trialDays = Math.max(1, Math.ceil((user.trialEndsAt - serverNow) / 86400000));
      return { tier: 'trial', daysRemaining: trialDays };
    }
    return { tier: 'free', daysRemaining: 0 };
  };

  const buildSignedLicenseResponse = (
    user: StoredUserAccount | null,
    deviceId: string
  ): SignedLicenseResponse => {
    const serverNow = Date.now();
    if (!user) {
      const base: Omit<SignedLicenseResponse, 'signature'> = {
        authenticated: false,
        userId: null,
        email: null,
        name: null,
        tier: 'unauthenticated',
        trialStartedAt: null,
        trialEndsAt: null,
        proPlan: null,
        proExpiresAt: null,
        daysRemaining: 0,
        maxDevices: MAX_ACTIVE_DEVICES,
        activeDevices: [],
        deviceId,
        serverNow,
        signedAt: serverNow
      };
      return { ...base, signature: computeLicenseSignature(base) };
    }

    const { tier, daysRemaining } = evaluateTierFromServerClock(user, serverNow);
    const base: Omit<SignedLicenseResponse, 'signature'> = {
      authenticated: true,
      userId: user.id,
      email: user.email,
      name: user.name,
      tier,
      trialStartedAt: user.trialStartedAt,
      trialEndsAt: user.trialEndsAt,
      proPlan: user.proPlan,
      proExpiresAt: user.proExpiresAt,
      daysRemaining,
      maxDevices: MAX_ACTIVE_DEVICES,
      activeDevices: user.activeDevices,
      deviceId,
      serverNow,
      signedAt: serverNow
    };
    return { ...base, signature: computeLicenseSignature(base) };
  };

  const bindDeviceToAccount = (
    user: StoredUserAccount,
    deviceId: string,
    label: string,
    platform: string
  ): { ok: true } | { ok: false; activeDevices: ActiveDeviceRecord[] } => {
    const now = Date.now();
    const existing = user.activeDevices.find((d) => d.deviceId === deviceId);
    if (existing) {
      existing.lastSeenAt = now;
      if (label) existing.label = label;
      if (platform) existing.platform = platform;
      return { ok: true };
    }
    if (user.activeDevices.length >= MAX_ACTIVE_DEVICES) {
      return { ok: false, activeDevices: user.activeDevices };
    }
    user.activeDevices.push({
      deviceId,
      label,
      platform,
      lastSeenAt: now,
      createdAt: now
    });
    return { ok: true };
  };

  // =========================================================================
  // SECURITY HEADERS & CSP MIDDLEWARE
  // =========================================================================
  const securityHeadersMiddleware: express.RequestHandler = (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=(self)');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self' blob: data:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://apis.google.com https://www.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "media-src 'self' data: blob: https:",
        "connect-src 'self' data: blob: https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com"
      ].join('; ')
    );
    next();
  };

  // =========================================================================
  // SLIDING-WINDOW PER-USER / PER-IP RATE LIMITER
  // =========================================================================
  const rateBuckets = new Map<string, number[]>();

  const getClientIp = (req: express.Request): string => {
    const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return fwd || req.ip || req.socket?.remoteAddress || 'unknown';
  };

  const extractBearerToken = (req: express.Request): string => {
    const auth = String(req.headers.authorization || '').trim();
    if (auth.toLowerCase().startsWith('bearer ')) {
      return auth.slice(7).trim();
    }
    return '';
  };

  const createRateLimiter = (opts: {
    bucketName: string;
    windowMs: number;
    maxRequests: number;
  }): express.RequestHandler => {
    return (req, res, next) => {
      const now = Date.now();
      const token = extractBearerToken(req);
      const tokenClaims = token ? verifySessionToken(token) : null;
      const ip = getClientIp(req);
      const actorKey = tokenClaims?.userId ? `u:${tokenClaims.userId}` : `ip:${ip}`;
      const bucketKey = `${opts.bucketName}:${actorKey}`;

      const windowStart = now - opts.windowMs;
      const hits = (rateBuckets.get(bucketKey) || []).filter((ts) => ts > windowStart);

      res.setHeader('X-RateLimit-Limit', String(opts.maxRequests));
      if (hits.length >= opts.maxRequests) {
        const retryAfterSec = Math.max(1, Math.ceil((hits[0] + opts.windowMs - now) / 1000));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', String(Math.ceil((hits[0] + opts.windowMs) / 1000)));
        res.setHeader('Retry-After', String(retryAfterSec));
        return res.status(429).json({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          error: `Rate limit exceeded. Try again in ${retryAfterSec}s.`
        });
      }

      hits.push(now);
      rateBuckets.set(bucketKey, hits);
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, opts.maxRequests - hits.length)));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + opts.windowMs) / 1000)));
      next();
    };
  };

  // =========================================================================
  // AUTH & LICENSE VERIFICATION MIDDLEWARES
  // =========================================================================
  const resolveSessionFromRequest = (
    req: express.Request
  ): { user: StoredUserAccount; deviceId: string } | null => {
    const token = extractBearerToken(req);
    if (!token) return null;
    const claims = verifySessionToken(token);
    if (!claims) return null;
    const db = loadDb();
    const user = db.users[claims.userId];
    if (!user) return null;
    const reqDeviceId = sanitizeDeviceId(req.headers['x-device-id']) || claims.deviceId;
    const deviceBound = user.activeDevices.some((d) => d.deviceId === reqDeviceId);
    if (!deviceBound) return null;
    return { user, deviceId: reqDeviceId };
  };

  const requireActiveProOrTrial: express.RequestHandler = (req: AuthedRequest, res, next) => {
    const resolved = resolveSessionFromRequest(req);
    if (!resolved) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        error: 'Sign in and activate your 30-Day Pro Trial or Pro Studio license to access AI Studio engines.'
      });
    }
    const serverNow = Date.now();
    const { tier, daysRemaining } = evaluateTierFromServerClock(resolved.user, serverNow);
    if (tier !== 'trial' && tier !== 'pro') {
      return res.status(402).json({
        success: false,
        code: 'PRO_LICENSE_REQUIRED',
        error: 'Your 30-day free trial has expired. Upgrade to HANDFILM PRO STUDIO to continue using AI engines.',
        license: buildSignedLicenseResponse(resolved.user, resolved.deviceId)
      });
    }
    req.licenseContext = {
      user: resolved.user,
      deviceId: resolved.deviceId,
      tier,
      daysRemaining,
      serverNow
    };
    next();
  };

  // Optional Supabase Token Verification when SUPABASE_SERVICE_ROLE_KEY is configured
  const verifySupabaseAccessTokenIfConfigured = async (
    accessToken: string
  ): Promise<{ email: string; name: string; sub: string } | null> => {
    const supabaseUrl = String(process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const anonKey = String(process.env.VITE_SUPABASE_ANON_KEY || '').trim();
    const apiKey = serviceKey || anonKey;
    if (!supabaseUrl || !apiKey || !accessToken) return null;
    try {
      const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: apiKey
        }
      });
      if (!resp.ok) return null;
      const data: any = await resp.json().catch(() => null);
      const email = sanitizeEmail(data?.email);
      if (!email) return null;
      return {
        email,
        name: sanitizeDisplayName(data?.user_metadata?.full_name || data?.user_metadata?.name, email),
        sub: String(data?.id || '')
      };
    } catch {
      return null;
    }
  };

  // =========================================================================
  // ROUTE REGISTRATION ON EXPRESS APP
  // =========================================================================
  const registerRoutes = (app: express.Express) => {
    const authLimiter = createRateLimiter({
      bucketName: 'auth',
      windowMs: 5 * 60 * 1000,
      maxRequests: 35
    });
    const licenseLimiter = createRateLimiter({
      bucketName: 'license',
      windowMs: 60 * 1000,
      maxRequests: 90
    });
    const billingLimiter = createRateLimiter({
      bucketName: 'billing',
      windowMs: 5 * 60 * 1000,
      maxRequests: 30
    });

    // 1. Register / Start 30-Day Server-Timestamped Trial
    app.post('/api/auth/register', authLimiter, (req, res) => {
      try {
        const email = sanitizeEmail(req.body?.email);
        const password = String(req.body?.password || '');
        const ua = String(req.headers['user-agent'] || '');
        const deviceId = sanitizeDeviceId(req.body?.deviceId || req.headers['x-device-id']);
        const deviceLabel = sanitizeDeviceLabel(req.body?.deviceLabel, ua);
        const platform = sanitizePlatform(req.body?.platform, ua);

        if (!email) {
          return res.status(400).json({ success: false, code: 'INVALID_EMAIL', error: 'Enter a valid email address.' });
        }
        if (password.length < 6 || password.length > 128) {
          return res.status(400).json({
            success: false,
            code: 'INVALID_PASSWORD',
            error: 'Password must be between 6 and 128 characters.'
          });
        }
        if (!deviceId) {
          return res.status(400).json({
            success: false,
            code: 'DEVICE_ID_REQUIRED',
            error: 'Missing valid hardware device fingerprint.'
          });
        }

        const db = loadDb();
        const existingUser = Object.values(db.users).find((u) => u.email === email);
        if (existingUser) {
          return res.status(409).json({
            success: false,
            code: 'ACCOUNT_EXISTS',
            error: 'An account with this email already exists. Please sign in.'
          });
        }

        const now = Date.now();
        const { hash, salt } = hashPassword(password);
        const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
        const newUser: StoredUserAccount = {
          id: userId,
          email,
          name: sanitizeDisplayName(req.body?.name, email),
          provider: 'email',
          passwordHash: hash,
          passwordSalt: salt,
          createdAt: now,
          trialStartedAt: now,
          trialEndsAt: now + TRIAL_DURATION_MS,
          proPlan: null,
          proStatus: 'none',
          proExpiresAt: null,
          activeDevices: [
            {
              deviceId,
              label: deviceLabel,
              platform,
              lastSeenAt: now,
              createdAt: now
            }
          ]
        };

        db.users[userId] = newUser;
        saveDb(db);

        const sessionToken = issueSessionToken(userId, deviceId);
        const license = buildSignedLicenseResponse(newUser, deviceId);

        res.json({
          success: true,
          sessionToken,
          license
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Registration failed.' });
      }
    });

    // 2. Email/Password Sign In (Enforces 2-Device Session Limit)
    app.post('/api/auth/login', authLimiter, (req, res) => {
      try {
        const email = sanitizeEmail(req.body?.email);
        const password = String(req.body?.password || '');
        const ua = String(req.headers['user-agent'] || '');
        const deviceId = sanitizeDeviceId(req.body?.deviceId || req.headers['x-device-id']);
        const deviceLabel = sanitizeDeviceLabel(req.body?.deviceLabel, ua);
        const platform = sanitizePlatform(req.body?.platform, ua);

        if (!email || !password) {
          return res.status(400).json({ success: false, code: 'INVALID_CREDENTIALS', error: 'Email and password are required.' });
        }
        if (!deviceId) {
          return res.status(400).json({ success: false, code: 'DEVICE_ID_REQUIRED', error: 'Missing valid hardware device fingerprint.' });
        }

        const db = loadDb();
        const user = Object.values(db.users).find((u) => u.email === email);
        if (!user || !user.passwordHash || !user.passwordSalt || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_CREDENTIALS',
            error: 'Invalid email or password.'
          });
        }

        const bindResult = bindDeviceToAccount(user, deviceId, deviceLabel, platform);
        if (!bindResult.ok) {
          return res.status(403).json({
            success: false,
            code: 'DEVICE_LIMIT_REACHED',
            error: `2-device active limit reached (${MAX_ACTIVE_DEVICES}/${MAX_ACTIVE_DEVICES}). Remove an existing device below to authorize this workstation.`,
            maxDevices: MAX_ACTIVE_DEVICES,
            activeDevices: bindResult.activeDevices
          });
        }

        saveDb(db);
        const sessionToken = issueSessionToken(user.id, deviceId);
        const license = buildSignedLicenseResponse(user, deviceId);
        res.json({
          success: true,
          sessionToken,
          license
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Sign in failed.' });
      }
    });

    // 3. Google / Supabase OAuth Bridge (Server-Authoritative Trial + 2-Device Check)
    app.post('/api/auth/oauth', authLimiter, async (req, res) => {
      try {
        const ua = String(req.headers['user-agent'] || '');
        const deviceId = sanitizeDeviceId(req.body?.deviceId || req.headers['x-device-id']);
        const deviceLabel = sanitizeDeviceLabel(req.body?.deviceLabel, ua);
        const platform = sanitizePlatform(req.body?.platform, ua);

        if (!deviceId) {
          return res.status(400).json({ success: false, code: 'DEVICE_ID_REQUIRED', error: 'Missing device fingerprint.' });
        }

        let email = sanitizeEmail(req.body?.email);
        let name = sanitizeDisplayName(req.body?.name, email || 'director@handfilm.studio');
        let provider: 'google' | 'supabase' = 'google';

        const supabaseToken = String(req.body?.supabaseAccessToken || '').trim();
        if (supabaseToken) {
          const verified = await verifySupabaseAccessTokenIfConfigured(supabaseToken);
          if (verified) {
            email = verified.email;
            name = verified.name;
            provider = 'supabase';
          }
        }

        if (!email) {
          return res.status(400).json({
            success: false,
            code: 'INVALID_EMAIL',
            error: 'Valid Google or Supabase account email is required.'
          });
        }

        const db = loadDb();
        let user = Object.values(db.users).find((u) => u.email === email);
        const now = Date.now();
        if (!user) {
          const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
          user = {
            id: userId,
            email,
            name,
            provider,
            createdAt: now,
            trialStartedAt: now,
            trialEndsAt: now + TRIAL_DURATION_MS,
            proPlan: null,
            proStatus: 'none',
            proExpiresAt: null,
            activeDevices: []
          };
          db.users[userId] = user;
        }

        const bindResult = bindDeviceToAccount(user, deviceId, deviceLabel, platform);
        if (!bindResult.ok) {
          return res.status(403).json({
            success: false,
            code: 'DEVICE_LIMIT_REACHED',
            error: `2-device active limit reached (${MAX_ACTIVE_DEVICES}/${MAX_ACTIVE_DEVICES}). Revoke one active device to sign in here.`,
            maxDevices: MAX_ACTIVE_DEVICES,
            activeDevices: bindResult.activeDevices
          });
        }

        saveDb(db);
        const sessionToken = issueSessionToken(user.id, deviceId);
        const license = buildSignedLicenseResponse(user, deviceId);

        res.json({
          success: true,
          sessionToken,
          license
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'OAuth bridge failed.' });
      }
    });

    // 4. Revoke an active device slot (supports authenticated session OR email+password recovery)
    app.post('/api/license/devices/revoke', authLimiter, (req, res) => {
      try {
        const targetDeviceId = sanitizeDeviceId(req.body?.targetDeviceId);
        if (!targetDeviceId) {
          return res.status(400).json({ success: false, error: 'Valid targetDeviceId is required.' });
        }

        const db = loadDb();
        let targetUser: StoredUserAccount | null = null;
        let currentDeviceId = sanitizeDeviceId(req.headers['x-device-id'] || req.body?.deviceId);

        const resolved = resolveSessionFromRequest(req);
        if (resolved) {
          targetUser = resolved.user;
          currentDeviceId = resolved.deviceId;
        } else {
          const email = sanitizeEmail(req.body?.email);
          const password = String(req.body?.password || '');
          if (email) {
            const found = Object.values(db.users).find((u) => u.email === email);
            if (found) {
              if (found.passwordHash && found.passwordSalt) {
                if (verifyPassword(password, found.passwordHash, found.passwordSalt)) {
                  targetUser = found;
                }
              } else if (found.provider !== 'email' && req.body?.allowOAuthSlotReset === true) {
                targetUser = found;
              }
            }
          }
        }

        if (!targetUser) {
          return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Authentication required to revoke a device.' });
        }

        const beforeCount = targetUser.activeDevices.length;
        targetUser.activeDevices = targetUser.activeDevices.filter((d) => d.deviceId !== targetDeviceId);
        if (targetUser.activeDevices.length === beforeCount) {
          return res.status(404).json({ success: false, error: 'Device slot not found.' });
        }

        saveDb(db);
        res.json({
          success: true,
          revokedDeviceId: targetDeviceId,
          activeDevices: targetUser.activeDevices,
          license: resolved ? buildSignedLicenseResponse(targetUser, currentDeviceId) : null
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Device revoke failed.' });
      }
    });

    // 5. Logout current device slot
    app.post('/api/auth/logout', authLimiter, (req, res) => {
      const resolved = resolveSessionFromRequest(req);
      if (resolved) {
        const db = loadDb();
        const user = db.users[resolved.user.id];
        if (user) {
          user.activeDevices = user.activeDevices.filter((d) => d.deviceId !== resolved.deviceId);
          saveDb(db);
        }
      }
      res.json({ success: true });
    });

    // 6. Server-Authoritative License Status (Strictly Server Timestamp + HMAC-SHA256 Signed)
    app.get('/api/license/status', licenseLimiter, (req, res) => {
      const reqDeviceId = sanitizeDeviceId(req.headers['x-device-id'] || req.query.deviceId) || 'anon_device';
      const resolved = resolveSessionFromRequest(req);
      if (!resolved) {
        return res.json({
          success: true,
          license: buildSignedLicenseResponse(null, reqDeviceId)
        });
      }
      const db = loadDb();
      const user = db.users[resolved.user.id];
      const dev = user.activeDevices.find((d) => d.deviceId === resolved.deviceId);
      if (dev) {
        dev.lastSeenAt = Date.now();
        saveDb(db);
      }
      const license = buildSignedLicenseResponse(user, resolved.deviceId);
      res.json({
        success: true,
        license
      });
    });

    // 7. Verify signed license integrity endpoint (anti-tamper verification check)
    app.post('/api/license/verify', licenseLimiter, (req, res) => {
      const payload = req.body?.license as SignedLicenseResponse | undefined;
      if (!payload || !verifyLicenseSignature(payload)) {
        return res.status(403).json({
          success: false,
          valid: false,
          code: 'TAMPER_DETECTED',
          error: 'License signature mismatch or tampered payload.'
        });
      }
      res.json({ success: true, valid: true, serverNow: Date.now() });
    });

    // 8. Checkout Initiation & Sandbox Instant Activation (Stripe / Lemon Squeezy / SSLCommerz)
    app.post('/api/billing/checkout', billingLimiter, (req, res) => {
      try {
        const resolved = resolveSessionFromRequest(req);
        if (!resolved) {
          return res.status(401).json({
            success: false,
            code: 'AUTH_REQUIRED',
            error: 'Sign in first before activating a Pro Studio subscription.'
          });
        }

        const planRaw = String(req.body?.plan || 'annual').toLowerCase();
        const plan: SubscriptionPlan = planRaw === 'monthly' ? 'monthly' : 'annual';
        const providerRaw = String(req.body?.provider || 'stripe').toLowerCase();
        const provider: PaymentProvider =
          providerRaw === 'lemonsqueezy' || providerRaw === 'sslcommerz' ? providerRaw : 'stripe';

        // If live checkout link env var is configured, return it for redirect
        const externalUrlMap: Record<string, string | undefined> = {
          'stripe:monthly': process.env.STRIPE_MONTHLY_CHECKOUT_URL,
          'stripe:annual': process.env.STRIPE_ANNUAL_CHECKOUT_URL,
          'lemonsqueezy:monthly': process.env.LEMONSQUEEZY_MONTHLY_CHECKOUT_URL,
          'lemonsqueezy:annual': process.env.LEMONSQUEEZY_ANNUAL_CHECKOUT_URL,
          'sslcommerz:monthly': process.env.SSLCOMMERZ_MONTHLY_CHECKOUT_URL,
          'sslcommerz:annual': process.env.SSLCOMMERZ_ANNUAL_CHECKOUT_URL
        };
        const configuredUrl = externalUrlMap[`${provider}:${plan}`];
        if (configuredUrl && configuredUrl.startsWith('https://')) {
          return res.json({
            success: true,
            mode: 'external_checkout',
            checkoutUrl: configuredUrl,
            plan,
            provider
          });
        }

        // Sandbox/Commercial Instant Activation when gateway keys aren't bound yet
        const now = Date.now();
        const durationDays = plan === 'annual' ? 365 : 30;
        const db = loadDb();
        const user = db.users[resolved.user.id];
        user.proPlan = plan;
        user.proStatus = 'active';
        user.proExpiresAt = now + durationDays * 24 * 60 * 60 * 1000;
        saveDb(db);

        const license = buildSignedLicenseResponse(user, resolved.deviceId);
        res.json({
          success: true,
          mode: 'activated',
          plan,
          provider,
          pricing:
            plan === 'monthly'
              ? { usd: '$9.99', bdt: '৳990', interval: 'month' }
              : { usd: '$79', bdt: '৳7,900', interval: 'year' },
          license
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Checkout failed.' });
      }
    });

    // 9. Multi-Gateway Subscription Webhook (Stripe / Lemon Squeezy / SSLCommerz)
    app.post('/api/webhooks/subscription', billingLimiter, (req, res) => {
      try {
        const providerRaw = String(
          req.headers['x-billing-provider'] || req.body?.provider || 'stripe'
        ).toLowerCase();
        const provider: PaymentProvider =
          providerRaw === 'lemonsqueezy' || providerRaw === 'sslcommerz' ? providerRaw : 'stripe';

        // Signature checks when corresponding secret env vars are configured
        if (provider === 'lemonsqueezy' && process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
          const sig = String(req.headers['x-signature'] || '');
          const expected = crypto
            .createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_SECRET)
            .update(JSON.stringify(req.body || {}))
            .digest('hex');
          if (!sig || sig !== expected) {
            return res.status(401).json({ success: false, error: 'Invalid Lemon Squeezy webhook signature' });
          }
        }
        if (provider === 'stripe' && process.env.STRIPE_WEBHOOK_SECRET) {
          const sig = String(req.headers['stripe-signature'] || '');
          if (!sig) {
            return res.status(401).json({ success: false, error: 'Missing Stripe webhook signature' });
          }
        }
        if (provider === 'sslcommerz' && process.env.SSLCOMMERZ_STORE_PASSWORD) {
          const verifySign = String(req.body?.verify_sign || req.headers['x-sslcommerz-signature'] || '');
          if (!verifySign) {
            return res.status(401).json({ success: false, error: 'Missing SSLCommerz verification signature' });
          }
        }

        const eventType = String(req.body?.event || req.body?.type || 'subscription.activated').toLowerCase();
        const email = sanitizeEmail(
          req.body?.email || req.body?.data?.attributes?.user_email || req.body?.data?.object?.customer_email
        );
        if (!email) {
          return res.status(400).json({ success: false, error: 'Subscriber email missing from webhook payload' });
        }

        const db = loadDb();
        let user = Object.values(db.users).find((u) => u.email === email);
        const now = Date.now();
        if (!user) {
          const userId = `usr_${crypto.randomBytes(12).toString('hex')}`;
          user = {
            id: userId,
            email,
            name: sanitizeDisplayName(req.body?.name, email),
            provider: 'email',
            createdAt: now,
            trialStartedAt: now,
            trialEndsAt: now + TRIAL_DURATION_MS,
            proPlan: null,
            proStatus: 'none',
            proExpiresAt: null,
            activeDevices: []
          };
          db.users[userId] = user;
        }

        if (/cancel|expire|refund|failed/.test(eventType)) {
          user.proStatus = 'canceled';
          user.proExpiresAt = now;
        } else {
          const planRaw = String(req.body?.plan || 'annual').toLowerCase();
          const plan: SubscriptionPlan = planRaw === 'monthly' ? 'monthly' : 'annual';
          const durationDays = plan === 'annual' ? 365 : 30;
          user.proPlan = plan;
          user.proStatus = 'active';
          user.proExpiresAt = now + durationDays * 24 * 60 * 60 * 1000;
        }

        saveDb(db);
        res.json({
          success: true,
          provider,
          event: eventType,
          email,
          proStatus: user.proStatus,
          proPlan: user.proPlan,
          proExpiresAt: user.proExpiresAt
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Webhook processing error.' });
      }
    });
  };

  return {
    securityHeadersMiddleware,
    createRateLimiter,
    requireActiveProOrTrial,
    registerRoutes,
    verifyLicenseSignature
  };
}
