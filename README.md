# OpenCraft Summit — Community Event Ticketing & QR Check-In System

A responsive, production-ready community event ticketing platform built with React 19, TypeScript, Vite, and Tailwind CSS. The application features multi-option checkout payments, mathematically authentic scannable QR passes, and an organizer Gate Scanner equipped with live camera scanning, audio feedback, duplicate ticket prevention, and real-time attendance auditing.

---

## 1. System Overview & Technology Stack

- **Framework**: React 19 (Hooks, Context, Functional Components)
- **Language**: TypeScript (Strict typing, no `any` fallbacks)
- **Styling**: Tailwind CSS v4 with custom dark mode and scan laser animations
- **Icons**: `lucide-react`
- **QR Encoding & Decoding Engine**:
  - **Generator**: Pure TypeScript byte-mode QR matrix generator with Reed-Solomon Galois Field $GF(2^8)$ error correction (outputs high-res vector SVGs).
  - **Scanner**: Native Web `BarcodeDetector` API + HTML5 Video frame sampling + file upload decoder.
  - **Audio Engine**: Web Audio API oscillator synthesis (real-time ascending chime for authorized check-in, warning tone for duplicate scans, error saw-wave for invalid passes).
- **Persistence**: Browser `localStorage` for ticketing database, user wallet, and gate check-in history.

---

## 2. User Usage Flow (End-to-End User Journey)

```
[Attendee Journey]
  │
  ├── 1. Browse Event Details & Schedule
  │     └── Review speakers, maker tracks, venue location, and capacity
  │
  ├── 2. Select Ticket Tier
  │     ├── Community Supporter ($25)
  │     ├── Full Access & Workshop Pass ($65) [Popular]
  │     ├── VIP Contributor & Mentor Circle ($120)
  │     └── Student & Non-Profit Grant ($10)
  │
  ├── 3. In-App Payment Checkout
  │     ├── Option A: Credit / Debit Card (Real-time formatting & CVV validation)
  │     ├── Option B: Apple Pay (1-tap simulated biometric authorization)
  │     ├── Option C: Google Pay (1-tap instant wallet checkout)
  │     ├── Option D: Instant QR / QRIS / UPI (Dynamic payment QR with 10-min timer)
  │     └── Option E: Pay at Gate (Reserve ticket now, settle at venue desk)
  │
  ├── 4. Receive Digital Pass
  │     ├── Apple Wallet-style digital badge with scannable QR Code
  │     ├── Save QR Pass as standalone SVG
  │     ├── Export .ics calendar event
  │     └── Direct print badge functionality
  │
  └── 5. Attendee Wallet ("My Passes")
        └── Store all personal passes offline for entry presentation

[Gate Operator / Organizer Journey]
  │
  ├── 1. Launch Gate Scanner Station
  │     └── Real-time capacity bar (Checked in vs Total Capacity)
  │
  ├── 2. Capture Attendee Pass
  │     ├── Method A: Live Camera Stream (environment/back camera, flip, torch)
  │     ├── Method B: Image Upload (drop screenshot or photo of QR code)
  │     ├── Method C: 1-Click Test Member Simulation
  │     └── Method D: Manual Ticket ID or Email Search
  │
  ├── 3. Verification & Access Control
  │     ├── VALID & UNCHECKED:
  │     │     ├── Plays pleasant 2-tone chime (587Hz -> 880Hz)
  │     │     ├── Displays Green "Access Authorized!" banner
  │     │     ├── Shows attendee name, photo, tier, and dietary notes
  │     │     └── Records gate timestamp in audit log
  │     ├── DUPLICATE (Already Checked In):
  │     │     ├── Plays warning dual-tone buzz
  │     │     ├── Displays Amber warning with initial check-in time & gate
  │     │     └── Option to Undo check-in or reissue badge
  │     └── INVALID / COUNTERFEIT:
  │           ├── Plays low saw-wave error tone
  │           └── Displays Red rejection banner
  │
  └── 4. Attendee Roster & Audit Feed
        ├── Filter by: All / Checked In / Pending
        ├── Search by name, ticket reference, or email
        └── Manual check-in and check-out toggle
```

---

## 3. Internal Architecture & Code Flow

```
src/
├── main.tsx                  # React 19 DOM mounting entry point
├── App.tsx                   # Central state machine & tab router
├── types.ts                  # Domain models (Event, Tiers, Tickets, Payments, Logs)
├── index.css                 # Tailwind v4 configuration & keyframe animations
├── utils/
│   └── qrCode.ts             # Mathematical QR matrix generator & Web Audio synthesizer
├── data/
│   └── mockData.ts           # Pre-registered attendees & summit itinerary
└── components/
    ├── Header.tsx            # 3-Zone Top Bar with live check-in ticker
    ├── EventOverview.tsx     # Summit hero, schedule, and capacity KPI strip
    ├── TicketTiersSection.tsx# Pass tier comparison, perks checklist & CTA
    ├── CheckoutModal.tsx     # 5-Method payment gateway & order minting
    ├── DigitalPassModal.tsx  # Wallet badge, vector QR renderer & export tools
    ├── GateScanner.tsx       # Live camera feed, barcode detection & gate audit
    └── MyTicketsView.tsx     # Personal ticket wallet & pass switcher
```

### Detailed Flow Inside the Code

#### 1. Data Models & State Hydration (`types.ts`, `App.tsx`)
- On application boot, `App.tsx` reads `localStorage` keys:
  - `opencraft_community_tickets_v1`: Master list of registered tickets.
  - `opencraft_my_tickets_v1`: Array of ticket IDs owned by the current browser session.
- If storage is uninitialized, it falls back to `INITIAL_MEMBER_TICKETS` in `mockData.ts` (ensuring immediate test attendees like Elena Rostova and Marcus Brody are available out of the box).

#### 2. QR Code Generation Algorithm (`utils/qrCode.ts`)
1. **Bitstream Packing**: Text payload (JSON string with ticket number, attendee name, and verification token) is converted to UTF-8 bytes.
2. **Mode & Length**: Prepend Byte Mode indicator (`0100`) and length byte.
3. **Padding & Termination**: Pads bitstream to byte boundary and fills up capacity with alternating `0xEC` and `0x11` bytes.
4. **Reed-Solomon Error Correction**: Computes generator polynomial $g(x) = \prod (x - \alpha^i)$ using precomputed Galois Field $GF(256)$ exponential and logarithm lookup tables. Divides data polynomial by generator polynomial to produce Error Correction (EC) codewords.
5. **Matrix Placement**:
   - Places 7x7 Finder Patterns at top-left, top-right, and bottom-left with 1-module separators.
   - Places horizontal and vertical timing patterns on row 6 and column 6.
   - Places alignment patterns for QR versions $\ge 2$.
   - Places dark module and format information bits (Level L, Mask 0 BCH encoded).
   - Writes data and EC bits in a 2-column zig-zag traversal applying mask pattern $(y + x) \pmod 2 = 0$.
6. **Vector Rendering (`generateQRCodeSVG`)**: Translates boolean matrix directly into crisp SVG `<rect>` elements inside a `<svg>` container with quiet-zone padding.

#### 3. In-App Payment State Machine (`components/CheckoutModal.tsx`)
- Tracks step transitions: `form` $\to$ `processing` $\to$ `success`.
- Supports 5 distinct payment flows:
  - `card`: Validates cardholder, formats card number into 4-digit blocks, parses `MM/YY` expiry and 3/4-digit CVC.
  - `apple_pay` & `google_pay`: Simulated 1-tap device authorization.
  - `qris_instant`: Renders a live payment QR code with an active 10-minute interval countdown (`formatTimer`) and reference copy helper.
  - `pay_at_gate`: Creates a ticket with status `pay_at_gate_reserved` for door settlement.
- Once submitted, triggers realistic processing latency, plays audio chime, mints a new `MemberTicket` with unique code (`OC26-XXX-####`), appends to master state, and persists to `localStorage`.

#### 4. Gate Scanner & Real-Time Verification (`components/GateScanner.tsx`)
- **MediaStream Loop**:
  - Requests camera with constraints `{ video: { facingMode: 'environment' } }`.
  - Attaches stream to `<video>` element.
  - Uses `requestAnimationFrame` to sample frames using `BarcodeDetector` API.
  - Includes a 2.5-second de-duplication throttle (`lastScannedPayload.current`) to prevent scanner flickering.
- **Verification Engine (`handleCheckInTicket` in `App.tsx`)**:
  - Parses QR payload or ticket reference string.
  - Searches active ticket array by `ticketNumber`, `attendeeEmail`, or verification token.
  - **Case 1 (Valid & Unchecked)**: Sets `checkedIn: true`, records `checkedInAt: ISOString` and `gateOperator`, calls `playCheckInAudio('success')`, and prepends to gate history log.
  - **Case 2 (Duplicate Entry)**: Detects `checkedIn === true`, preserves original timestamp, triggers `playCheckInAudio('warning')`, and displays alert with operator name.
  - **Case 3 (Unrecognized)**: Triggers `playCheckInAudio('error')` and logs invalid scan attempt.
- **Hardware Controls**:
  - `flipCamera`: Toggles between `'environment'` (rear camera) and `'user'` (front camera).
  - `toggleTorch`: Accesses `MediaStreamTrack.applyConstraints({ advanced: [{ torch: boolean }] })` for devices with physical flash hardware.

#### 5. Web Audio API Synthesizer (`utils/qrCode.ts`)
- Zero external audio files required. Uses Web Audio API `AudioContext`:
  - `success`: Creates a sine oscillator ramping from $587.33\text{ Hz}$ ($D_5$) to $880\text{ Hz}$ ($A_5$) with an exponential gain decay over $350\text{ms}$.
  - `warning`: Creates a triangle wave oscillator pulsing twice at $329.63\text{ Hz}$ ($E_4$).
  - `error`: Creates a sawtooth wave ramping down from $220\text{ Hz}$ to $140\text{ Hz}$.

---

## 4. Local Development & Verification

### Running the Dev Server
```bash
npm run dev
```
Runs Vite development server on `http://localhost:3000`.

### Type Checking & Linting
```bash
npm run lint
```
Executes `tsc --noEmit` to verify type safety across all components.

### Production Build
```bash
npm run build
```
Creates an optimized, tree-shaken static bundle in `/dist`.

---

## 5. Security & Privacy Highlights

- **Camera Permissions**: Camera access is requested strictly when the user activates the Gate Scanner; tracks are fully terminated when unmounting or stopping the camera.
- **Client-Side Processing**: QR decoding runs 100% locally in the browser memory using `BarcodeDetector` or canvas image data; no camera frames are sent to external servers.
- **Self-Contained QR Generator**: QR matrix calculation and error-correction polynomials execute locally with zero external tracking dependencies or unverified CDNs.
