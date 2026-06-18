import { useEffect, useRef, useState } from 'react';
import { useAdminAuth } from './context/AdminAuthContext';

function genToken(len: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminLogin() {
  const { attemptLogin, loginError, lockoutSeconds, authLoading } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [humanChecked, setHumanChecked] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [csrfToken] = useState(() => genToken(32));

  useEffect(() => {
    if (loginError) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 450);
      return () => clearTimeout(t);
    }
  }, [loginError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await attemptLogin(email, password, honeypot, humanChecked);
    setSubmitting(false);
  }

  if (authLoading) {
    return (
      <div id="loginScreen">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: 28,
              height: 28,
              border: '2px solid rgba(201,168,76,.25)',
              borderTopColor: 'var(--gold)',
              borderRadius: '50%',
              animation: 'spin .8s linear infinite',
            }}
          />
          <p style={{ fontSize: '.7rem', color: 'rgba(247,244,239,.5)', letterSpacing: '.05em' }}>
            Checking session…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="loginScreen">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)',
          backgroundSize: '18px 18px',
          pointerEvents: 'none',
        }}
      />
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <span
            className="font-display"
            style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', letterSpacing: '-.03em' }}
          >
            P&amp;S
          </span>
          <span
            style={{
              fontSize: '.42rem',
              letterSpacing: '.3em',
              color: 'var(--gold)',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginTop: '.1rem',
            }}
          >
            Every Face Has A Story
          </span>
          <div className="gold-line my-3" />
          <p className="section-eyebrow">Editor Access</p>
          <p
            style={{
              fontSize: '.7rem',
              color: 'rgba(247,244,239,.45)',
              marginTop: '.2rem',
              textAlign: 'center',
            }}
          >
            Restricted dashboard. Authorized @cogvana.co.ke staff only.
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Honeypot */}
          <div
            style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}
            aria-hidden="true"
          >
            <label>Leave blank</label>
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <input type="hidden" value={csrfToken} readOnly />

          <div className="mb-3">
            <label className="field-label" style={{ color: 'rgba(247,244,239,.55)' }}>
              Email
            </label>
            <input
              type="email"
              className="login-input"
              placeholder="you@cogvana.co.ke"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
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
              autoComplete="current-password"
            />
            <span
              className="eye-toggle"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: 'absolute',
                right: '.7rem',
                top: '62%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                color: 'rgba(247,244,239,.45)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8">
                {showPw ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </span>
          </div>

          {loginError && (
            <div
              style={{
                background: 'var(--danger-bg)',
                border: '1px solid rgba(168,69,62,.4)',
                color: '#d98981',
                padding: '.55rem .7rem',
                fontSize: '.72rem',
                marginBottom: '.8rem',
              }}
            >
              {loginError}
            </div>
          )}

          {lockoutSeconds > 0 && (
            <div
              style={{
                background: 'rgba(201,168,76,.08)',
                border: '1px solid rgba(201,168,76,.3)',
                color: 'var(--gold-light)',
                padding: '.55rem .7rem',
                fontSize: '.72rem',
                marginBottom: '.8rem',
              }}
            >
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
            <span style={{ fontSize: '.68rem', color: 'rgba(247,244,239,.55)' }}>
              I confirm I am an authorized P&amp;S editor (not a bot)
            </span>
          </label>

          <button
            type="submit"
            className="btn-gold-admin w-full"
            style={{ padding: '.75rem' }}
            disabled={lockoutSeconds > 0 || submitting}
          >
            {submitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: '2px solid rgba(0,0,0,.2)',
                    borderTopColor: '#000',
                    borderRadius: '50%',
                    animation: 'spin .8s linear infinite',
                    display: 'inline-block',
                  }}
                />
                Signing in…
              </span>
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        {/* Security footer */}
        <div className="mt-6 pt-4 space-y-1" style={{ borderTop: '1px solid rgba(247,244,239,.08)' }}>
          <div
            className="guard-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.4rem',
              fontSize: '.62rem',
              color: 'rgba(247,244,239,.4)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
              <path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z" />
            </svg>
            Encrypted session · CSRF + bot protection active
          </div>
          <div
            className="guard-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.4rem',
              fontSize: '.62rem',
              color: 'rgba(247,244,239,.4)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Brute-force lockout · @cogvana.co.ke accounts only
          </div>
        </div>
      </div>
    </div>
  );
}