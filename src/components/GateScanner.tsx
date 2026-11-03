import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Flashlight,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  UserCheck,
  ShieldCheck,
  Users,
  Clock,
  Sparkles,
  Ticket,
  ChevronRight,
  Volume2,
} from 'lucide-react';
import { MemberTicket, CheckInLogEntry } from '../types.ts';
import { playCheckInAudio, scanImageForQR } from '../utils/qrCode.ts';

interface GateScannerProps {
  tickets: MemberTicket[];
  onCheckInTicket: (ticketId: string, operatorName?: string) => { success: boolean; message: string; ticket?: MemberTicket; wasAlreadyCheckedIn?: boolean };
  onUndoCheckIn: (ticketId: string) => void;
  externalScannedTicket?: MemberTicket | null;
  onClearExternalScan?: () => void;
}

export const GateScanner: React.FC<GateScannerProps> = ({
  tickets,
  onCheckInTicket,
  onUndoCheckIn,
  externalScannedTicket,
  onClearExternalScan,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // Scan result state
  const [scanResult, setScanResult] = useState<{
    status: 'idle' | 'success' | 'warning' | 'error';
    message: string;
    ticket?: MemberTicket;
    timestamp?: string;
  }>({ status: 'idle', message: '' });

  // Manual code search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'attendees' | 'history'>('camera');
  const [attendeeFilter, setAttendeeFilter] = useState<'all' | 'checked_in' | 'pending'>('all');

  // Logs
  const [checkInLogs, setCheckInLogs] = useState<CheckInLogEntry[]>([]);

  // Video and canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedPayload = useRef<string | null>(null);
  const lastScanTime = useRef<number>(0);

  // Stats calculation
  const totalTickets = tickets.length;
  const checkedInCount = tickets.filter((t) => t.checkedIn).length;
  const percentage = totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0;

  // Process a scanned raw string or ticket object
  const processScan = useCallback((rawPayload: string) => {
    // Prevent duplicate rapid-fire re-triggers within 2.5 seconds for the same code
    const now = Date.now();
    if (rawPayload === lastScannedPayload.current && now - lastScanTime.current < 2500) {
      return;
    }
    lastScannedPayload.current = rawPayload;
    lastScanTime.current = now;

    // Check if the payload is JSON or a raw ticket ID
    let targetId = rawPayload.trim();
    try {
      const parsed = JSON.parse(rawPayload);
      if (parsed.ticketId) {
        targetId = parsed.ticketId;
      }
    } catch {
      // not JSON, use raw string
    }

    // Attempt check-in
    const result = onCheckInTicket(targetId, 'Gate 1 (Main Entrance)');
    const timestampStr = new Date().toLocaleTimeString();

    if (result.success && result.ticket) {
      playCheckInAudio('success');
      setScanResult({
        status: 'success',
        message: 'Pass Verified & Checked In Successfully!',
        ticket: result.ticket,
        timestamp: timestampStr,
      });

      setCheckInLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          ticketId: result.ticket!.ticketNumber,
          attendeeName: result.ticket!.attendeeName,
          tierName: result.ticket!.tierName,
          timestamp: timestampStr,
          type: 'success',
          message: 'Entry Authorized by Gate 1',
        },
        ...prev.slice(0, 40),
      ]);
    } else if (result.wasAlreadyCheckedIn && result.ticket) {
      playCheckInAudio('warning');
      setScanResult({
        status: 'warning',
        message: 'Warning: Attendee already checked in earlier!',
        ticket: result.ticket,
        timestamp: timestampStr,
      });

      setCheckInLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          ticketId: result.ticket!.ticketNumber,
          attendeeName: result.ticket!.attendeeName,
          tierName: result.ticket!.tierName,
          timestamp: timestampStr,
          type: 'already_checked',
          message: `Duplicate scan attempt (First checked in: ${result.ticket!.checkedInAt ? new Date(result.ticket!.checkedInAt).toLocaleTimeString() : 'Earlier'})`,
        },
        ...prev.slice(0, 40),
      ]);
    } else {
      playCheckInAudio('error');
      setScanResult({
        status: 'error',
        message: result.message || 'Invalid or unregistered ticket QR pass.',
        timestamp: timestampStr,
      });

      setCheckInLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          ticketId: targetId,
          attendeeName: 'Unknown',
          tierName: 'N/A',
          timestamp: timestampStr,
          type: 'invalid',
          message: 'Unrecognized QR Pass Token',
        },
        ...prev.slice(0, 40),
      ]);
    }
  }, [onCheckInTicket]);

  // Handle external simulation request (e.g. from Digital Pass modal)
  useEffect(() => {
    if (externalScannedTicket) {
      processScan(externalScannedTicket.ticketNumber);
      if (onClearExternalScan) onClearExternalScan();
    }
  }, [externalScannedTicket, processScan, onClearExternalScan]);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
  }, []);

  // Continuous frame scanner loop
  const startScanLoop = useCallback(() => {
    const scanFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      try {
        const foundPayload = await scanImageForQR(videoRef.current);
        if (foundPayload) {
          processScan(foundPayload);
        }
      } catch {
        // Continue scanning silently
      }

      scanLoopRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);
  }, [processScan]);

  // Start camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
          startScanLoop();
        };
      }

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = (track as unknown as { getCapabilities?: () => { torch?: boolean } }).getCapabilities?.();
      setHasTorch(Boolean(capabilities?.torch));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Camera access was denied or not available.';
      console.warn('Camera initiation failed:', errorMsg);
      setCameraError('Camera access unavailable. You can use the Image Upload or Quick Test buttons below.');
      setIsCameraActive(false);
    }
  }, [facingMode, startScanLoop, stopCamera]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!mediaStreamRef.current) return;
    const track = mediaStreamRef.current.getVideoTracks()[0];
    try {
      const newTorch = !isTorchOn;
      await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: newTorch }],
      });
      setIsTorchOn(newTorch);
    } catch (e) {
      console.warn('Torch failed', e);
    }
  };

  // Flip camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
  }, [facingMode, startCamera, isCameraActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle uploaded QR code image file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = async () => {
      const payload = await scanImageForQR(img);
      URL.revokeObjectURL(url);
      if (payload) {
        processScan(payload);
      } else {
        // Fallback: search if file name has a ticket number or try canvas inspection
        playCheckInAudio('error');
        setScanResult({
          status: 'error',
          message: 'Could not detect a clear QR Code in the uploaded image. Please ensure the QR is well-lit and centered.',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    };
  };

  // Manual Search Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    processScan(searchQuery.trim());
    setSearchQuery('');
  };

  // Filtered Attendees
  const filteredAttendees = tickets.filter((t) => {
    const matchesFilter =
      attendeeFilter === 'all'
        ? true
        : attendeeFilter === 'checked_in'
        ? t.checkedIn
        : !t.checkedIn;

    const matchesSearch =
      !searchQuery.trim() ||
      t.attendeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.attendeeEmail.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Check-In Stats */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>OFFICIAL GATE CONTROL & VOLUNTEER STATION</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Community Event QR Gate Scanner
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Scan attendee passes via real-time camera, upload digital ticket images, or look up registered members.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 p-3 rounded-xl shrink-0">
            <div>
              <span className="text-[11px] text-slate-400 block">Gate Status</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Gate 1 Active
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <span className="text-[11px] text-slate-400 block">Attendance Rate</span>
              <span className="text-base font-bold font-mono text-white tabular-nums">
                {checkedInCount} / {totalTickets}{' '}
                <span className="text-xs text-indigo-400 font-normal">({percentage}%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Attendance Progress Bar */}
        <div className="mt-5">
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
            />
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('camera')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'camera'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Live Camera Scanner
          </button>

          <button
            onClick={() => setActiveTab('attendees')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'attendees'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Attendee Roster ({totalTickets})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Recent Check-Ins ({checkInLogs.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Live Camera Scanner & Result Display */}
      {activeTab === 'camera' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Camera Viewport & Controls */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] flex flex-col items-center justify-center shadow-xl">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Visual reticle & laser */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                    <div className="relative w-64 h-64 border-2 border-emerald-400/70 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]">
                      {/* Corner marks */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                      {/* Moving laser scan line */}
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/80 animate-scan-laser" />

                      <div className="absolute -bottom-8 inset-x-0 text-center text-[11px] font-mono font-medium text-emerald-400 tracking-wider">
                        ALIGN MEMBER QR CODE
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center space-y-4 max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <Camera className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Camera Offline</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {cameraError || 'Activate your device camera to scan member QR passes in real time at the gate.'}
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 active:scale-95 transition-all inline-flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Turn On Camera
                  </button>
                </div>
              )}

              {/* Camera Overlaid Controls */}
              {isCameraActive && (
                <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-auto">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={flipCamera}
                      title="Flip camera"
                      className="p-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    {hasTorch && (
                      <button
                        onClick={toggleTorch}
                        title="Toggle Flashlight"
                        className={`p-2 rounded-lg backdrop-blur-md border transition-colors ${
                          isTorchOn
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900/80 text-slate-200 border-slate-700 hover:text-white'
                        }`}
                      >
                        <Flashlight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={stopCamera}
                    className="px-3 py-1.5 rounded-lg bg-rose-600/90 text-white text-xs font-semibold hover:bg-rose-500 transition-colors flex items-center gap-1.5"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    Stop Camera
                  </button>
                </div>
              )}
            </div>

            {/* Quick Upload & Manual Code Entry Bar */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <form onSubmit={handleManualSubmit} className="flex-1 w-full relative">
                  <input
                    type="text"
                    placeholder="Enter ticket code (e.g. OC26-VIP-8492 or email)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-20 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors"
                  >
                    Check In
                  </button>
                </form>

                <label className="w-full sm:w-auto cursor-pointer px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center justify-center gap-2 shrink-0">
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Upload QR Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Hidden canvas for image decoding */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Fast Testing Shelf: Pre-registered Members */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Test Scan Registered Members (1-Click Simulation)
                </span>
                <span className="text-[10px] text-slate-500">Instant test</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tickets.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => processScan(item.ticketNumber)}
                    className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 text-left transition-colors flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-white truncate max-w-[100px]">
                        {item.attendeeName.split(' ')[0]}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1 rounded ${
                          item.checkedIn
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.checkedIn ? 'In' : 'Out'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 truncate mt-1">
                      {item.ticketNumber}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Scan Result & Member Badge Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  Verification Output
                </span>
                {scanResult.timestamp && (
                  <span className="text-[11px] font-mono text-slate-500">
                    {scanResult.timestamp}
                  </span>
                )}
              </div>

              {scanResult.status === 'idle' ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700/80 text-slate-500 flex items-center justify-center mx-auto">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">
                      Awaiting QR Code
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Hold an attendee pass up to the camera or click any of the member buttons on the left to verify credentials.
                    </p>
                  </div>
                </div>
              ) : scanResult.status === 'success' && scanResult.ticket ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Success Banner */}
                  <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Access Authorized!
                      </h4>
                      <p className="text-xs text-emerald-400/90 mt-0.5">
                        {scanResult.message}
                      </p>
                    </div>
                  </div>

                  {/* Member Badge Details */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          Registered Attendee
                        </span>
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          {scanResult.ticket.attendeeName}
                        </h3>
                        {scanResult.ticket.organization && (
                          <p className="text-xs text-indigo-400 font-medium">
                            {scanResult.ticket.organization}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          {scanResult.ticket.attendeeEmail}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          Pass Tier
                        </span>
                        <span className="inline-block mt-0.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                          {scanResult.ticket.tierName}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Ticket Ref</span>
                        <span className="font-mono text-slate-200 font-semibold">
                          {scanResult.ticket.ticketNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Payment State</span>
                        <span className="font-semibold text-emerald-400">
                          {scanResult.ticket.paymentStatus === 'paid'
                            ? `Paid via ${scanResult.ticket.paymentMethod.replace('_', ' ')}`
                            : 'Collect at Gate Desk'}
                        </span>
                      </div>
                    </div>

                    {scanResult.ticket.notes && (
                      <div className="pt-2 border-t border-slate-800/80 text-xs">
                        <span className="text-[10px] text-slate-500 block font-semibold">Special Instructions</span>
                        <p className="text-amber-300/90 text-xs mt-0.5">
                          {scanResult.ticket.notes}
                        </p>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Gate: Gate 1 (Main Entrance)</span>
                      <button
                        onClick={() => onUndoCheckIn(scanResult.ticket!.ticketNumber)}
                        className="text-rose-400 hover:text-rose-300 underline"
                      >
                        Undo Check-In
                      </button>
                    </div>
                  </div>
                </div>
              ) : scanResult.status === 'warning' && scanResult.ticket ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="p-4 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-300 flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Duplicate Scan Warning
                      </h4>
                      <p className="text-xs text-amber-300/90 mt-0.5">
                        {scanResult.message}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">
                        {scanResult.ticket.attendeeName}
                      </span>
                      <span className="font-mono text-amber-400">
                        {scanResult.ticket.ticketNumber}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Checked In At:{' '}
                      <span className="text-white font-mono">
                        {scanResult.ticket.checkedInAt
                          ? new Date(scanResult.ticket.checkedInAt).toLocaleTimeString()
                          : 'Earlier Today'}
                      </span>{' '}
                      by {scanResult.ticket.gateOperator || 'Gate Staff'}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-end gap-2">
                      <button
                        onClick={() => onUndoCheckIn(scanResult.ticket!.ticketNumber)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                      >
                        Reset Check-In State
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Scan Rejected
                      </h4>
                      <p className="text-xs text-rose-300/90 mt-0.5">
                        {scanResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Full Attendee Roster & Manual Check-In */}
      {activeTab === 'attendees' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAttendeeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  attendeeFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All ({totalTickets})
              </button>
              <button
                onClick={() => setAttendeeFilter('checked_in')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  attendeeFilter === 'checked_in'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Checked In ({checkedInCount})
              </button>
              <button
                onClick={() => setAttendeeFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  attendeeFilter === 'pending'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Pending ({totalTickets - checkedInCount})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Search attendee by name, code, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Attendee</th>
                  <th className="py-3 px-4">Ticket Number</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {filteredAttendees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No attendees match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAttendees.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{att.attendeeName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{att.attendeeEmail}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-indigo-400">
                        {att.ticketNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {att.tierName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] ${att.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {att.paymentStatus === 'paid' ? 'Paid' : 'Pay at Door'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {att.checkedIn ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Checked In
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">
                            Not Checked In
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {att.checkedIn ? (
                          <button
                            onClick={() => onUndoCheckIn(att.ticketNumber)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-rose-400 font-medium transition-colors"
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            onClick={() => processScan(att.ticketNumber)}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] text-white font-medium transition-colors"
                          >
                            Check In
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Recent Check-In History Logs */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Gate 1 Check-In Activity Stream
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Live Auditing
            </span>
          </div>

          <div className="divide-y divide-slate-800">
            {checkInLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No check-in actions recorded yet in this station session.
              </div>
            ) : (
              checkInLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    {log.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {log.type === 'already_checked' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                    {log.type === 'invalid' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}

                    <div>
                      <span className="font-semibold text-white">{log.attendeeName}</span>
                      <span className="text-slate-500 mx-1.5">·</span>
                      <span className="font-mono text-indigo-400">{log.ticketId}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{log.message}</p>
                    </div>
                  </div>

                  <span className="font-mono text-slate-500 text-[11px] shrink-0">
                    {log.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
