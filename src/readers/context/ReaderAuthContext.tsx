import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react';
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  type User,
  type ConfirmationResult,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { DEFAULT_READER_STORAGE_CAP_BYTES, type ReaderProfile } from '../types';

type AuthStep = 'idle' | 'loading' | 'awaiting-otp' | 'authenticated';

interface ReaderAuthValue {
  currentUser: User | null;
  profile: ReaderProfile | null;
  authLoading: boolean;
  step: AuthStep;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  requestPhoneCode: (phoneE164: string, recaptchaContainerId: string) => Promise<void>;
  confirmPhoneCode: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  needsProfileCompletion: boolean;
}

const ReaderAuthContext = createContext<ReaderAuthValue | null>(null);

// NOTE: this shares the same Firebase Auth instance as photographers/admin
// (one Firebase project, differentiated by which Firestore collection the
// uid's profile doc lives in — not by separate auth pools). A given uid is
// only ever provisioned into one of photographers/readers in normal use.
export function ReaderAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ReaderProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [step, setStep] = useState<AuthStep>('idle');

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const ensureReaderDoc = useCallback(async (user: User, authProvider: 'google' | 'phone') => {
    const ref = doc(db, 'readers', user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return;

    // Referral capture: ?ref=<referring reader's uid> in the URL at the
    // moment they land on the site. This only matters on first account
    // creation — read it fresh here rather than threading it through props,
    // so any entry point (Nav link, voting page, wherever) works the same.
    const params = new URLSearchParams(window.location.search);
    const referredBy = params.get('ref');

    const draft: Omit<ReaderProfile, 'createdAt'> & { createdAt: unknown } = {
      uid: user.uid,
      authProvider,
      displayName: user.displayName ?? '',
      email: user.email ?? undefined,
      phone: user.phoneNumber ?? '',
      storageUsedBytes: 0,
      storageCapBytes: DEFAULT_READER_STORAGE_CAP_BYTES,
      profileComplete: false,
      voteStreak: 0,
      referralCount: 0,
      ...(referredBy && referredBy !== user.uid ? { referredBy } : {}),
      createdAt: serverTimestamp(),
    };
    await setDoc(ref, draft);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) setStep('authenticated');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      return;
    }
    const ref = doc(db, 'readers', currentUser.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setProfile(snap.data() as ReaderProfile);
    });
    return unsub;
  }, [currentUser]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setStep('loading');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureReaderDoc(result.user, 'google');
      setStep('authenticated');
    } catch (err: any) {
      setStep('idle');
      setAuthError(err.message ?? 'Google sign-in failed. Please try again.');
    }
  }, [ensureReaderDoc]);

  const requestPhoneCode = useCallback(
    async (phoneE164: string, recaptchaContainerId: string) => {
      setAuthError(null);
      setStep('loading');
      try {
        if (!recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerId, {
            size: 'invisible',
          });
        }
        const confirmation = await signInWithPhoneNumber(
          auth,
          phoneE164,
          recaptchaVerifierRef.current
        );
        confirmationRef.current = confirmation;
        setStep('awaiting-otp');
      } catch (err: any) {
        setStep('idle');
        setAuthError(
          err.code === 'auth/invalid-phone-number'
            ? 'Enter a valid phone number, including country code (e.g. +2547...).'
            : err.message ?? 'Could not send the code. Please try again.'
        );
      }
    },
    []
  );

  const confirmPhoneCode = useCallback(
    async (code: string) => {
      setAuthError(null);
      if (!confirmationRef.current) {
        setAuthError('Request a new code and try again.');
        return;
      }
      setStep('loading');
      try {
        const result = await confirmationRef.current.confirm(code);
        await ensureReaderDoc(result.user, 'phone');
        setStep('authenticated');
      } catch (err: any) {
        setStep('awaiting-otp');
        setAuthError(
          err.code === 'auth/invalid-verification-code'
            ? 'That code is incorrect. Please try again.'
            : err.message ?? 'Verification failed. Please try again.'
        );
      }
    },
    [ensureReaderDoc]
  );

  const logout = useCallback(async () => {
    await signOut(auth);
    confirmationRef.current = null;
    setStep('idle');
  }, []);

  const needsProfileCompletion = !!currentUser && !!profile && !profile.profileComplete;

  const value: ReaderAuthValue = {
    currentUser,
    profile,
    authLoading,
    step,
    authError,
    signInWithGoogle,
    requestPhoneCode,
    confirmPhoneCode,
    logout,
    needsProfileCompletion,
  };

  return (
    <ReaderAuthContext.Provider value={value}>
      {children}
      <div id="reader-phone-recaptcha-container" />
    </ReaderAuthContext.Provider>
  );
}

export function useReaderAuth() {
  const ctx = useContext(ReaderAuthContext);
  if (!ctx) throw new Error('useReaderAuth must be used within ReaderAuthProvider');
  return ctx;
}
