import React from 'react';
import { Check, Sparkles, ArrowRight, ShieldCheck, Ticket } from 'lucide-react';
import { TicketTier } from '../types.ts';

interface TicketTiersSectionProps {
  tiers: TicketTier[];
  selectedTier: TicketTier;
  onSelectTier: (tier: TicketTier) => void;
  onOpenCheckout: (tier: TicketTier) => void;
}

export const TicketTiersSection: React.FC<TicketTiersSectionProps> = ({
  tiers,
  selectedTier,
  onSelectTier,
  onOpenCheckout,
}) => {
  return (
    <div className="space-y-8 pb-16">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-2">
          <Ticket className="w-4 h-4" />
          <span>OFFICIAL COMMUNITY REGISTRATION</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Select Your Event Pass
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          All passes grant official entry, digital QR credentials, and voting privileges at the community lightning pitch awards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => {
          const isSelected = selectedTier.id === tier.id;
          return (
            <div
              key={tier.id}
              onClick={() => onSelectTier(tier)}
              className={`relative rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 border ${
                tier.isPopular
                  ? 'border-indigo-500/80 bg-slate-900/90 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                  : isSelected
                  ? 'border-indigo-400 bg-slate-900/80 ring-1 ring-indigo-400'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/70'
              }`}
            >
              {tier.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-semibold px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>{tier.badge}</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {tier.remaining} passes left
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white tracking-tight">
                  {tier.name}
                </h3>

                <p className="mt-2 text-xs text-slate-400 min-h-[36px] leading-relaxed">
                  {tier.description}
                </p>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-white font-mono tabular-nums">
                    ${tier.price}
                  </span>
                  {tier.originalPrice && (
                    <span className="text-xs text-slate-500 line-through font-mono">
                      ${tier.originalPrice}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">/ person</span>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                    What's included:
                  </span>
                  {tier.perks.map((perk, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCheckout(tier);
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-2 ${
                    tier.isPopular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800 text-slate-200 hover:bg-indigo-600 hover:text-white'
                  }`}
                >
                  <span>Select & Pay ${tier.price}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee strip */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Official Event Registration with instant QR pass issuance</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <span>Credit / Debit Card</span>
          <span aria-hidden="true">·</span>
          <span>Apple & Google Pay</span>
          <span aria-hidden="true">·</span>
          <span>Instant QR / QRIS</span>
          <span aria-hidden="true">·</span>
          <span>Pay at Door</span>
        </div>
      </div>
    </div>
  );
};
