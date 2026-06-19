/**
 * fingerprint.ts
 * Modular browser fingerprinting for anonymous rate-limiting.
 * Used by: voting system, request forms (one per category per 24 hrs).
 *
 * Strategy: combines stable browser signals into a hash, then stores
 * action records in localStorage + a session cookie so both clearing
 * one or the other still catches repeat offenders.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionKey =
  | 'vote_lady'
  | 'vote_man'
  | 'vote_couple'
  | 'vote_photo'
  | 'vote_fashion'
  | 'req_featured'
  | 'req_booking'
  | 'req_sponsored'
  | 'req_partnership'
  | 'req_mediaKit';

interface ActionRecord {
  ts: number; // epoch ms
  fp: string; // fingerprint hash at time of action
}

// ─── Fingerprint generation ───────────────────────────────────────────────────

function hashString(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function getCanvasFingerprint(): string {
  try {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    if (!ctx) return 'nocanvas';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('P&S🎨', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('P&S🎨', 4, 17);
    return c.toDataURL().slice(-40);
  } catch {
    return 'nocanvas';
  }
}

function getWebGLFingerprint(): string {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return 'nowebgl';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (!dbg) return 'nodbg';
    return [
      gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL),
      gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL),
    ].join('|');
  } catch {
    return 'nowebgl';
  }
}

function getAudioFingerprint(): string {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const analyser = ctx.createAnalyser();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(analyser);
    analyser.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    const buf = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(buf);
    osc.stop();
    ctx.close();
    return buf.slice(0, 5).join(',');
  } catch {
    return 'noaudio';
  }
}

export async function generateFingerprint(): Promise<string> {
  const signals: string[] = [
    navigator.userAgent,
    navigator.language,
    String(navigator.hardwareConcurrency ?? ''),
    String((navigator as any).deviceMemory ?? ''),
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(new Date().getTimezoneOffset()),
    navigator.platform ?? '',
    String((navigator as any).maxTouchPoints ?? 0),
    getCanvasFingerprint(),
    getWebGLFingerprint(),
    getAudioFingerprint(),
    // installed fonts probe (basic)
    (() => {
      const baseFonts = ['monospace', 'sans-serif', 'serif'];
      const testFonts = ['Arial', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Verdana'];
      const el = document.createElement('span');
      el.style.cssText = 'position:absolute;visibility:hidden;font-size:72px';
      el.innerText = 'mmmWWWlll';
      document.body.appendChild(el);
      const base = baseFonts.map((f) => { el.style.fontFamily = f; return el.offsetWidth + 'x' + el.offsetHeight; });
      const result = testFonts.map((f, i) => {
        el.style.fontFamily = `"${f}",${baseFonts[i % baseFonts.length]}`;
        return String(el.offsetWidth + 'x' + el.offsetHeight !== base[i % baseFonts.length]);
      }).join('');
      document.body.removeChild(el);
      return result;
    })(),
  ];

  return hashString(signals.join('||'));
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const LS_KEY = 'ps_fp_actions';
const COOKIE_PREFIX = 'ps_fp_';
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function readLS(): Record<string, ActionRecord> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeLS(data: Record<string, ActionRecord>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

function setCookie(key: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${key}=${encodeURIComponent(value)};max-age=${maxAgeSeconds};path=/;SameSite=Strict`;
}

function getCookie(key: string): string | null {
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(key + '='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check if the current browser is allowed to perform `action`.
 * Returns true if allowed, false if rate-limited.
 */
export async function canPerformAction(action: ActionKey): Promise<boolean> {
  const fp = await generateFingerprint();
  const now = Date.now();

  // Check localStorage
  const lsData = readLS();
  const lsRecord = lsData[action];
  if (lsRecord && now - lsRecord.ts < WINDOW_MS) return false;

  // Check cookie (secondary gate)
  const cookieKey = COOKIE_PREFIX + action;
  const cookieVal = getCookie(cookieKey);
  if (cookieVal) {
    try {
      const rec: ActionRecord = JSON.parse(cookieVal);
      if (now - rec.ts < WINDOW_MS) return false;
    } catch {}
  }

  return true;
}

/**
 * Record that the current browser performed `action` now.
 */
export async function recordAction(action: ActionKey): Promise<void> {
  const fp = await generateFingerprint();
  const record: ActionRecord = { ts: Date.now(), fp };

  // Write to localStorage
  const lsData = readLS();
  lsData[action] = record;
  writeLS(lsData);

  // Write cookie (24 h)
  const cookieKey = COOKIE_PREFIX + action;
  setCookie(cookieKey, JSON.stringify(record), 86400);
}

/**
 * How many milliseconds remain until the action window resets.
 * Returns 0 if not limited.
 */
export async function msUntilReset(action: ActionKey): Promise<number> {
  const now = Date.now();
  const lsData = readLS();
  const lsRecord = lsData[action];

  if (lsRecord) {
    const remaining = WINDOW_MS - (now - lsRecord.ts);
    if (remaining > 0) return remaining;
  }

  const cookieKey = COOKIE_PREFIX + action;
  const cookieVal = getCookie(cookieKey);
  if (cookieVal) {
    try {
      const rec: ActionRecord = JSON.parse(cookieVal);
      const remaining = WINDOW_MS - (now - rec.ts);
      if (remaining > 0) return remaining;
    } catch {}
  }

  return 0;
}

/** Human-readable countdown string e.g. "18h 34m" */
export function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Clean and format a Kenyan phone number to international WhatsApp format.
 * Accepts: 0712345678 / 0112345678 / 712345678 / 112345678
 * Returns: 254712345678
 */
export function cleanPhoneForWhatsApp(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');

  // Already has country code
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('1254') && digits.length === 13) return digits.slice(1);

  // Strip leading 0
  const local = digits.startsWith('0') ? digits.slice(1) : digits;

  // Valid Kenyan mobile: 7xxxxxxxx (Safaricom/Airtel) or 1xxxxxxxx (Airtel 110...)
  if (/^[71]\d{8}$/.test(local)) return '254' + local;

  return null;
}

/**
 * Validate Kenyan phone number input.
 * Returns error string or null if valid.
 */
export function validateKenyanPhone(raw: string): string | null {
  if (!raw.trim()) return 'Phone number is required';
  const digits = raw.replace(/\D/g, '');

  // Allow with country code
  if (digits.startsWith('254') && digits.length === 12) {
    const local = digits.slice(3);
    if (/^[71]\d{8}$/.test(local)) return null;
  }

  const local = digits.startsWith('0') ? digits.slice(1) : digits;
  if (/^[71]\d{8}$/.test(local)) return null;

  return 'Enter a valid Kenyan number (e.g. 0712345678 or 0112345678)';
}

/**
 * Open WhatsApp web with a prefilled message.
 */
export function openWhatsApp(phone: string, message: string) {
  const cleaned = cleanPhoneForWhatsApp(phone);
  if (!cleaned) return;
  const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}