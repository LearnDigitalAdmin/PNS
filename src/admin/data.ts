import type { Guard, RequestsState } from './types';

let uid = 1;
const nid = () => uid++;

export const GUARDS: Guard[] = [
  { label: 'Brute-force lockout', desc: '3 failed logins triggers a 30-second cooldown' },
  { label: 'Two-factor authentication', desc: 'Required on every admin login, no exceptions' },
  { label: 'CSRF token verification', desc: 'Every form submission checked against a session token' },
  { label: 'Honeypot bot traps', desc: 'Hidden fields on public forms catch automated submissions' },
  { label: 'Input sanitization', desc: 'All content is validated and escaped before writing to Firestore' },
  { label: 'Firestore security rules', desc: 'Writes restricted server-side to authenticated @cogvana.co.ke editors' },
  { label: 'Session auto-timeout', desc: 'Idle sessions are signed out automatically' },
  { label: 'Full audit logging', desc: 'Every create, edit, approval, and deletion is recorded' },
];

export const REQUEST_TYPE_LABELS: Record<keyof RequestsState, string> = {
  featured: 'Featured Applications',
  booking: 'Booking Requests',
  sponsored: 'Sponsored Inquiries',
  partnership: 'Partnership Applications',
  mediaKit: 'Media Kit Requests',
};

export const nextId = nid;