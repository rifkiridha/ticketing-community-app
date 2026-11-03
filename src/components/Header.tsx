import React from 'react';
import { Ticket, QrCode, Calendar, Users, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'event' | 'tickets' | 'scanner' | 'my-passes';
  setActiveTab: (tab: 'event' | 'tickets' | 'scanner' | 'my-passes') => void;
  myTicketsCount: number;
  checkedInCount: number;
  totalAttendees: number;
  onOpenCheckout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  myTicketsCount,
  checkedInCount,
  totalAttendees,
  onOpenCheckout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text wordmark */}
          <button
            onClick={() => setActiveTab('event')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Ticket className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 group-hover:text-indigo-300 transition-colors">
                OpenCraft Summit
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Community Pass 2026
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('event')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'event'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Event Info
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'tickets'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" />
              Get Tickets
            </button>

            <button
              onClick={() => setActiveTab('my-passes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'my-passes'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              My Passes
              {myTicketsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  {myTicketsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'scanner'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 shadow-sm'
                  : 'text-emerald-400/90 hover:text-emerald-300 hover:bg-emerald-950/40'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Gate QR Scanner
              <span className="text-[10px] text-emerald-400/80 font-mono">
                {checkedInCount}/{totalAttendees}
              </span>
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {activeTab !== 'scanner' ? (
              <button
                onClick={() => {
                  if (onOpenCheckout) {
                    onOpenCheckout();
                  } else {
                    setActiveTab('tickets');
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 active:scale-95 transition-all shadow-md shadow-indigo-600/25 whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <Ticket className="w-3.5 h-3.5" />
                Buy Pass
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('event')}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Back to Summit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile subnavigation bar for small screens */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 px-2 py-2 bg-slate-900">
        <button
          onClick={() => setActiveTab('event')}
          className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium rounded ${
            activeTab === 'event' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Calendar className="w-4 h-4 mb-0.5" />
          Event
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium rounded ${
            activeTab === 'tickets' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Ticket className="w-4 h-4 mb-0.5" />
          Tickets
        </button>
        <button
          onClick={() => setActiveTab('my-passes')}
          className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium rounded ${
            activeTab === 'my-passes' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <QrCode className="w-4 h-4 mb-0.5" />
          My Passes {myTicketsCount > 0 ? `(${myTicketsCount})` : ''}
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex flex-col items-center py-1 px-3 text-[10px] font-medium rounded ${
            activeTab === 'scanner' ? 'text-emerald-400 font-semibold' : 'text-emerald-400/70'
          }`}
        >
          <ShieldCheck className="w-4 h-4 mb-0.5" />
          Gate Scanner
        </button>
      </div>
    </header>
  );
};
