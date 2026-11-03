import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Hammer,
  Cpu,
  Utensils,
  Share2,
} from 'lucide-react';
import { CommunityEvent, TicketTier } from '../types.ts';

interface EventOverviewProps {
  event: CommunityEvent;
  tiers: TicketTier[];
  totalCheckedIn: number;
  totalRegistered: number;
  onSelectTier: (tier: TicketTier) => void;
  onGoToScanner: () => void;
}

export const EventOverview: React.FC<EventOverviewProps> = ({
  event,
  tiers,
  totalCheckedIn,
  totalRegistered,
  onSelectTier,
  onGoToScanner,
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-2xl">
        <div className="relative h-[320px] sm:h-[420px] w-full overflow-hidden">
          <img
            src={event.bannerImage}
            alt={event.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center filter brightness-[0.7] transform hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              {copiedLink ? 'Link Copied!' : 'Share Event'}
            </button>
          </div>

          <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 md:p-10 flex flex-col justify-end">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-indigo-400 mb-2">
              <span>{event.edition}</span>
              <span aria-hidden="true">·</span>
              <span>Community Organized</span>
              <span aria-hidden="true">·</span>
              <span>{event.city}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight max-w-3xl leading-tight">
              {event.title}
            </h1>

            <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl line-clamp-2">
              {event.tagline}
            </p>

            {/* Quick Metadata Bar */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span className="truncate max-w-[200px] sm:max-w-none">{event.venueName}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onSelectTier(tiers[1] || tiers[0])}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-2"
                >
                  Reserve Your Pass
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Attendance Banner & Gate Scanner Quick Jump */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-800 bg-slate-900/90 border-t border-slate-800 text-slate-300">
          <div className="p-4 sm:p-5 flex flex-col">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Registered Attendees</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">{totalRegistered}</span>
              <span className="text-xs text-slate-400">/ {event.capacity} cap</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex flex-col">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Live Checked In</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono tabular-nums">{totalCheckedIn}</span>
              <span className="text-xs text-slate-400">at gate</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex flex-col">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Starting Price</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">$10</span>
              <span className="text-xs text-slate-400">student / grant</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Event Staff Tool</span>
            <button
              onClick={onGoToScanner}
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Launch Gate QR Scanner →
            </button>
          </div>
        </div>
      </section>

      {/* Featured Showcase & Community Highlights Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>HANDS-ON COMMUNITY GATHERING</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Built by the community, for the community
            </h2>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              {event.description}
            </p>
          </div>

          <div className="mt-6 rounded-xl overflow-hidden border border-slate-800 relative aspect-video">
            <img
              src={event.showcaseImage}
              alt="Community Maker Showcase"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
              <span className="text-xs font-medium text-white">
                Hardware tinkering & design lab session
              </span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <img
                src={event.organizer.avatar}
                alt={event.organizer.name}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-slate-700"
              />
              <div>
                <p className="font-medium text-slate-200">{event.organizer.name}</p>
                <p className="text-[11px] text-slate-400">{event.organizer.role}</p>
              </div>
            </div>
            <a
              href={`mailto:${event.organizer.email}`}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Contact Team
            </a>
          </div>
        </div>

        {/* 4 Feature Columns */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {event.highlights.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center mb-4">
                  {idx === 0 && <Cpu className="w-5 h-5" />}
                  {idx === 1 && <Hammer className="w-5 h-5" />}
                  {idx === 2 && <Users className="w-5 h-5" />}
                  {idx === 3 && <Utensils className="w-5 h-5" />}
                </div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Included in all full passes</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Schedule Agenda */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Event Day Schedule
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Doors open at 08:30 AM for badge printing and coffee check-in.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Timezone: Pacific Standard Time (UTC-8)
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {event.schedule.map((slot, index) => (
            <div key={index} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-start sm:items-center gap-4">
                <span className="font-mono text-indigo-400 font-medium shrink-0 w-36">
                  {slot.time}
                </span>
                <div>
                  <h4 className="font-medium text-slate-200">
                    {slot.activity}
                  </h4>
                  {slot.speaker && (
                    <span className="text-[11px] text-slate-400">
                      Led by: {slot.speaker}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-slate-400 text-[11px] sm:text-right shrink-0">
                <span className="text-slate-500">Room:</span> {slot.room}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
