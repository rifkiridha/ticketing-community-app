export type PaymentMethodType =
  | 'card'
  | 'apple_pay'
  | 'google_pay'
  | 'qris_instant'
  | 'bank_transfer'
  | 'pay_at_gate';

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  perks: string[];
  remaining: number;
  badge: string;
  badgeStyle: string;
  isPopular?: boolean;
}

export interface CommunityEvent {
  id: string;
  title: string;
  tagline: string;
  edition: string;
  date: string;
  time: string;
  venueName: string;
  venueAddress: string;
  city: string;
  description: string;
  capacity: number;
  bannerImage: string;
  showcaseImage: string;
  organizer: {
    name: string;
    avatar: string;
    role: string;
    email: string;
  };
  highlights: {
    title: string;
    desc: string;
    icon: string;
  }[];
  schedule: {
    time: string;
    activity: string;
    speaker?: string;
    room: string;
  }[];
}

export interface MemberTicket {
  id: string;
  ticketNumber: string;
  eventId: string;
  eventTitle: string;
  attendeeName: string;
  attendeeEmail: string;
  organization?: string;
  role?: string;
  tierId: string;
  tierName: string;
  pricePaid: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  paymentStatus: 'paid' | 'pay_at_gate_reserved';
  paymentReference: string;
  purchaseDate: string;
  checkedIn: boolean;
  checkedInAt?: string;
  gateOperator?: string;
  qrPayload: string;
  notes?: string;
}

export interface CheckInLogEntry {
  id: string;
  ticketId: string;
  attendeeName: string;
  tierName: string;
  timestamp: string;
  type: 'success' | 'already_checked' | 'invalid';
  message: string;
}
