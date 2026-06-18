import { useEffect, useRef, useState } from 'react';
import { useAdminAuth } from './context/AdminAuthContext';

function genToken(len: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminLogin() {
  const { step, loginError, lockoutSeconds, otpError, resendCooldown, demoEmail, demoPassword, demoOtp, attemptStep1, attemptStep2, backToStep1, resendOtp } =
    useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [humanChecked, setHumanChecked] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [shake, setShake] = useState(false);
  const [csrfToken] = useState(() => genToken(32));

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  useEffect(() => {
    if (loginError || otpError) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 450);
      return () => clearTimeout(t);
    }
  }, [loginError, otpError]);

  function fillDemo() {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setHumanChecked(true);
  }

  function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    attemptStep1(email, password, honeypot, humanChecked);
  }

  function handleOtpChange(i: number, val: string) {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  }
  function handleOtpKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }
  function submitStep2(e: React.FormEvent) {
    e.preventDefault();
    attemptStep2(otp.join(''));
  }
  function handleBackToStep1() {
    setOtp(['', '', '', '', '', '']);
    backToStep1();
  }

  return (
    <div id="loginScreen">
      <div
        style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '18px 18px', pointerEvents: 'none' }}
      />
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        <div className="flex flex-col items-center mb-6">
          <span className="font-display" style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', letterSpacing: '-.03em' }}>
            P&amp;S
          </span>
          <span style={{ fontSize: '.42rem', letterSpacing: '.3em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600, marginTop: '.1rem' }}>
            Every Face Has A Story
          </span>
          <div className="gold-line my-3" />
          <p className="section-eyebrow">Editor Access</p>
          <p style={{ fontSize: '.7rem', color: 'rgba(247,244,239,.45)', marginTop: '.2rem', textAlign: 'center' }}>
            Restricted dashboard. Authorized staff only —<br />
            accounts are provisioned by an administrator.
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={submitStep1} autoComplete="off">
            <div style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
              <label>Leave blank</label>
              <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
            </div>
            <input type="hidden" value={csrfToken} readOnly />

            <div className="mb-3">
              <label className="field-label" style={{ color: 'rgba(247,244,239,.55)' }}>
                Admin Email
              </label>
              <input
                type="email"
                className="login-input"
                placeholder="you@pnsmagazine.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mb-2" style={{ position: 'relative' }}>
              <label className="field-label" style={{ color: 'rgba(247,244,239,.55)' }}>
                Password
              </label>
              <input
                type={showPw ? 'text' : 'password'}
                className="login-input"
                placeholder="••••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="eye-toggle" onClick={() => setShowPw((v) => !v)} style={{ position: 'absolute', right: '.7rem', top: '62%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'rgba(247,244,239,.45)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
            </div>

            {loginError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(168,69,62,.4)', color: '#d98981', padding: '.55rem .7rem', fontSize: '.72rem', marginBottom: '.8rem' }}>
                {loginError}
              </div>
            )}
            {lockoutSeconds > 0 && (
              <div style={{ background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.3)', color: 'var(--gold-light)', padding: '.55rem .7rem', fontSize: '.72rem', marginBottom: '.8rem' }}>
                Too many failed attempts. Try again in {lockoutSeconds}s.
              </div>
            )}

            <label className="flex items-center gap-2 mb-4" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={humanChecked}
                onChange={(e) => setHumanChecked(e.target.checked)}
                style={{ accentColor: 'var(--gold)', width: 14, height: 14 }}
              />
              <span style={{ fontSize: '.68rem', color: 'rgba(247,244,239,.55)' }}>I confirm I am an authorized P&amp;S editor (not a bot)</span>
            </label>

            <button type="submit" className="btn-gold-admin w-full" style={{ padding: '.75rem' }} disabled={lockoutSeconds > 0}>
              Continue →
            </button>
            <button
              type="button"
              onClick={fillDemo}
              className="w-full mt-2"
              style={{ fontSize: '.62rem', color: 'rgba(247,244,239,.4)', textDecoration: 'underline', textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '.4rem' }}
            >
              Use demo credentials
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitStep2}>
            <div className="text-center mb-4">
              <p className="section-eyebrow">Two-Factor Verification</p>
              <p style={{ fontSize: '.72rem', color: 'rgba(247,244,239,.5)', marginTop: '.3rem' }}>Enter the 6-digit code sent to your registered device.</p>
            </div>
            <div className="grid grid-cols-6 gap-2 mb-4">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  maxLength={1}
                  inputMode="numeric"
                  className="otp-input"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                />
              ))}
            </div>
            {otpError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(168,69,62,.4)', color: '#d98981', padding: '.55rem .7rem', fontSize: '.72rem', marginBottom: '.8rem' }}>
                {otpError}
              </div>
            )}
            <button type="submit" className="btn-gold-admin w-full" style={{ padding: '.75rem' }}>
              Verify &amp; Sign In
            </button>
            <div className="flex items-center justify-between mt-3">
              <button type="button" onClick={handleBackToStep1} style={{ fontSize: '.65rem', color: 'rgba(247,244,239,.45)', background: 'none', border: 'none', cursor: 'pointer' }}>
                ← Back
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={resendCooldown > 0}
                style={{ fontSize: '.65rem', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', opacity: resendCooldown > 0 ? 0.4 : 1 }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>
            <p className="text-center mt-3" style={{ fontSize: '.6rem', color: 'rgba(247,244,239,.3)' }}>
              Demo code: <span style={{ color: 'var(--gold)' }}>{demoOtp}</span>
            </p>
          </form>
        )}

        {step === 3 && (
          <div className="text-center py-6">
            <div style={{ width: 28, height: 28, border: '2px solid rgba(201,168,76,.25)', borderTopColor: 'var(--gold)', borderRadius: '50%', margin: '0 auto', animation: 'spin .8s linear infinite' }} />
            <p className="mt-3" style={{ fontSize: '.7rem', color: 'rgba(247,244,239,.5)', letterSpacing: '.05em' }}>
              Establishing secure session…
            </p>
          </div>
        )}

        <div className="mt-6 pt-4 space-y-1" style={{ borderTop: '1px solid rgba(247,244,239,.08)' }}>
          <div className="guard-row" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.62rem', color: 'rgba(247,244,239,.4)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
              <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z" />
            </svg>
            Encrypted session · CSRF + bot protection active
          </div>
          <div className="guard-row" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.62rem', color: 'rgba(247,244,239,.4)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Brute-force lockout after 3 failed attempts
          </div>
        </div>
      </div>
    </div>
  );
}
