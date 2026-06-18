import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAdminData } from './AdminDataContext';

const ALLOWED_DOMAIN = 'cogvana.co.ke';
const SESSION_LIMIT_MS = 20 * 60 * 1000; // 20 min idle
const WARNING_BEFORE_MS = 60 * 1000;

export type LoginStep = 'idle' | 'loading' | 'authenticated';

interface AdminAuthValue {
  isAuthenticated: boolean;
  authLoading: boolean;
  step: LoginStep;
  loginError: string | null;
  lockoutSeconds: number;
  sessionWarningOpen: boolean;
  sessionCountdown: number;
  attemptLogin: (email: string, password: string, honeypot: string, humanChecked: boolean) => Promise<void>;
  logout: () => Promise<void>;
  staySignedIn: () => void;
  currentUser: User | null;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const { logLoginAttempt, logActivity, showToast } = useAdminData();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const failedAttemptsRef = useRef(0);

  // ---- lockout countdown ----
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const t = setTimeout(() => setLockoutSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [lockoutSeconds]);

  // ---- Firebase auth state listener ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const domain = user.email?.split('@')[1];
        if (domain !== ALLOWED_DOMAIN) {
          // signed-in with wrong domain — sign them out immediately
          signOut(auth);
          setCurrentUser(null);
        } else {
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const isAuthenticated = !!currentUser;
  const step: LoginStep = authLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'idle';

  // ---- login ----
  const attemptLogin = useCallback(
    async (email: string, password: string, honeypot: string, humanChecked: boolean) => {
      setLoginError(null);

      if (honeypot.trim() !== '') {
        setLoginError('Something went wrong. Please try again.');
        logLoginAttempt('—', 'blocked', 'bot signature — honeypot triggered');
        return;
      }
      if (lockoutSeconds > 0) return;
      if (!humanChecked) {
        setLoginError('Please confirm you are an authorized editor.');
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const domain = normalizedEmail.split('@')[1];

      if (domain !== ALLOWED_DOMAIN) {
        setLoginError(`Access is restricted to @${ALLOWED_DOMAIN} accounts.`);
        logLoginAttempt(normalizedEmail, 'blocked', 'unauthorized domain');
        return;
      }

      try {
        const result = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        failedAttemptsRef.current = 0;
        logLoginAttempt(result.user.email ?? normalizedEmail, 'success', 'Browser login');
        logActivity(`${result.user.email} signed in`, 'security');
        showToast('Welcome back', 'success');
      } catch (err: any) {
        failedAttemptsRef.current += 1;
        if (failedAttemptsRef.current >= 3) {
          logLoginAttempt(normalizedEmail, 'blocked', 'repeated failed attempts');
          setLockoutSeconds(30);
          setLoginError('Too many failed attempts. Please wait 30 seconds.');
        } else {
          const remaining = 3 - failedAttemptsRef.current;
          if (
            err.code === 'auth/user-not-found' ||
            err.code === 'auth/wrong-password' ||
            err.code === 'auth/invalid-credential'
          ) {
            setLoginError(`Incorrect email or password. ${remaining} attempt(s) remaining.`);
          } else if (err.code === 'auth/too-many-requests') {
            setLoginError('Too many attempts. Your account has been temporarily locked by Firebase. Try again later.');
            setLockoutSeconds(60);
          } else {
            setLoginError(err.message ?? 'Login failed. Please try again.');
          }
          logLoginAttempt(normalizedEmail, 'blocked', err.code ?? 'unknown error');
        }
      }
    },
    [lockoutSeconds, logLoginAttempt, logActivity, showToast]
  );

  // ---- logout ----
  const logout = useCallback(
    async (silent?: boolean) => {
      await signOut(auth);
      setLoginError(null);
      setSessionWarningOpen(false);
      clearTimeout(inactivityTimer.current);
      clearTimeout(warningTimer.current);
      clearInterval(countdownInterval.current);
      if (!silent) showToast('Signed out', 'info');
    },
    [showToast]
  );

  // ---- idle session timeout ----
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false);
  const [sessionCountdown, setSessionCountdown] = useState(60);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout>>();
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();
  const countdownInterval = useRef<ReturnType<typeof setInterval>>();

  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    clearTimeout(warningTimer.current);
    clearInterval(countdownInterval.current);
    setSessionWarningOpen(false);
    if (!isAuthenticated) return;
    warningTimer.current = setTimeout(() => {
      setSessionWarningOpen(true);
      let remaining = Math.floor(WARNING_BEFORE_MS / 1000);
      setSessionCountdown(remaining);
      countdownInterval.current = setInterval(() => {
        remaining -= 1;
        setSessionCountdown(remaining);
        if (remaining <= 0) clearInterval(countdownInterval.current);
      }, 1000);
    }, SESSION_LIMIT_MS - WARNING_BEFORE_MS);
    inactivityTimer.current = setTimeout(() => {
      logActivity('Session expired due to inactivity', 'security');
      logout(true);
    }, SESSION_LIMIT_MS);
  }, [isAuthenticated, logActivity, logout]);

  const staySignedIn = useCallback(() => {
    resetInactivityTimer();
    showToast('Session extended', 'success');
  }, [resetInactivityTimer, showToast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    resetInactivityTimer();
    const handler = () => resetInactivityTimer();
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((ev) => document.addEventListener(ev, handler, { passive: true }));
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handler));
      clearTimeout(inactivityTimer.current);
      clearTimeout(warningTimer.current);
      clearInterval(countdownInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const value: AdminAuthValue = {
    isAuthenticated,
    authLoading,
    step,
    loginError,
    lockoutSeconds,
    sessionWarningOpen,
    sessionCountdown,
    attemptLogin,
    logout: () => logout(false),
    staySignedIn,
    currentUser,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}