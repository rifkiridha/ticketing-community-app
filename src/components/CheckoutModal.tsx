import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Smartphone,
  QrCode,
  Building2,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Copy,
  Check,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { TicketTier, PaymentMethodType, MemberTicket } from '../types.ts';
import { generateQRCodeSVG, playCheckInAudio } from '../utils/qrCode.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: TicketTier;
  onSuccess: (newTicket: MemberTicket) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  tier,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');

  // Attendee info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [notes, setNotes] = useState('');

  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardZip, setCardZip] = useState('');

  // QR / Instant Payment State
  const [qrCountdown, setQrCountdown] = useState(600); // 10 minutes
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Created Ticket
  const [createdTicket, setCreatedTicket] = useState<MemberTicket | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('form');
      setIsProcessing(false);
      setCreatedTicket(null);
      setQrCountdown(600);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && selectedMethod === 'qris_instant' && qrCountdown > 0) {
      timer = setInterval(() => {
        setQrCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, selectedMethod, qrCountdown]);

  if (!isOpen) return null;

  const totalPrice = tier.price * quantity;
  const paymentRef = `PAY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Format card number with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCompletePayment = () => {
    if (!fullName.trim()) {
      alert('Please enter your full name for the attendee pass.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      alert('Please enter a valid email address to receive your QR pass.');
      return;
    }

    setIsProcessing(true);
    setStep('processing');

    // Simulate realistic transaction gateway delay
    setTimeout(() => {
      const ticketId = `OC26-${tier.badge.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const isPayAtGate = selectedMethod === 'pay_at_gate';

      const newTicket: MemberTicket = {
        id: `tck-${Date.now()}`,
        ticketNumber: ticketId,
        eventId: 'evt-opencraft-2026',
        eventTitle: 'OpenCraft Community Maker & Tech Summit',
        attendeeName: fullName.trim(),
        attendeeEmail: email.trim(),
        organization: organization.trim() || undefined,
        tierId: tier.id,
        tierName: tier.name,
        pricePaid: totalPrice,
        currency: 'USD',
        paymentMethod: selectedMethod,
        paymentStatus: isPayAtGate ? 'pay_at_gate_reserved' : 'paid',
        paymentReference: paymentRef,
        purchaseDate: new Date().toISOString(),
        checkedIn: false,
        qrPayload: JSON.stringify({
          ticketId,
          name: fullName.trim(),
          tier: tier.name,
          event: 'OpenCraft 2026',
          status: isPayAtGate ? 'PAY_AT_GATE' : 'VALID',
        }),
        notes: notes.trim() || undefined,
      };

      setCreatedTicket(newTicket);
      setIsProcessing(false);
      setStep('success');
      playCheckInAudio('success');
      onSuccess(newTicket);
    }, 1800);
  };

  // Generate QR payment string for instant banking
  const instantPayQRString = `upi://pay?pa=opencraft@communitybank&pn=OpenCraft+Summit&am=${totalPrice}&cu=USD&tn=Pass-${tier.badge}-${paymentRef}`;
  const paymentQRSvg = generateQRCodeSVG(instantPayQRString, { size: 180, fgColor: '#0f172a', bgColor: '#ffffff' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Community Checkout
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {step === 'success' ? 'Registration Confirmed!' : `Get ${tier.name}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          {step === 'processing' ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <div>
                <h4 className="text-base font-bold text-white">
                  Securing Your Registration
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Processing via encrypted {selectedMethod.replace('_', ' ')} protocol & minting your member QR pass...
                </p>
              </div>
            </div>
          ) : step === 'success' && createdTicket ? (
            <div className="py-6 flex flex-col items-center text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                  Registration Complete
                </span>
                <h3 className="text-2xl font-extrabold text-white tracking-tight mt-1">
                  Welcome to OpenCraft 2026, {createdTicket.attendeeName}!
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Your pass has been generated and added to your attendee profile. You can present this QR code at the entrance gate for instant badge check-in.
                </p>
              </div>

              {/* Mini Pass Card Preview */}
              <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-xl p-5 text-left space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs text-slate-400">Pass Number</span>
                    <p className="font-mono text-sm font-bold text-indigo-400">
                      {createdTicket.ticketNumber}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    {createdTicket.paymentStatus === 'paid' ? 'Paid & Verified' : 'Pay at Gate'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Attendee</p>
                    <p className="text-sm font-semibold text-white">{createdTicket.attendeeName}</p>
                    <p className="text-xs text-slate-400">{createdTicket.tierName}</p>
                  </div>

                  <div
                    className="p-1.5 bg-white rounded-lg shadow-sm"
                    dangerouslySetInnerHTML={{
                      __html: generateQRCodeSVG(createdTicket.qrPayload, { size: 76 }),
                    }}
                  />
                </div>
              </div>

              <div className="w-full max-w-md pt-2 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  View Full Pass & Wallet
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Order Summary Pill */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-indigo-400 font-medium">Selected Tier</span>
                  <h4 className="text-sm font-bold text-white">{tier.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">${tier.price} per ticket</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-2.5 py-1 text-slate-300 hover:bg-slate-800 text-xs font-bold"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-mono font-semibold text-white">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(4, quantity + 1))}
                      className="px-2.5 py-1 text-slate-300 hover:bg-slate-800 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Due</span>
                    <span className="text-lg font-bold text-white font-mono tabular-nums">
                      ${totalPrice}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attendee Details Form */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Attendee Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jordan Miller"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      placeholder="jordan@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Organization / School (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Open Hardware SF"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Dietary / Workshop Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vegan lunch, T-shirt size M"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods Selection */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Select Payment Method
                  </h4>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    256-Bit SSL Encrypted
                  </span>
                </div>

                {/* 5 Payment Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('card')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-colors ${
                      selectedMethod === 'card'
                        ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/50'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <span className="text-[11px] font-semibold whitespace-nowrap">Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('apple_pay')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-colors ${
                      selectedMethod === 'apple_pay'
                        ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/50'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-slate-200" />
                    <span className="text-[11px] font-semibold whitespace-nowrap">Apple Pay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('google_pay')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-colors ${
                      selectedMethod === 'google_pay'
                        ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/50'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-sky-400" />
                    <span className="text-[11px] font-semibold whitespace-nowrap">Google Pay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('qris_instant')}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-colors ${
                      selectedMethod === 'qris_instant'
                        ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/50'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-semibold whitespace-nowrap">Instant QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('pay_at_gate')}
                    className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-colors ${
                      selectedMethod === 'pay_at_gate'
                        ? 'border-indigo-500 bg-indigo-950/40 text-white ring-1 ring-indigo-500/50'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-amber-400" />
                    <span className="text-[11px] font-semibold whitespace-nowrap">Pay at Gate</span>
                  </button>
                </div>

                {/* Method Specific UI Panels */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4">
                  {selectedMethod === 'card' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 block mb-1">
                          Card Number
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="4000 1234 5678 9010"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                          <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">
                            Expires
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            maxLength={5}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">
                            CVC
                          </label>
                          <input
                            type="password"
                            placeholder="123"
                            maxLength={4}
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            placeholder="94103"
                            value={cardZip}
                            onChange={(e) => setCardZip(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'apple_pay' && (
                    <div className="text-center py-3 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-white">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-white">
                          Authorize with Apple Pay
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Click below to confirm with Touch ID or Face ID simulation.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'google_pay' && (
                    <div className="text-center py-3 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border border-sky-500/30 flex items-center justify-center text-sky-400">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-white">
                          Authorize with Google Pay
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          1-tap checkout linked to your Google Account wallet.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'qris_instant' && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
                      <div
                        className="p-2 bg-white rounded-xl shadow-md shrink-0"
                        dangerouslySetInnerHTML={{ __html: paymentQRSvg }}
                      />
                      <div className="space-y-2 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-emerald-400 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>QR Expires in {formatTimer(qrCountdown)}</span>
                        </div>
                        <p className="text-xs text-slate-300">
                          Scan with your banking app (Venmo, Cash App, Revolut, QRIS, UPI, or PayPal) to transfer <span className="font-bold text-white font-mono">${totalPrice}</span>.
                        </p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 text-[11px] font-mono text-slate-400">
                          <span>Ref: {paymentRef}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(paymentRef, 'ref')}
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            {copiedField === 'ref' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'pay_at_gate' && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>Reserve Now, Pay Upon Arrival</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        Your ticket will be immediately reserved under your name. When you arrive at the entrance gate, present your QR reservation pass and settle the <strong className="text-white">${totalPrice}</strong> balance using cash, debit card, or local card terminal before badge printing.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleCompletePayment}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  <span>
                    {selectedMethod === 'pay_at_gate'
                      ? `Confirm & Reserve Ticket ($${totalPrice} at gate)`
                      : `Pay $${totalPrice} Now`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
