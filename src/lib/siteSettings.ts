import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_DOC = doc(db, 'siteSettings', 'general');

export interface SocialLink {
  label: string;
  url: string;
}

export interface SiteSettings {
  tickerMessages: string[];
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
  socialLinks: SocialLink[];
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  tickerMessages: [
    'Welcome to P&S Magazine',
    'Voting Arena Open — Cast Your Vote Now',
  ],
  contactEmail: 'hello@pandsmag.co.ke',
  contactPhone: '+254 700 000 000',
  contactLocation: 'Westlands, Nairobi, Kenya',
  socialLinks: [
    { label: 'Instagram', url: '#' },
    { label: 'TikTok', url: '#' },
    { label: 'Facebook', url: '#' },
    { label: 'X', url: '#' },
  ],
};

export function subscribeSiteSettings(onChange: (s: SiteSettings) => void): Unsubscribe {
  return onSnapshot(SETTINGS_DOC, (snap) => {
    if (!snap.exists()) {
      onChange(DEFAULT_SITE_SETTINGS);
      return;
    }
    const data = snap.data();
    onChange({
      tickerMessages: data.tickerMessages ?? DEFAULT_SITE_SETTINGS.tickerMessages,
      contactEmail: data.contactEmail ?? DEFAULT_SITE_SETTINGS.contactEmail,
      contactPhone: data.contactPhone ?? DEFAULT_SITE_SETTINGS.contactPhone,
      contactLocation: data.contactLocation ?? DEFAULT_SITE_SETTINGS.contactLocation,
      socialLinks: data.socialLinks ?? DEFAULT_SITE_SETTINGS.socialLinks,
    });
  });
}

export async function ensureSiteSettingsDoc(): Promise<void> {
  const snap = await getDoc(SETTINGS_DOC);
  if (!snap.exists()) await setDoc(SETTINGS_DOC, DEFAULT_SITE_SETTINGS);
}

export async function addTickerMessage(msg: string): Promise<void> {
  const snap = await getDoc(SETTINGS_DOC);
  const current: string[] = snap.exists() ? (snap.data().tickerMessages ?? []) : [];
  await setDoc(
    SETTINGS_DOC,
    { ...(snap.exists() ? snap.data() : DEFAULT_SITE_SETTINGS), tickerMessages: [...current, msg] },
    { merge: true }
  );
}

export async function removeTickerMessageAt(idx: number, currentMessages: string[]): Promise<void> {
  const next = currentMessages.filter((_, i) => i !== idx);
  await updateDoc(SETTINGS_DOC, { tickerMessages: next });
}

export async function updateContactInfo(
  payload: Partial<Pick<SiteSettings, 'contactEmail' | 'contactPhone' | 'contactLocation' | 'socialLinks'>>
): Promise<void> {
  await setDoc(SETTINGS_DOC, payload, { merge: true });
}