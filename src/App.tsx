/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { EventOverview } from './components/EventOverview.tsx';
import { TicketTiersSection } from './components/TicketTiersSection.tsx';
import { GateScanner } from './components/GateScanner.tsx';
import { MyTicketsView } from './components/MyTicketsView.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { DigitalPassModal } from './components/DigitalPassModal.tsx';
import { COMMUNITY_EVENT, TICKET_TIERS, INITIAL_MEMBER_TICKETS } from './data/mockData.ts';
import { MemberTicket, TicketTier } from './types.ts';
import { ShieldCheck, Heart, Sparkles } from 'lucide-react';

const STORAGE_KEY_TICKETS = 'opencraft_community_tickets_v1';
const STORAGE_KEY_MY_TICKETS = 'opencraft_my_tickets_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<'event' | 'tickets' | 'scanner' | 'my-passes'>('event');

  // Load registered tickets from localStorage or default mock
  const [tickets, setTickets] = useState<MemberTicket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TICKETS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_MEMBER_TICKETS;
  });

  // Track tickets belonging to the current user
  const [myTicketIds, setMyTicketIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MY_TICKETS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    // Default to the first pre-registered VIP ticket so user has a pass right away
    return ['tck-001'];
  });

  // Modals & Active state
  const [selectedTier, setSelectedTier] = useState<TicketTier>(TICKET_TIERS[1]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activePassTicket, setActivePassTicket] = useState<MemberTicket | null>(null);
  const [externalScanTarget, setExternalScanTarget] = useState<MemberTicket | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }, [tickets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MY_TICKETS, JSON.stringify(myTicketIds));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }, [myTicketIds]);

  // Check in handler used by GateScanner
  const handleCheckInTicket = (
    ticketIdentifier: string,
    operatorName: string = 'Gate 1 (Main Entrance)'
  ): {
    success: boolean;
    message: string;
    ticket?: MemberTicket;
    wasAlreadyCheckedIn?: boolean;
  } => {
    const cleanId = ticketIdentifier.trim().toLowerCase();

    const foundTicket = tickets.find(
      (t) =>
        t.ticketNumber.toLowerCase() === cleanId ||
        t.id.toLowerCase() === cleanId ||
        t.attendeeEmail.toLowerCase() === cleanId ||
        t.qrPayload.toLowerCase().includes(cleanId)
    );

    if (!foundTicket) {
      return {
        success: false,
        message: `Ticket "${ticketIdentifier}" not found in registered member database.`,
      };
    }

    if (foundTicket.checkedIn) {
      return {
        success: false,
        wasAlreadyCheckedIn: true,
        message: `Already checked in at ${foundTicket.checkedInAt ? new Date(foundTicket.checkedInAt).toLocaleTimeString() : 'Earlier'} by ${foundTicket.gateOperator || 'Gate Staff'}.`,
        ticket: foundTicket,
      };
    }

    // Mark as checked in
    const updatedTicket: MemberTicket = {
      ...foundTicket,
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
      gateOperator: operatorName,
    };

    setTickets((prev) =>
      prev.map((t) => (t.id === foundTicket.id ? updatedTicket : t))
    );

    // If currently viewing pass modal, update it too
    if (activePassTicket && activePassTicket.id === foundTicket.id) {
      setActivePassTicket(updatedTicket);
    }

    return {
      success: true,
      message: 'Access Granted! Badge printed & attendee checked in.',
      ticket: updatedTicket,
    };
  };

  // Undo check-in handler
  const handleUndoCheckIn = (ticketIdentifier: string) => {
    const cleanId = ticketIdentifier.trim().toLowerCase();
    setTickets((prev) =>
      prev.map((t) => {
        if (
          t.ticketNumber.toLowerCase() === cleanId ||
          t.id.toLowerCase() === cleanId ||
          t.attendeeEmail.toLowerCase() === cleanId
        ) {
          const updated = {
            ...t,
            checkedIn: false,
            checkedInAt: undefined,
            gateOperator: undefined,
          };
          if (activePassTicket && activePassTicket.id === t.id) {
            setActivePassTicket(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Checkout Success Handler
  const handlePurchaseSuccess = (newTicket: MemberTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
    setMyTicketIds((prev) => [newTicket.id, ...prev]);
    setActivePassTicket(newTicket);
  };

  // Fast Test Scan trigger from Digital Pass modal
  const handleTestScanInGate = (ticket: MemberTicket) => {
    setActiveTab('scanner');
    setExternalScanTarget(ticket);
  };

  // Filter user's personal tickets
  const myTickets = tickets.filter((t) => myTicketIds.includes(t.id));
  const checkedInCount = tickets.filter((t) => t.checkedIn).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        myTicketsCount={myTickets.length}
        checkedInCount={checkedInCount}
        totalAttendees={tickets.length}
        onOpenCheckout={() => {
          setSelectedTier(TICKET_TIERS[1]);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {activeTab === 'event' && (
          <EventOverview
            event={COMMUNITY_EVENT}
            tiers={TICKET_TIERS}
            totalCheckedIn={checkedInCount}
            totalRegistered={tickets.length}
            onSelectTier={(tier) => {
              setSelectedTier(tier);
              setIsCheckoutOpen(true);
            }}
            onGoToScanner={() => setActiveTab('scanner')}
          />
        )}

        {activeTab === 'tickets' && (
          <TicketTiersSection
            tiers={TICKET_TIERS}
            selectedTier={selectedTier}
            onSelectTier={(tier) => setSelectedTier(tier)}
            onOpenCheckout={(tier) => {
              setSelectedTier(tier);
              setIsCheckoutOpen(true);
            }}
          />
        )}

        {activeTab === 'my-passes' && (
          <MyTicketsView
            tickets={myTickets}
            onOpenPass={(t) => setActivePassTicket(t)}
            onGoToTickets={() => setActiveTab('tickets')}
            onGoToScanner={() => setActiveTab('scanner')}
          />
        )}

        {activeTab === 'scanner' && (
          <GateScanner
            tickets={tickets}
            onCheckInTicket={handleCheckInTicket}
            onUndoCheckIn={handleUndoCheckIn}
            externalScannedTicket={externalScanTarget}
            onClearExternalScan={() => setExternalScanTarget(null)}
          />
        )}
      </main>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        tier={selectedTier}
        onSuccess={handlePurchaseSuccess}
      />

      {/* Digital Pass Modal */}
      <DigitalPassModal
        isOpen={Boolean(activePassTicket)}
        ticket={activePassTicket}
        onClose={() => setActivePassTicket(null)}
        onTestScanInGate={handleTestScanInGate}
      />

      {/* Quiet, clean footer adhering to anti-slop guidelines */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">OpenCraft Summit 2026</span>
            <span aria-hidden="true">·</span>
            <span>Civic Maker Community</span>
            <span aria-hidden="true">·</span>
            <span>San Francisco, CA</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => setActiveTab('scanner')}
              className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Gate Check-In Portal
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => {
                setSelectedTier(TICKET_TIERS[0]);
                setIsCheckoutOpen(true);
              }}
              className="text-slate-400 hover:text-white"
            >
              Community Grants
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
