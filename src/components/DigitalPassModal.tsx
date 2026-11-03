import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  Calendar,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { MemberTicket } from '../types.ts';
import { generateQRCodeSVG } from '../utils/qrCode.ts';

interface DigitalPassModalProps {
  ticket: MemberTicket | null;
  isOpen: boolean;
  onClose: () => void;
  onTestScanInGate: (ticket: MemberTicket) => void;
}

export const DigitalPassModal: React.FC<DigitalPassModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onTestScanInGate,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || !ticket) return null;

  const qrSvg = generateQRCodeSVG(ticket.qrPayload, {
    size: 200,
    fgColor: '#0f172a',
    bgColor: '#ffffff',
  });

  const handleDownloadSVG = () => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OpenCraft-Pass-${ticket.ticketNumber}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const handleDownloadICS = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//OpenCraft Summit//Ticket Pass//EN
BEGIN:VEVENT
SUMMARY:OpenCraft Community Maker & Tech Summit
DESCRIPTION:Official attendee pass: ${ticket.ticketNumber} (${ticket.tierName})
LOCATION:The Innovation Depot & Arts Foundry, 742 Civic Center Blvd, San Francisco, CA
DTSTART:20261114T170000Z
DTEND:20261115T023000Z
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OpenCraft-2026-${ticket.ticketNumber}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/85 backdrop-blur-sm print:bg-white print:p-0">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 print:border-none print:shadow-none print:my-0">
        {/* Top Control Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-400">Digital Member Pass</span>
            {ticket.checkedIn ? (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                Checked In
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/80 border border-sky-800/80 px-2 py-0.5 rounded-full">
                Active & Ready
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The Digital Pass Card Container */}
        <div className="p-6">
          <div className="relative bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl print:text-black print:bg-white print:border-black">
            {/* Ticket Header */}
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
                  OpenCraft Summit 2026
                </span>
                <h4 className="text-sm font-bold tracking-tight">Official Attendee Pass</h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-indigo-200 font-mono block">Ticket Ref</span>
                <span className="text-xs font-mono font-bold">{ticket.ticketNumber}</span>
              </div>
            </div>

            {/* Ticket Body */}
            <div className="p-5 space-y-4">
              <div>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Registered Member
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {ticket.attendeeName}
                </h3>
                {ticket.organization && (
                  <p className="text-xs text-indigo-400 font-medium">
                    {ticket.organization} {ticket.role ? `· ${ticket.role}` : ''}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Pass Tier</span>
                  <span className="font-semibold text-slate-200">{ticket.tierName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Status</span>
                  <span className="font-semibold text-emerald-400">
                    {ticket.paymentStatus === 'paid' ? 'Paid ($' + ticket.pricePaid + ')' : 'Pay At Gate'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Event Date</span>
                  <span className="text-slate-200">Nov 14, 2026</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Venue</span>
                  <span className="text-slate-200">Innovation Depot</span>
                </div>
              </div>

              {/* Perforated separator with cutouts */}
              <div className="relative my-4 flex items-center">
                <div className="absolute -left-7 w-4 h-4 rounded-full bg-slate-900 border border-slate-800" />
                <div className="w-full border-t border-dashed border-slate-700" />
                <div className="absolute -right-7 w-4 h-4 rounded-full bg-slate-900 border border-slate-800" />
              </div>

              {/* Centered High Resolution QR Code */}
              <div className="flex flex-col items-center justify-center space-y-2 py-1">
                <div
                  className="p-3 bg-white rounded-xl shadow-lg border border-slate-200"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                  SCAN AT GATE ENTRANCE
                </p>
              </div>

              {ticket.checkedIn && (
                <div className="rounded-lg bg-emerald-950/60 border border-emerald-800/60 p-2.5 text-center text-xs text-emerald-300">
                  <span className="font-semibold">✓ Already Checked In</span>
                  <span className="text-[10px] text-emerald-400 block mt-0.5 font-mono">
                    {ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleTimeString() : 'Verified'} {ticket.gateOperator ? `· ${ticket.gateOperator}` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 space-y-2 print:hidden">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleDownloadSVG}
              className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>{downloadSuccess ? 'Saved!' : 'Save QR'}</span>
            </button>

            <button
              onClick={handleDownloadICS}
              className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Calendar</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>Print</span>
            </button>
          </div>

          {/* Quick gate verification simulator */}
          <button
            onClick={() => {
              onClose();
              onTestScanInGate(ticket);
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Simulate Scan at Gate Scanner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
