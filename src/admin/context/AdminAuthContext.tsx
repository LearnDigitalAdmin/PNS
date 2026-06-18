import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useAdminData } from './AdminDataContext';

const DEMO_EMAIL = 'editor@pnsmagazine.com';
const DEMO_PASSWORD = 'PnSEditor#2026';
const DEMO_OTP = '482913';
const SESSION_LIMIT_MS = 20 * 60 * 1000; // 20 min idle timeout
const WARNING_BEFORE_MS = 60 * 1000;

export type LoginStep = 1 | 2 | 3;

interface AdminAuthValue {
  isAuthenticated: boolean;
  step: LoginStep;
  loginError: string | null;
  lockoutSeconds: number;
  otpError: string | null;
  resendCooldown: number;
  sessionWarningOpen: boolean;
  sessionCountdown: number;
  demoEmail: string;
  demoPassword: string;
  demoOtp: string;
  attemptStep1: (email: string, password: string, honeypot: string, humanChecked: boolean) => void;
  attemptStep2: (code: string) => void;
  backToStep1: () => void;
  resendOtp: () => void;
  logout: () => void;
  staySignedIn: () => void;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const { logLoginAttempt, logActivity, showToast } = useAdminData();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [step, setStep] = useState<LoginStep>(1);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const failedAttemptsRef = useRef(0);
  const pendingEmailRef = useRef('');

  // ---- lockout countdown ----
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const t = setTimeout(() => setLockoutSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [lockoutSeconds]);

  // ---- resend cooldown countdown ----
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const attemptStep1 = useCallback(
    (email: string, password: string, honeypot: string, humanChecked: boolean) => {
      setLoginError(null);

      // honeypot — a real user never fills this hidden field
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
      if (normalizedEmail === DEMO_EMAIL && password === DEMO_PASSWORD) {
        failedAttemptsRef.current = 0;
        pendingEmailRef.current = normalizedEmail;
        setStep(2);
      } else {
        failedAttemptsRef.current += 1;
        if (failedAttemptsRef.current >= 3) {
          logLoginAttempt(normalizedEmail, 'blocked', 'repeated failed attempts');
          setLockoutSeconds(30);
        } else {
          setLoginError(`Incorrect email or password. ${3 - failedAttemptsRef.current} attempt(s) remaining before temporary lockout.`);
        }
      }
    },
    [lockoutSeconds, logLoginAttempt]
  );

  const attemptStep2 = useCallback(
    (code: string) => {
      setOtpError(null);
      if (code.length !== 6) {
        setOtpError('Please enter the full 6-digit code.');
        return;
      }
      if (code !== DEMO_OTP) {
        setOtpError('Incorrect code. Please try again.');
        return;
      }
      setStep(3);
      logLoginAttempt(pendingEmailRef.current, 'success', 'Chrome · macOS (this device)');
      setTimeout(() => {
        setIsAuthenticated(true);
      }, 1100);
    },
    [logLoginAttempt]
  );

  const backToStep1 = useCallback(() => {
    setStep(1);
    setOtpError(null);
  }, []);

  const resendOtp = useCallback(() => {
    if (resendCooldown > 0) return;
    setResendCooldown(30);
    showToast('A new verification code has been sent', 'success');
  }, [resendCooldown, showToast]);

  // ---- idle session timeout ----
  const [sessionWarningOpen, setSessionWarningOpen] = useState(false);
  const [sessionCountdown, setSessionCountdown] = useState(60);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout>>();
  const warningTimer = useRef<ReturnType<typeof setTimeout>>();
  const countdownInterval = useRef<ReturnType<typeof setInterval>>();

  const logout = useCallback(
    (silent?: boolean) => {
      setIsAuthenticated(false);
      setStep(1);
      setOtpError(null);
      setLoginError(null);
      setSessionWarningOpen(false);
      clearTimeout(inactivityTimer.current);
      clearTimeout(warningTimer.current);
      clearInterval(countdownInterval.current);
      if (!silent) showToast('Signed out', 'info');
    },
    [showToast]
  );

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
    step,
    loginError,
    lockoutSeconds,
    otpError,
    resendCooldown,
    sessionWarningOpen,
    sessionCountdown,
    demoEmail: DEMO_EMAIL,
    demoPassword: DEMO_PASSWORD,
    demoOtp: DEMO_OTP,
    attemptStep1,
    attemptStep2,
    backToStep1,
    resendOtp,
    logout: () => logout(false),
    staySignedIn,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
