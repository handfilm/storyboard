import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type express from 'express';
import type {
  LicenseSecurityModule,
  PaymentProvider,
  ProTierName,
  SubscriptionPlan
} from './securityAndLicense.ts';

export type PaymentCurrency = 'USD' | 'BDT';

export interface TierPricingEntry {
  monthlyUSD: number;
  annualUSD: number;
  monthlyBDT: number;
  annualBDT: number;
  label: string;
}

export const PRICING_MATRIX: Record<ProTierName, TierPricingEntry> = {
  pro: {
    monthlyUSD: 19.99,
    annualUSD: 191.0,
    monthlyBDT: 1490,
    annualBDT: 14300,
    label: 'HANDFILM PRO'
  },
  ultra: {
    monthlyUSD: 39.99,
    annualUSD: 383.0,
    monthlyBDT: 2990,
    annualBDT: 28700,
    label: 'HANDFILM ULTRA'
  },
  teams: {
    monthlyUSD: 14.99,
    annualUSD: 143.0,
    monthlyBDT: 1190,
    annualBDT: 11400,
    label: 'HANDFILM TEAMS'
  }
};

export function normalizeProTier(raw: unknown): ProTierName {
  const s = String(raw || 'pro').toLowerCase().trim();
  if (s === 'ultra' || s === 'teams') return s;
  return 'pro';
}

export function normalizeBillingPlan(raw: unknown): SubscriptionPlan {
  const s = String(raw || 'monthly').toLowerCase().trim();
  return s === 'annual' ? 'annual' : 'monthly';
}

export function normalizeCurrency(raw: unknown): PaymentCurrency {
  return String(raw || 'USD').toUpperCase().trim() === 'BDT' ? 'BDT' : 'USD';
}

export function computePlanPrice(
  proTier: ProTierName,
  plan: SubscriptionPlan,
  currency: PaymentCurrency
): number {
  const entry = PRICING_MATRIX[proTier] || PRICING_MATRIX.pro;
  if (currency === 'BDT') {
    return plan === 'annual' ? entry.annualBDT : entry.monthlyBDT;
  }
  return plan === 'annual' ? entry.annualUSD : entry.monthlyUSD;
}

export function validateManualTrxId(raw: unknown): { valid: boolean; cleaned: string; reason?: string } {
  const cleaned = String(raw || '').trim().toUpperCase();
  if (!cleaned) {
    return { valid: false, cleaned: '', reason: 'Enter your bKash or Nagad Transaction ID (TrxID).' };
  }
  if (!/^[A-Z0-9_-]{8,24}$/.test(cleaned)) {
    return {
      valid: false,
      cleaned,
      reason: 'TrxID must be 8-24 alphanumeric characters (e.g., BKH8X92K4P or NGD7M41Q9R).'
    };
  }
  return { valid: true, cleaned };
}

export function buildPayPalOrderPayload(params: {
  proTier: ProTierName;
  plan: SubscriptionPlan;
  amountUsd: number;
  invoiceId: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  return {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: `${params.proTier}_${params.plan}`,
        invoice_id: params.invoiceId,
        description: `${PRICING_MATRIX[params.proTier].label} (${params.plan === 'annual' ? 'Yearly' : 'Monthly'})`,
        amount: {
          currency_code: 'USD',
          value: params.amountUsd.toFixed(2)
        }
      }
    ],
    application_context: {
      brand_name: 'HANDFILM STUDIO',
      landing_page: 'LOGIN',
      user_action: 'PAY_NOW',
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl
    }
  };
}

export function formatPemKey(rawKey: string, type: 'PUBLIC KEY' | 'RSA PRIVATE KEY' | 'PRIVATE KEY'): string {
  const trimmed = String(rawKey || '').trim().replace(/\\n/g, '\n');
  if (!trimmed) return '';
  if (trimmed.includes('-----BEGIN')) return trimmed;
  const wrapped = trimmed.match(/.{1,64}/g)?.join('\n') || trimmed;
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----`;
}

export function buildNagadSensitiveData(params: {
  merchantId: string;
  orderId: string;
  datetime: string;
  challenge: string;
}) {
  return {
    merchantId: params.merchantId,
    datetime: params.datetime,
    orderId: params.orderId,
    challenge: params.challenge
  };
}

export function encryptWithNagadPublicKey(plainJson: string, publicKeyRaw: string): string {
  const pem = formatPemKey(publicKeyRaw, 'PUBLIC KEY');
  const encrypted = crypto.publicEncrypt(
    {
      key: pem,
      padding: crypto.constants.RSA_PKCS1_PADDING
    },
    Buffer.from(plainJson, 'utf-8')
  );
  return encrypted.toString('base64');
}

export function signNagadPayloadRsaSha256(plainJson: string, privateKeyRaw: string): string {
  const pem = privateKeyRaw.includes('BEGIN RSA PRIVATE KEY')
    ? formatPemKey(privateKeyRaw, 'RSA PRIVATE KEY')
    : formatPemKey(privateKeyRaw, 'PRIVATE KEY');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(plainJson, 'utf-8');
  signer.end();
  return signer.sign(pem, 'base64');
}

interface PendingGatewayOrder {
  orderId: string;
  gatewayOrderRef: string;
  provider: PaymentProvider;
  userId: string;
  email: string;
  deviceId: string;
  proTier: ProTierName;
  plan: SubscriptionPlan;
  amount: number;
  currency: PaymentCurrency;
  createdAt: number;
}

export function registerPaymentGatewayRoutes(
  app: express.Express,
  licenseSecurity: LicenseSecurityModule
) {
  const pendingOrdersPath = path.resolve(licenseSecurity.dataDir, 'pending-orders.json');

  const loadPendingOrders = (): Record<string, PendingGatewayOrder> => {
    try {
      if (fs.existsSync(pendingOrdersPath)) {
        const parsed = JSON.parse(fs.readFileSync(pendingOrdersPath, 'utf-8'));
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  };

  const savePendingOrder = (order: PendingGatewayOrder) => {
    const orders = loadPendingOrders();
    orders[order.orderId] = order;
    if (order.gatewayOrderRef && order.gatewayOrderRef !== order.orderId) {
      orders[order.gatewayOrderRef] = order;
    }
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    for (const [k, v] of Object.entries(orders)) {
      if (v.createdAt < cutoff) delete orders[k];
    }
    try {
      fs.writeFileSync(pendingOrdersPath, JSON.stringify(orders, null, 2), 'utf-8');
    } catch (err) {
      console.error('[PaymentGateways] Failed to save pending order:', err);
    }
  };

  const popPendingOrder = (key: string): PendingGatewayOrder | null => {
    const orders = loadPendingOrders();
    const match = orders[key] || null;
    if (!match) return null;
    delete orders[match.orderId];
    if (match.gatewayOrderRef) delete orders[match.gatewayOrderRef];
    try {
      fs.writeFileSync(pendingOrdersPath, JSON.stringify(orders, null, 2), 'utf-8');
    } catch {}
    return match;
  };

  const resolveBaseUrl = (req: express.Request): string => {
    const envBase = String(process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
    if (envBase) return envBase;
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000').split(',')[0].trim();
    return `${proto}://${host}`;
  };

  const paymentLimiter = licenseSecurity.createRateLimiter({
    bucketName: 'payments',
    windowMs: 5 * 60 * 1000,
    maxRequests: 40
  });

  // Gateway capability & live pricing config (never leaks secrets)
  app.get('/api/payments/config', (_req, res) => {
    const bkashConfigured = Boolean(
      process.env.BKASH_APP_KEY &&
        process.env.BKASH_APP_SECRET &&
        process.env.BKASH_USERNAME &&
        process.env.BKASH_PASSWORD
    );
    const nagadConfigured = Boolean(
      process.env.NAGAD_MERCHANT_ID &&
        process.env.NAGAD_PUBLIC_KEY &&
        process.env.NAGAD_PRIVATE_KEY
    );
    const paypalConfigured = Boolean(
      process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
    );

    res.json({
      success: true,
      gateways: {
        bkash: { configured: bkashConfigured },
        nagad: {
          configured: nagadConfigured,
          merchantNumber: process.env.NAGAD_MERCHANT_NUMBER || '01XXXXXXXXX (Sandbox)'
        },
        paypal: {
          configured: paypalConfigured,
          clientId: paypalConfigured ? process.env.PAYPAL_CLIENT_ID : ''
        },
        manual: {
          configured: true,
          bkashNumber: process.env.BKASH_MERCHANT_NUMBER || '01700-000000',
          nagadNumber: process.env.NAGAD_MERCHANT_NUMBER || '01800-000000'
        }
      },
      pricing: PRICING_MATRIX
    });
  });

  // User verified payment history
  app.get('/api/payments/history', paymentLimiter, (req, res) => {
    const resolved = licenseSecurity.resolveSessionFromRequest(req);
    if (!resolved) {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Sign in required.' });
    }
    const transactions = licenseSecurity.listUserTransactions(resolved.user.id);
    res.json({ success: true, transactions });
  });

  // =========================================================================
  // 1. bKASH TOKENIZED CHECKOUT API
  // =========================================================================
  const getBkashConfig = () => {
    const appKey = String(process.env.BKASH_APP_KEY || '').trim();
    const appSecret = String(process.env.BKASH_APP_SECRET || '').trim();
    const username = String(process.env.BKASH_USERNAME || '').trim();
    const password = String(process.env.BKASH_PASSWORD || '').trim();
    const baseUrl = String(
      process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
    )
      .trim()
      .replace(/\/+$/, '');
    return { appKey, appSecret, username, password, baseUrl };
  };

  const grantBkashToken = async () => {
    const cfg = getBkashConfig();
    const resp = await fetch(`${cfg.baseUrl}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        username: cfg.username,
        password: cfg.password
      },
      body: JSON.stringify({
        app_key: cfg.appKey,
        app_secret: cfg.appSecret
      })
    });
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.id_token) {
      throw new Error(data?.statusMessage || data?.message || 'bKash grant_token failed');
    }
    return { idToken: String(data.id_token), cfg };
  };

  app.post('/api/payments/bkash/create', paymentLimiter, async (req, res) => {
    try {
      const resolved = licenseSecurity.resolveSessionFromRequest(req);
      if (!resolved) {
        return res.status(401).json({
          success: false,
          code: 'AUTH_REQUIRED',
          error: 'Sign in first to initialize bKash payment.'
        });
      }

      const cfg = getBkashConfig();
      if (!cfg.appKey || !cfg.appSecret || !cfg.username || !cfg.password) {
        return res.status(503).json({
          success: false,
          code: 'GATEWAY_NOT_CONFIGURED',
          error: 'bKash Tokenized Checkout keys are not configured on this server. Use Manual TrxID Instant Verify or configure BKASH_* environment variables.'
        });
      }

      const proTier = normalizeProTier(req.body?.planTier);
      const plan = normalizeBillingPlan(req.body?.plan);
      const amount = computePlanPrice(proTier, plan, 'BDT');
      const invoiceId = `HFBKH${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const baseUrl = resolveBaseUrl(req);
      const callbackURL = `${baseUrl}/api/payments/bkash/callback`;

      const { idToken } = await grantBkashToken();
      const createResp = await fetch(`${cfg.baseUrl}/tokenized/checkout/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: idToken,
          'X-APP-Key': cfg.appKey
        },
        body: JSON.stringify({
          mode: '0011',
          payerReference: resolved.user.id,
          callbackURL,
          amount: String(amount),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: invoiceId
        })
      });

      const data: any = await createResp.json().catch(() => ({}));
      if (!createResp.ok || !data?.bkashURL || !data?.paymentID) {
        return res.status(400).json({
          success: false,
          code: 'BKASH_CREATE_FAILED',
          error: data?.statusMessage || 'Unable to create bKash tokenized payment session.'
        });
      }

      savePendingOrder({
        orderId: invoiceId,
        gatewayOrderRef: String(data.paymentID),
        provider: 'bkash',
        userId: resolved.user.id,
        email: resolved.user.email,
        deviceId: resolved.deviceId,
        proTier,
        plan,
        amount,
        currency: 'BDT',
        createdAt: Date.now()
      });

      res.json({
        success: true,
        provider: 'bkash',
        paymentID: data.paymentID,
        invoiceId,
        amount,
        currency: 'BDT',
        checkoutUrl: data.bkashURL
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        code: 'BKASH_ERROR',
        error: err?.message || 'bKash checkout error'
      });
    }
  });

  app.get('/api/payments/bkash/callback', async (req, res) => {
    const paymentID = String(req.query?.paymentID || '').trim();
    const status = String(req.query?.status || '').toLowerCase().trim();
    if (!paymentID || status !== 'success') {
      return res.redirect(`/?payment=failed&provider=bkash&reason=${encodeURIComponent(status || 'cancelled')}`);
    }

    const pending = popPendingOrder(paymentID);
    if (!pending) {
      return res.redirect('/?payment=failed&provider=bkash&reason=order_not_found');
    }

    try {
      const { idToken, cfg } = await grantBkashToken();
      const execResp = await fetch(`${cfg.baseUrl}/tokenized/checkout/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: idToken,
          'X-APP-Key': cfg.appKey
        },
        body: JSON.stringify({ paymentID })
      });
      const execData: any = await execResp.json().catch(() => ({}));

      // Verify via queryPayment if execute didn't immediately confirm
      let finalTrxId = String(execData?.trxID || '');
      let finalStatus = String(execData?.transactionStatus || '');
      if (finalStatus !== 'Completed') {
        const queryResp = await fetch(`${cfg.baseUrl}/tokenized/checkout/payment/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: idToken,
            'X-APP-Key': cfg.appKey
          },
          body: JSON.stringify({ paymentID })
        });
        const queryData: any = await queryResp.json().catch(() => ({}));
        finalStatus = String(queryData?.transactionStatus || finalStatus);
        finalTrxId = String(queryData?.trxID || finalTrxId || paymentID);
      }

      if (finalStatus !== 'Completed') {
        return res.redirect(`/?payment=failed&provider=bkash&reason=${encodeURIComponent(finalStatus || 'not_completed')}`);
      }

      if (licenseSecurity.isTransactionUsed(finalTrxId)) {
        return res.redirect('/?payment=failed&provider=bkash&reason=duplicate_trx');
      }

      await licenseSecurity.fulfillVerifiedPayment({
        userId: pending.userId,
        email: pending.email,
        deviceId: pending.deviceId,
        plan: pending.plan,
        proTier: pending.proTier,
        provider: 'bkash',
        transactionId: finalTrxId,
        amount: pending.amount,
        currency: 'BDT',
        metadata: { paymentID }
      });

      return res.redirect(
        `/?payment=success&provider=bkash&tier=${pending.proTier}&plan=${pending.plan}&trxId=${encodeURIComponent(finalTrxId)}`
      );
    } catch (err: any) {
      return res.redirect(`/?payment=failed&provider=bkash&reason=${encodeURIComponent(err?.message || 'verify_error')}`);
    }
  });

  // =========================================================================
  // 2. NAGAD PAYMENT GATEWAY (PGW RSA ENCRYPT + SIGN)
  // =========================================================================
  const getNagadConfig = () => {
    const merchantId = String(process.env.NAGAD_MERCHANT_ID || '').trim();
    const merchantNumber = String(process.env.NAGAD_MERCHANT_NUMBER || '').trim();
    const publicKey = String(process.env.NAGAD_PUBLIC_KEY || '').trim();
    const privateKey = String(process.env.NAGAD_PRIVATE_KEY || '').trim();
    const baseUrl = String(
      process.env.NAGAD_BASE_URL ||
        'https://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs'
    )
      .trim()
      .replace(/\/+$/, '');
    return { merchantId, merchantNumber, publicKey, privateKey, baseUrl };
  };

  app.post('/api/payments/nagad/create', paymentLimiter, async (req, res) => {
    try {
      const resolved = licenseSecurity.resolveSessionFromRequest(req);
      if (!resolved) {
        return res.status(401).json({
          success: false,
          code: 'AUTH_REQUIRED',
          error: 'Sign in first to initialize Nagad payment.'
        });
      }

      const cfg = getNagadConfig();
      if (!cfg.merchantId || !cfg.publicKey || !cfg.privateKey) {
        return res.status(503).json({
          success: false,
          code: 'GATEWAY_NOT_CONFIGURED',
          error: 'Nagad PGW RSA keys are not configured on this server. Use Manual TrxID Instant Verify or configure NAGAD_* environment variables.'
        });
      }

      const proTier = normalizeProTier(req.body?.planTier);
      const plan = normalizeBillingPlan(req.body?.plan);
      const amount = computePlanPrice(proTier, plan, 'BDT');
      const orderId = `HFNGD${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const datetime = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
      const challenge = crypto.randomBytes(16).toString('hex');

      const sensitiveObj = buildNagadSensitiveData({
        merchantId: cfg.merchantId,
        orderId,
        datetime,
        challenge
      });
      const sensitiveJson = JSON.stringify(sensitiveObj);
      const sensitiveData = encryptWithNagadPublicKey(sensitiveJson, cfg.publicKey);
      const signature = signNagadPayloadRsaSha256(sensitiveJson, cfg.privateKey);

      const clientIp =
        String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
        req.ip ||
        '127.0.0.1';

      const initResp = await fetch(
        `${cfg.baseUrl}/check-out/initialize/${encodeURIComponent(cfg.merchantId)}/${encodeURIComponent(orderId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-KM-Api-Version': 'v-0.2.0',
            'X-KM-IP-V4': clientIp,
            'X-KM-Client-Type': 'PC_WEB'
          },
          body: JSON.stringify({
            dateTime: datetime,
            sensitiveData,
            signature
          })
        }
      );

      const initJson: any = await initResp.json().catch(() => ({}));
      if (!initResp.ok || !initJson?.sensitiveData) {
        return res.status(400).json({
          success: false,
          code: 'NAGAD_INIT_FAILED',
          error: initJson?.message || 'Nagad PGW initialization failed.'
        });
      }

      // Decrypt sensitiveData returned by Nagad using merchant private key to retrieve paymentReferenceId & challenge
      const privPem = cfg.privateKey.includes('BEGIN RSA PRIVATE KEY')
        ? formatPemKey(cfg.privateKey, 'RSA PRIVATE KEY')
        : formatPemKey(cfg.privateKey, 'PRIVATE KEY');
      const decryptedInit = JSON.parse(
        crypto
          .privateDecrypt(
            { key: privPem, padding: crypto.constants.RSA_PKCS1_PADDING },
            Buffer.from(initJson.sensitiveData, 'base64')
          )
          .toString('utf-8')
      );

      const paymentRefId = String(decryptedInit.paymentReferenceId || '');
      const completeSensitiveJson = JSON.stringify({
        merchantId: cfg.merchantId,
        orderId,
        currencyCode: '050',
        amount: String(amount),
        challenge: String(decryptedInit.challenge || challenge)
      });

      const baseUrl = resolveBaseUrl(req);
      const completeResp = await fetch(
        `${cfg.baseUrl}/check-out/complete/${encodeURIComponent(paymentRefId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-KM-Api-Version': 'v-0.2.0',
            'X-KM-IP-V4': clientIp,
            'X-KM-Client-Type': 'PC_WEB'
          },
          body: JSON.stringify({
            sensitiveData: encryptWithNagadPublicKey(completeSensitiveJson, cfg.publicKey),
            signature: signNagadPayloadRsaSha256(completeSensitiveJson, cfg.privateKey),
            merchantCallbackURL: `${baseUrl}/api/payments/nagad/callback`,
            additionalMerchantInfo: {
              userId: resolved.user.id,
              proTier,
              plan
            }
          })
        }
      );

      const completeJson: any = await completeResp.json().catch(() => ({}));
      if (!completeResp.ok || !completeJson?.callBackUrl) {
        return res.status(400).json({
          success: false,
          code: 'NAGAD_COMPLETE_FAILED',
          error: completeJson?.message || 'Nagad checkout completion failed.'
        });
      }

      savePendingOrder({
        orderId,
        gatewayOrderRef: paymentRefId,
        provider: 'nagad',
        userId: resolved.user.id,
        email: resolved.user.email,
        deviceId: resolved.deviceId,
        proTier,
        plan,
        amount,
        currency: 'BDT',
        createdAt: Date.now()
      });

      res.json({
        success: true,
        provider: 'nagad',
        orderId,
        paymentReferenceId: paymentRefId,
        amount,
        currency: 'BDT',
        checkoutUrl: completeJson.callBackUrl
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        code: 'NAGAD_ERROR',
        error: err?.message || 'Nagad checkout failed.'
      });
    }
  });

  app.get('/api/payments/nagad/callback', async (req, res) => {
    const paymentRefId = String(req.query?.payment_ref_id || req.query?.paymentRefId || '').trim();
    const status = String(req.query?.status || '').toLowerCase().trim();
    if (!paymentRefId || (status && status !== 'success')) {
      return res.redirect(`/?payment=failed&provider=nagad&reason=${encodeURIComponent(status || 'cancelled')}`);
    }

    const pending = popPendingOrder(paymentRefId);
    if (!pending) {
      return res.redirect('/?payment=failed&provider=nagad&reason=order_not_found');
    }

    try {
      const cfg = getNagadConfig();
      const verifyResp = await fetch(
        `${cfg.baseUrl}/verify/payment/${encodeURIComponent(paymentRefId)}`
      );
      const verifyData: any = await verifyResp.json().catch(() => ({}));
      const verifiedStatus = String(verifyData?.status || '').toLowerCase();
      const trxId = String(verifyData?.issuerPaymentRefNo || paymentRefId);

      if (verifiedStatus !== 'success') {
        return res.redirect(`/?payment=failed&provider=nagad&reason=${encodeURIComponent(verifiedStatus || 'unverified')}`);
      }

      await licenseSecurity.fulfillVerifiedPayment({
        userId: pending.userId,
        email: pending.email,
        deviceId: pending.deviceId,
        plan: pending.plan,
        proTier: pending.proTier,
        provider: 'nagad',
        transactionId: trxId,
        amount: pending.amount,
        currency: 'BDT',
        metadata: { paymentRefId }
      });

      return res.redirect(
        `/?payment=success&provider=nagad&tier=${pending.proTier}&plan=${pending.plan}&trxId=${encodeURIComponent(trxId)}`
      );
    } catch (err: any) {
      return res.redirect(`/?payment=failed&provider=nagad&reason=${encodeURIComponent(err?.message || 'verify_error')}`);
    }
  });

  // =========================================================================
  // 3. PAYPAL REST V2 ORDERS API
  // =========================================================================
  const getPayPalConfig = () => {
    const clientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();
    const baseUrl = String(
      process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'
    )
      .trim()
      .replace(/\/+$/, '');
    return { clientId, clientSecret, baseUrl };
  };

  const getPayPalAccessToken = async () => {
    const cfg = getPayPalConfig();
    const auth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
    const resp = await fetch(`${cfg.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.access_token) {
      throw new Error(data?.error_description || 'PayPal OAuth2 token failed');
    }
    return { accessToken: String(data.access_token), cfg };
  };

  app.post('/api/payments/paypal/create-order', paymentLimiter, async (req, res) => {
    try {
      const resolved = licenseSecurity.resolveSessionFromRequest(req);
      if (!resolved) {
        return res.status(401).json({
          success: false,
          code: 'AUTH_REQUIRED',
          error: 'Sign in first to initialize PayPal checkout.'
        });
      }

      const cfg = getPayPalConfig();
      if (!cfg.clientId || !cfg.clientSecret) {
        return res.status(503).json({
          success: false,
          code: 'GATEWAY_NOT_CONFIGURED',
          error: 'PayPal REST v2 credentials (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET) are not configured on this server.'
        });
      }

      const proTier = normalizeProTier(req.body?.planTier);
      const plan = normalizeBillingPlan(req.body?.plan);
      const amount = computePlanPrice(proTier, plan, 'USD');
      const invoiceId = `HFPP${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const baseUrl = resolveBaseUrl(req);

      const payload = buildPayPalOrderPayload({
        proTier,
        plan,
        amountUsd: amount,
        invoiceId,
        returnUrl: `${baseUrl}/?payment=paypal_return&tier=${proTier}&plan=${plan}`,
        cancelUrl: `${baseUrl}/?payment=failed&provider=paypal&reason=cancelled`
      });

      const { accessToken } = await getPayPalAccessToken();
      const resp = await fetch(`${cfg.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const orderData: any = await resp.json().catch(() => ({}));
      if (!resp.ok || !orderData?.id) {
        return res.status(400).json({
          success: false,
          code: 'PAYPAL_CREATE_FAILED',
          error: orderData?.message || 'Unable to create PayPal order.'
        });
      }

      const approveLink =
        Array.isArray(orderData.links) &&
        orderData.links.find((l: any) => l?.rel === 'approve')?.href;

      savePendingOrder({
        orderId: invoiceId,
        gatewayOrderRef: String(orderData.id),
        provider: 'paypal',
        userId: resolved.user.id,
        email: resolved.user.email,
        deviceId: resolved.deviceId,
        proTier,
        plan,
        amount,
        currency: 'USD',
        createdAt: Date.now()
      });

      res.json({
        success: true,
        provider: 'paypal',
        orderId: orderData.id,
        invoiceId,
        amount,
        currency: 'USD',
        approveUrl: approveLink || ''
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        code: 'PAYPAL_ERROR',
        error: err?.message || 'PayPal create order error'
      });
    }
  });

  app.post('/api/payments/paypal/capture-order', paymentLimiter, async (req, res) => {
    try {
      const resolved = licenseSecurity.resolveSessionFromRequest(req);
      if (!resolved) {
        return res.status(401).json({
          success: false,
          code: 'AUTH_REQUIRED',
          error: 'Sign in required to capture PayPal payment.'
        });
      }

      const orderId = String(req.body?.orderId || '').trim();
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'Missing PayPal orderId.' });
      }

      const cfg = getPayPalConfig();
      if (!cfg.clientId || !cfg.clientSecret) {
        return res.status(503).json({
          success: false,
          code: 'GATEWAY_NOT_CONFIGURED',
          error: 'PayPal credentials not configured.'
        });
      }

      const { accessToken } = await getPayPalAccessToken();
      const captureResp = await fetch(
        `${cfg.baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const captureData: any = await captureResp.json().catch(() => ({}));
      if (!captureResp.ok || captureData?.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          code: 'PAYPAL_CAPTURE_FAILED',
          error: captureData?.message || `PayPal order status: ${captureData?.status || 'UNKNOWN'}`
        });
      }

      const pending = popPendingOrder(orderId);
      const proTier = pending?.proTier || normalizeProTier(req.body?.planTier);
      const plan = pending?.plan || normalizeBillingPlan(req.body?.plan);
      const amount = pending?.amount || computePlanPrice(proTier, plan, 'USD');
      const captureId =
        captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;

      if (licenseSecurity.isTransactionUsed(captureId)) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_TRANSACTION',
          error: 'This PayPal capture ID has already been redeemed.'
        });
      }

      const fulfilled = await licenseSecurity.fulfillVerifiedPayment({
        userId: resolved.user.id,
        email: resolved.user.email,
        deviceId: resolved.deviceId,
        plan,
        proTier,
        provider: 'paypal',
        transactionId: captureId,
        amount,
        currency: 'USD',
        metadata: { paypalOrderId: orderId }
      });

      if (!fulfilled) {
        return res.status(404).json({ success: false, error: 'Account not found.' });
      }

      res.json({
        success: true,
        provider: 'paypal',
        orderId,
        captureId,
        license: fulfilled.license,
        transaction: fulfilled.transaction
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        code: 'PAYPAL_CAPTURE_ERROR',
        error: err?.message || 'PayPal capture failed.'
      });
    }
  });

  // =========================================================================
  // 4. MANUAL TRXID INSTANT VERIFY (bKASH / NAGAD PRE-MERCHANT SANDBOX)
  // =========================================================================
  app.post('/api/payments/manual/verify', paymentLimiter, async (req, res) => {
    try {
      const resolved = licenseSecurity.resolveSessionFromRequest(req);
      if (!resolved) {
        return res.status(401).json({
          success: false,
          code: 'AUTH_REQUIRED',
          error: 'Sign in first to verify a TrxID and upgrade your studio account.'
        });
      }

      const trxValidation = validateManualTrxId(req.body?.trxId);
      if (!trxValidation.valid) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_TRXID',
          error: trxValidation.reason
        });
      }

      if (licenseSecurity.isTransactionUsed(trxValidation.cleaned)) {
        return res.status(409).json({
          success: false,
          code: 'DUPLICATE_TRANSACTION',
          error: `Transaction ID ${trxValidation.cleaned} has already been verified and credited.`
        });
      }

      const methodRaw = String(req.body?.method || 'bkash').toLowerCase().trim();
      const provider: PaymentProvider = methodRaw === 'nagad' ? 'nagad' : 'bkash';
      const proTier = normalizeProTier(req.body?.planTier);
      const plan = normalizeBillingPlan(req.body?.plan);
      const currency = normalizeCurrency(req.body?.currency || 'BDT');
      const amount = computePlanPrice(proTier, plan, currency);

      const fulfilled = await licenseSecurity.fulfillVerifiedPayment({
        userId: resolved.user.id,
        email: resolved.user.email,
        deviceId: resolved.deviceId,
        plan,
        proTier,
        provider,
        transactionId: trxValidation.cleaned,
        amount,
        currency,
        metadata: {
          mode: 'manual_trxid_instant_verify',
          senderNumber: String(req.body?.senderNumber || '').slice(0, 24)
        }
      });

      if (!fulfilled) {
        return res.status(404).json({ success: false, error: 'Account not found.' });
      }

      res.json({
        success: true,
        mode: 'manual_verified',
        provider,
        transactionId: trxValidation.cleaned,
        license: fulfilled.license,
        transaction: fulfilled.transaction
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        code: 'MANUAL_VERIFY_ERROR',
        error: err?.message || 'Manual TrxID verification failed.'
      });
    }
  });
}
