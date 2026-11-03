import React from 'react';
import {
  Ticket,
  QrCode,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { MemberTicket } from '../types.ts';
import { generateQRCodeSVG } from '../utils/qrCode.ts';

interface MyTicketsViewProps {
  tickets: MemberTicket[];
  onOpenPass: (ticket: MemberTicket) => void;
  onGoToTickets: () => void;
  onGoToScanner: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({
  tickets,
  onOpenPass,
  onGoToTickets,
  onGoToScanner,
}) => {
  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-1">
            <Ticket className="w-3.5 h-3.5" />
            <span>ATTENDEE WALLET</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            My Event Passes ({tickets.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Present any of your digital passes below at the entrance for quick QR badge scanning.
          </p>
        </div>

        <button
          onClick={onGoToTickets}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-indigo-600/25 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Another Pass
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Ticket className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No passes registered yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't purchased or registered any attendee passes yet. Pick a tier to get your personalized QR pass.
            </p>
          </div>
          <button
            onClick={onGoToTickets}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
          >
            Explore Summit Passes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => {
            const qrMiniSvg = generateQRCodeSVG(ticket.qrPayload, {
              size: 110,
              fgColor: '#0f172a',
              bgColor: '#ffffff',
            });

            return (
              <div
                key={ticket.id}
                onClick={() => onOpenPass(ticket)}
                className="group relative rounded-2xl border border-slate-800 bg-slate-900/70 hover:border-indigo-500/60 hover:bg-slate-900/90 transition-all p-5 flex flex-col justify-between cursor-pointer shadow-xl hover:shadow-indigo-500/5"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                    <span className="text-[11px] font-mono font-bold text-indigo-400">
                      {ticket.ticketNumber}
                    </span>
                    {ticket.checkedIn ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Checked In
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/80 border border-sky-800/80 px-2 py-0.5 rounded-full">
                        Active Pass
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        Attendee
                      </span>
                      <h4 className="text-base font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                        {ticket.attendeeName}
                      </h4>
                      <p className="text-xs text-slate-300 font-medium">
                        {ticket.tierName}
                      </p>
                      {ticket.organization && (
                        <p className="text-[11px] text-slate-400">
                          {ticket.organization}
                        </p>
                      )}
                    </div>

                    <div
                      className="p-1.5 bg-white rounded-lg shadow-md shrink-0 group-hover:scale-105 transition-transform"
                      dangerouslySetInnerHTML={{ __html: qrMiniSvg }}
                    />
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Nov 14, 2026</span>
                    </div>
                    <span>{ticket.paymentStatus === 'paid' ? `Paid ($${ticket.pricePaid})` : 'Pay at Gate'}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-indigo-400 font-medium">
                  <span>View Pass Details & QR</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
