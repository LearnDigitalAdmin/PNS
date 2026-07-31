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
import {
  DEFAULT_PHOTOGRAPHER_STORAGE_CAP_BYTES,
  type PhotographerProfile,
} from '../types';

type AuthStep = 'idle' | 'loading' | 'awaiting-otp' | 'authenticated';

interface PhotographerAuthValue {
  currentUser: User | null;
  profile: PhotographerProfile | null;
  authLoading: boolean;
  step: AuthStep;
  authError: string | null;
  // Google
  signInWithGoogle: () => Promise<void>;
  // Phone — two-step: request code, then confirm it
  requestPhoneCode: (phoneE164: string, recaptchaContainerId: string) => Promise<void>;
  confirmPhoneCode: (code: string) => Promise<void>;
  // Shared
  logout: () => Promise<void>;
  // Convenience: true once photographers/{uid}.profileComplete === true
  needsProfileCompletion: boolean;
}

const PhotographerAuthContext = createContext<PhotographerAuthValue | null>(null);

export function PhotographerAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PhotographerProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [step, setStep] = useState<AuthStep>('idle');

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // ---- provision the photographer doc on first sign-in if it doesn't exist ----
  const ensurePhotographerDoc = useCallback(
    async (user: User, authProvider: 'google' | 'phone') => {
      const ref = doc(db, 'photographers', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) return;

      const draft: Omit<PhotographerProfile, 'createdAt'> & { createdAt: unknown } = {
        uid: user.uid,
        authProvider,
        businessName: '',
        ownerName: user.displayName ?? '',
        email: user.email ?? undefined,
        phone: user.phoneNumber ?? '',
        county: '',
        bio: '',
        categories: [],
        services: [],
        status: 'active',
        verified: false,
        likesCount: 0,
        storageUsedBytes: 0,
        storageCapBytes: DEFAULT_PHOTOGRAPHER_STORAGE_CAP_BYTES,
        profileComplete: false,
        payoutSetupComplete: false,
        createdAt: serverTimestamp(),
      };
      await setDoc(ref, draft);
    },
    []
  );

  // ---- auth state listener ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) setStep('authenticated');
    });
    return unsub;
  }, []);

  // ---- live profile listener, once we have a user ----
  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      return;
    }
    const ref = doc(db, 'photographers', currentUser.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setProfile(snap.data() as PhotographerProfile);
    });
    return unsub;
  }, [currentUser]);

  // ---- Google sign-in ----
  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setStep('loading');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensurePhotographerDoc(result.user, 'google');
      setStep('authenticated');
    } catch (err: any) {
      setStep('idle');
      setAuthError(err.message ?? 'Google sign-in failed. Please try again.');
    }
  }, [ensurePhotographerDoc]);

  // ---- phone sign-in: step 1, send the OTP ----
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

  // ---- phone sign-in: step 2, confirm the OTP ----
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
        await ensurePhotographerDoc(result.user, 'phone');
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
    [ensurePhotographerDoc]
  );

  // ---- logout ----
  const logout = useCallback(async () => {
    await signOut(auth);
    confirmationRef.current = null;
    setStep('idle');
  }, []);

  const needsProfileCompletion = !!currentUser && !!profile && !profile.profileComplete;

  const value: PhotographerAuthValue = {
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
    <PhotographerAuthContext.Provider value={value}>
      {children}
      {/* Invisible reCAPTCHA anchor for phone auth — must stay mounted */}
      <div id="phone-recaptcha-container" />
    </PhotographerAuthContext.Provider>
  );
}

export function usePhotographerAuth() {
  const ctx = useContext(PhotographerAuthContext);
  if (!ctx) throw new Error('usePhotographerAuth must be used within PhotographerAuthProvider');
  return ctx;
}
