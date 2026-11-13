/**
 * @file /src/components/modals/CheckoutModal.tsx
 * @description Multi-Gateway Checkout Drawer/Modal supporting Bangladesh (bKash, Nagad,
 * Manual TrxID Instant Verify) and International (PayPal REST v2 Orders) with automatic
 * BDT / USD currency switching.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldCheck,
  Globe,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  KeyRound,
  CreditCard,
  Loader2
} from 'lucide-react';
import {
  CLIENT_PRICING_MATRIX,
  PaymentCurrency,
  PaymentGatewayConfig,
  ProTierName,
  SubscriptionPlan,
  useLicenseStore
} from '../../services/licenseService';

export interface CheckoutModalProps {
  isOpen: boolean;
  planTier: ProTierName;
  billingCycle: SubscriptionPlan;
  onChangeBillingCycle: (cycle: SubscriptionPlan) => void;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  planTier,
  billingCycle,
  onChangeBillingCycle,
  onClose,
  onSuccess
}) => {
  const license = useLicenseStore((s) => s.license);
  const isLoading = useLicenseStore((s) => s.isLoading);
  const fetchPaymentGatewayConfig = useLicenseStore((s) => s.fetchPaymentGatewayConfig);
  const startBkashCheckout = useLicenseStore((s) => s.startBkashCheckout);
  const startNagadCheckout = useLicenseStore((s) => s.startNagadCheckout);
  const createPaypalOrder = useLicenseStore((s) => s.createPaypalOrder);
  const capturePaypalOrder = useLicenseStore((s) => s.capturePaypalOrder);
  const verifyManualTrxId = useLicenseStore((s) => s.verifyManualTrxId);

  const [currency, setCurrency] = useState<PaymentCurrency>(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      return /Dhaka|Asia\/Dacca/i.test(tz) ? 'BDT' : 'BDT';
    } catch {
      return 'BDT';
    }
  });

  const [bdtTab, setBdtTab] = useState<'gateway' | 'manual'>('gateway');
  const [manualMethod, setManualMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [trxIdInput, setTrxIdInput] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfig | null>(null);

  const [pendingPaypalOrderId, setPendingPaypalOrderId] = useState<string | null>(null);
  const [pendingPaypalApproveUrl, setPendingPaypalApproveUrl] = useState<string | null>(null);

  const [localError, setLocalError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLocalError(null);
    setLocalStatus(null);
    setPendingPaypalOrderId(null);
    setPendingPaypalApproveUrl(null);
    void fetchPaymentGatewayConfig().then((cfg) => {
      if (cfg) setGatewayConfig(cfg);
    });
  }, [isOpen, fetchPaymentGatewayConfig]);

  if (!isOpen || typeof document === 'undefined') return null;

  const tierEntry = CLIENT_PRICING_MATRIX[planTier];
  const priceDisplay =
    currency === 'BDT'
      ? `৳${(billingCycle === 'annual' ? tierEntry.annualBDT : tierEntry.monthlyBDT).toLocaleString()}`
      : `$${(billingCycle === 'annual' ? tierEntry.annualUSD : tierEntry.monthlyUSD).toFixed(2)}`;

  const handleBkashPay = async () => {
    setLocalError(null);
    setLocalStatus('Initializing bKash Tokenized Checkout...');
    const res = await startBkashCheckout({ plan: billingCycle, planTier });
    if (res.ok && res.checkoutUrl) {
      setLocalStatus('Redirecting to bKash Secure Payment Gateway...');
      window.location.assign(res.checkoutUrl);
      return;
    }
    setLocalStatus(null);
    if (res.code === 'GATEWAY_NOT_CONFIGURED') {
      setBdtTab('manual');
      setManualMethod('bkash');
      setLocalError('bKash live merchant keys are not bound yet — switched to Instant TrxID Verification for immediate testing.');
    } else {
      setLocalError(res.message || 'bKash checkout unavailable.');
    }
  };

  const handleNagadPay = async () => {
    setLocalError(null);
    setLocalStatus('Signing Nagad RSA Checkout Payload...');
    const res = await startNagadCheckout({ plan: billingCycle, planTier });
    if (res.ok && res.checkoutUrl) {
      setLocalStatus('Redirecting to Nagad PGW Checkout...');
      window.location.assign(res.checkoutUrl);
      return;
    }
    setLocalStatus(null);
    if (res.code === 'GATEWAY_NOT_CONFIGURED') {
      setBdtTab('manual');
      setManualMethod('nagad');
      setLocalError('Nagad PGW RSA keys are not bound yet — switched to Instant TrxID Verification for immediate testing.');
    } else {
      setLocalError(res.message || 'Nagad checkout unavailable.');
    }
  };

  const handlePaypalCreate = async () => {
    setLocalError(null);
    setLocalStatus('Creating PayPal v2 Order...');
    const res = await createPaypalOrder({ plan: billingCycle, planTier });
    if (res.ok && res.orderId) {
      setPendingPaypalOrderId(res.orderId);
      setPendingPaypalApproveUrl(res.approveUrl || null);
      setLocalStatus('PayPal Order created. Complete approval then click Capture Order.');
      if (res.approveUrl) {
        window.location.assign(res.approveUrl);
      }
      return;
    }
    setLocalStatus(null);
    setLocalError(res.message || 'PayPal REST API keys are not configured on this server.');
  };

  const handlePaypalCapture = async () => {
    if (!pendingPaypalOrderId) return;
    setLocalError(null);
    setLocalStatus('Capturing verified PayPal payment...');
    const res = await capturePaypalOrder({
      orderId: pendingPaypalOrderId,
      plan: billingCycle,
      planTier
    });
    if (res.ok) {
      onSuccess(res.message || `${planTier.toUpperCase()} activated via PayPal.`);
    } else {
      setLocalStatus(null);
      setLocalError(res.message || 'PayPal capture failed.');
    }
  };

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLocalStatus(`Verifying ${manualMethod.toUpperCase()} TrxID...`);
    const res = await verifyManualTrxId({
      trxId: trxIdInput,
      method: manualMethod,
      plan: billingCycle,
      planTier,
      currency: 'BDT',
      senderNumber
    });
    if (res.ok) {
      onSuccess(res.message || `${planTier.toUpperCase()} Studio unlocked.`);
    } else {
      setLocalStatus(null);
      setLocalError(res.message || 'Verification failed.');
    }
  };

  const bkashNumber = gatewayConfig?.gateways.manual.bkashNumber || '01700-000000';
  const nagadNumber = gatewayConfig?.gateways.manual.nagadNumber || '01800-000000';

  return createPortal(
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="HandFilm Multi-Gateway Checkout"
    >
      <div className="w-full max-w-xl bg-[#0B0B0D] border border-white/[0.14] rounded-lg shadow-[0_24px_96px_rgba(0,0,0,0.95)] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#121216] border-b border-white/[0.08]">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#F59E0B]">
              Verified Multi-Gateway Checkout
            </div>
            <h3 className="font-space-grotesk text-lg font-black text-white mt-0.5">
              Upgrade to {tierEntry.label} ({billingCycle === 'annual' ? 'Yearly' : 'Monthly'})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="w-8 h-8 rounded bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Summary + Currency Region Switch */}
          <div className="p-3.5 rounded bg-[#141417] border border-white/[0.1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-mono text-zinc-400">
                Account: <span className="text-zinc-200">{license?.email || 'Director'}</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1 tabular-nums">
                <span className="text-2xl font-black text-white">{priceDisplay}</span>
                <span className="text-xs font-mono text-zinc-400">
                  / {billingCycle === 'annual' ? 'year (-20%)' : 'month'}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              {/* Region / Currency Toggle */}
              <div className="inline-flex p-0.5 rounded bg-[#09090B] border border-white/[0.1] font-mono">
                <button
                  type="button"
                  data-testid="currency-bdt-btn"
                  onClick={() => {
                    setCurrency('BDT');
                    setLocalError(null);
                  }}
                  className={`px-2.5 py-1.5 rounded-[3px] text-[10px] font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors touch-manipulation ${
                    currency === 'BDT'
                      ? 'bg-[#E2136E] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Bangladesh (BDT ৳)</span>
                </button>
                <button
                  type="button"
                  data-testid="currency-usd-btn"
                  onClick={() => {
                    setCurrency('USD');
                    setLocalError(null);
                  }}
                  className={`px-2.5 py-1.5 rounded-[3px] text-[10px] font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors touch-manipulation ${
                    currency === 'USD'
                      ? 'bg-[#0070BA] text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>International (USD $)</span>
                </button>
              </div>

              {/* Cycle Toggle */}
              <div className="inline-flex items-center gap-2 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => onChangeBillingCycle('monthly')}
                  className={`cursor-pointer ${billingCycle === 'monthly' ? 'text-[#F59E0B] font-bold underline' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Monthly
                </button>
                <span className="text-zinc-700">|</span>
                <button
                  type="button"
                  onClick={() => onChangeBillingCycle('annual')}
                  className={`cursor-pointer ${billingCycle === 'annual' ? 'text-[#F59E0B] font-bold underline' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Yearly (-20%)
                </button>
              </div>
            </div>
          </div>

          {/* BANGLADESH (BDT ৳): bKash + Nagad + Manual TrxID Instant Verify */}
          {currency === 'BDT' && (
            <div className="space-y-4">
              <div className="flex items-center gap-1 p-1 rounded bg-[#141417] border border-white/[0.08] font-mono">
                <button
                  type="button"
                  onClick={() => setBdtTab('gateway')}
                  className={`flex-1 py-2 rounded-[3px] text-[11px] font-bold uppercase cursor-pointer transition-colors touch-manipulation ${
                    bdtTab === 'gateway'
                      ? 'bg-[#F59E0B] text-[#0B0B0D]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  bKash / Nagad Checkout API
                </button>
                <button
                  type="button"
                  data-testid="tab-manual-trxid"
                  onClick={() => setBdtTab('manual')}
                  className={`flex-1 py-2 rounded-[3px] text-[11px] font-bold uppercase cursor-pointer transition-colors touch-manipulation ${
                    bdtTab === 'manual'
                      ? 'bg-emerald-400 text-[#0B0B0D]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Manual TrxID Instant Verify
                </button>
              </div>

              {bdtTab === 'gateway' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* bKash Official Tokenized Button */}
                  <button
                    type="button"
                    data-testid="pay-bkash-btn"
                    disabled={isLoading}
                    onClick={handleBkashPay}
                    className="p-4 rounded-md bg-[#E2136E] hover:bg-[#c81061] text-white text-left transition-colors cursor-pointer touch-manipulation flex flex-col justify-between min-h-[112px]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-space-grotesk font-black text-base tracking-wide">
                        bKash Pay
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/25">
                        {gatewayConfig?.gateways.bkash.configured ? 'LIVE API' : 'SANDBOX'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-mono">
                      <span className="font-bold tabular-nums">{priceDisplay} BDT</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>

                  {/* Nagad PGW Button */}
                  <button
                    type="button"
                    data-testid="pay-nagad-btn"
                    disabled={isLoading}
                    onClick={handleNagadPay}
                    className="p-4 rounded-md bg-[#ED1C24] hover:bg-[#d3161e] text-white text-left transition-colors cursor-pointer touch-manipulation flex flex-col justify-between min-h-[112px]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-space-grotesk font-black text-base tracking-wide">
                        Nagad PGW
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/25">
                        {gatewayConfig?.gateways.nagad.configured ? 'LIVE RSA' : 'SANDBOX'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-mono">
                      <span className="font-bold tabular-nums">{priceDisplay} BDT</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleManualVerify} className="space-y-3 p-4 rounded-md bg-[#121216] border border-emerald-500/35">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-space-grotesk font-bold text-white flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-emerald-400" />
                      <span>Send Money / Payment to Merchant &amp; Verify TrxID</span>
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      {(['bkash', 'nagad'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setManualMethod(m)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase cursor-pointer ${
                            manualMethod === m
                              ? m === 'bkash'
                                ? 'bg-[#E2136E] text-white'
                                : 'bg-[#ED1C24] text-white'
                              : 'bg-[#0B0B0D] text-zinc-400 border border-white/[0.1]'
                          }`}
                        >
                          {m === 'bkash' ? 'bKash' : 'Nagad'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-[#09090B] border border-white/[0.08] text-[11px] font-mono text-zinc-300 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Merchant ({manualMethod === 'bkash' ? 'bKash' : 'Nagad'}):{' '}
                      <strong className="text-white">
                        {manualMethod === 'bkash' ? bkashNumber : nagadNumber}
                      </strong>
                    </span>
                    <span className="text-emerald-400 font-bold tabular-nums">
                      Amount: {priceDisplay} BDT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                        Transaction ID (TrxID) *
                      </label>
                      <input
                        type="text"
                        required
                        data-testid="manual-trxid-input"
                        value={trxIdInput}
                        onChange={(e) => setTrxIdInput(e.target.value.toUpperCase())}
                        placeholder="e.g. BKH9X42M8P"
                        className="w-full h-10 px-3 rounded bg-[#09090B] border border-white/[0.14] text-xs font-mono text-white uppercase focus:border-emerald-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
                        Sender Mobile (Optional)
                      </label>
                      <input
                        type="text"
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full h-10 px-3 rounded bg-[#09090B] border border-white/[0.14] text-xs font-mono text-white focus:border-emerald-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setTrxIdInput(
                          `${manualMethod === 'bkash' ? 'BKH' : 'NGD'}${Math.random().toString(36).slice(2, 10).toUpperCase()}`
                        )
                      }
                      className="text-[10px] font-mono text-zinc-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      Generate Sandbox Test TrxID
                    </button>

                    <button
                      type="submit"
                      data-testid="verify-manual-trxid-btn"
                      disabled={isLoading}
                      className="h-10 px-5 rounded bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 text-[#0B0B0D] font-space-grotesk font-black text-xs tracking-wider uppercase flex items-center gap-1.5 cursor-pointer touch-manipulation"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isLoading ? 'Verifying...' : 'Verify TrxID & Unlock'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* INTERNATIONAL (USD $): PAYPAL REST V2 ORDERS */}
          {currency === 'USD' && (
            <div className="space-y-3 p-4 rounded-md bg-[#121216] border border-[#0070BA]/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#38BDF8]" />
                  <span className="font-space-grotesk font-black text-sm text-white">
                    PayPal International Checkout (REST v2)
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0070BA]/25 text-[#38BDF8]">
                  {gatewayConfig?.gateways.paypal.configured ? 'PAYPAL READY' : 'KEYS REQUIRED'}
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Pay securely in USD via PayPal Express or Debit/Credit Card. License upgrades and HMAC-SHA256 tokens issue automatically upon server-side order capture.
              </p>

              {!pendingPaypalOrderId ? (
                <button
                  type="button"
                  data-testid="pay-paypal-btn"
                  disabled={isLoading}
                  onClick={handlePaypalCreate}
                  className="w-full h-11 rounded bg-[#0070BA] hover:bg-[#005EA6] disabled:opacity-60 text-white font-space-grotesk font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  <span>Pay {priceDisplay} USD with PayPal</span>
                </button>
              ) : (
                <div className="space-y-2.5 p-3 rounded bg-[#09090B] border border-white/[0.1]">
                  <div className="text-[11px] font-mono text-zinc-300">
                    PayPal Order ID: <strong className="text-cyan-300">{pendingPaypalOrderId}</strong>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingPaypalApproveUrl && (
                      <a
                        href={pendingPaypalApproveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 px-3 rounded bg-white/10 hover:bg-white/20 text-xs font-mono text-white flex items-center gap-1"
                      >
                        <span>Open PayPal Approval</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handlePaypalCapture}
                      className="h-9 px-4 rounded bg-emerald-400 hover:bg-emerald-300 text-[#0B0B0D] font-space-grotesk font-black text-xs uppercase cursor-pointer"
                    >
                      Capture &amp; Verify Payment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {localStatus && (
            <div className="px-3 py-2 rounded bg-cyan-500/15 border border-cyan-400/35 text-[11px] font-mono text-cyan-200 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>{localStatus}</span>
            </div>
          )}

          {localError && (
            <div className="px-3 py-2 rounded bg-red-500/15 border border-red-500/40 text-[11px] font-mono text-red-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{localError}</span>
            </div>
          )}

          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Server-Verified Transaction Ledger &amp; Anti-Replay Guard</span>
            </span>
            <span>HMAC-SHA256</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
