import { useState } from 'react';
import { useAdminData } from './context/AdminDataContext';
import { useAdminAuth } from './context/AdminAuthContext';
import { GUARDS } from './data';
import { ICONS } from './icons';

const SYS_TABS = ['activity', 'settings'] as const;
type SysTab = (typeof SYS_TABS)[number];
const SYS_LABELS: Record<SysTab, string> = { activity: 'Activity & Security', settings: 'Settings' };

function ActivityTab() {
  const { activityLog, loginAttempts, showToast, logActivity } = useAdminData();

  function signOutOtherSessions() {
    showToast('All other sessions signed out', 'success');
    logActivity('Amara Editor signed out all other active sessions', 'security');
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">System</p>
          <h1 className="page-title">Activity &amp; Security</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="panel">
          <div className="panel-title">Active Guards</div>
          <div className="space-y-2">
            {GUARDS.map((g) => (
              <div className="flex items-start gap-2.5" key={g.label}>
                <span style={{ color: 'var(--success)', marginTop: '.1rem' }}>{ICONS.check}</span>
                <div>
                  <p style={{ fontSize: '.78rem', fontWeight: 600 }}>{g.label}</p>
                  <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)' }}>{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-title">Recent Login Attempts</div>
          <div className="space-y-2">
            {loginAttempts.slice(0, 6).map((l, i) => (
              <div className="flex items-center justify-between gap-2" style={{ fontSize: '.74rem' }} key={i}>
                <div className="min-w-0">
                  <p className="truncate">{l.email}</p>
                  <p style={{ fontSize: '.64rem', color: 'var(--warm-gray)' }}>
                    {l.location} · {l.device}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`badge ${l.status === 'success' ? 'badge-success' : 'badge-danger'}`}>{l.status}</span>
                  <p style={{ fontSize: '.62rem', color: 'var(--warm-gray)', marginTop: '.2rem' }}>{l.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="panel-title">Session Controls</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p style={{ fontSize: '.78rem', fontWeight: 600 }}>Current Session</p>
            <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)', marginTop: '.2rem' }}>This device · active now</p>
          </div>
          <div>
            <p style={{ fontSize: '.78rem', fontWeight: 600 }}>Require 2FA on login</p>
            <label className="switch mt-1">
              <input type="checkbox" checked disabled />
              <span className="track" />
            </label>
          </div>
          <div>
            <button className="btn-outline-admin" style={{ fontSize: '.66rem' }} onClick={signOutOtherSessions}>
              Sign out other sessions
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Full Activity Log</div>
        <div className="space-y-2">
          {activityLog.map((a, i) => {
            const c = a.type === 'security' ? 'var(--danger)' : a.type === 'system' ? 'var(--info)' : 'var(--gold)';
            return (
              <div className="flex items-start gap-2.5 py-1.5" style={{ borderBottom: '1px solid var(--line)' }} key={i}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, marginTop: '.45rem', flexShrink: 0 }} />
                <div className="flex-1">
                  <p style={{ fontSize: '.78rem' }}>{a.text}</p>
                  <p style={{ fontSize: '.62rem', color: 'var(--warm-gray)' }}>{a.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function pwStrength(v: string) {
  let score = 0;
  if (v.length >= 8) score++;
  if (/[A-Z]/.test(v)) score++;
  if (/[0-9]/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v)) score++;
  const map = [
    { color: '#D8D2C7', label: 'Password strength' },
    { color: 'var(--danger)', label: 'Weak' },
    { color: 'var(--warn)', label: 'Fair' },
    { color: 'var(--gold)', label: 'Good' },
    { color: 'var(--success)', label: 'Strong' },
  ];
  return { pct: (score / 4) * 100, ...map[score] };
}

function SettingsTab() {
  const { tickerMessages, addTickerMsg, removeTickerMsg, showToast, logActivity, resetDemoData } = useAdminData();
  const { logout } = useAdminAuth();
  const [newMsg, setNewMsg] = useState('');
  const [newPw, setNewPw] = useState('');
  const [testing, setTesting] = useState(false);
  const [lastSync, setLastSync] = useState('just now');
  const strength = pwStrength(newPw);
  const [confirmingReset, setConfirmingReset] = useState(false);

  function testConnection() {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      setLastSync('just now');
      showToast('Firebase connection healthy', 'success');
      logActivity('Firebase connection test succeeded', 'system');
    }, 1300);
  }

  function exportData() {
    const data = { tickerMessages };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pns-dashboard-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported', 'success');
    logActivity('Amara Editor exported all dashboard data');
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">Configuration</p>
          <h1 className="page-title">Settings</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="panel">
          <div className="panel-title">Site Ticker Messages</div>
          <div className="space-y-2 mb-3">
            {tickerMessages.map((m, i) => (
              <div className="flex items-center justify-between gap-2 p-2" style={{ border: '1px solid var(--line)' }} key={i}>
                <span style={{ fontSize: '.76rem' }}>{m}</span>
                <button className="btn-icon danger" onClick={() => removeTickerMsg(i)}>
                  {ICONS.trash}
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="form-input-admin"
              placeholder="Add a new ticker message…"
              style={{ fontSize: '.78rem' }}
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
            />
            <button
              className="btn-outline-admin"
              onClick={() => {
                addTickerMsg(newMsg);
                setNewMsg('');
              }}
            >
              Add
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Admin Account</div>
          <div className="space-y-3">
            <div>
              <label className="field-label-admin">Display Name</label>
              <input className="form-input-admin" defaultValue="Amara Editor" />
            </div>
            <div>
              <label className="field-label-admin">Email</label>
              <input className="form-input-admin" defaultValue="editor@pnsmagazine.com" disabled style={{ background: 'var(--off-white)' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label-admin">New Password</label>
                <input type="password" className="form-input-admin" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="field-label-admin">Confirm Password</label>
                <input type="password" className="form-input-admin" placeholder="••••••••" />
              </div>
            </div>
            <div style={{ height: 4, background: 'var(--off-white)' }}>
              <div style={{ height: 4, width: `${strength.pct}%`, background: strength.color, transition: '.3s' }} />
            </div>
            <p style={{ fontSize: '.62rem', color: 'var(--warm-gray)' }}>{strength.label}</p>
            <button className="btn-gold-admin" onClick={() => showToast('Account settings saved', 'success')}>
              Save Changes
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            Firebase Connection <span className="badge badge-success">Connected</span>
          </div>
          <div className="space-y-2" style={{ fontSize: '.74rem' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--warm-gray)' }}>Project ID</span>
              <span>pns-magazine-prod</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--warm-gray)' }}>Auth Domain</span>
              <span>pns-magazine-prod.firebaseapp.com</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--warm-gray)' }}>API Key</span>
              <span>••••••••••••3f9a</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--warm-gray)' }}>Firestore Region</span>
              <span>europe-west1</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--warm-gray)' }}>Last Sync</span>
              <span>{lastSync}</span>
            </div>
          </div>
          <button className="btn-outline-admin mt-3" onClick={testConnection} disabled={testing}>
            {testing ? 'Testing connection…' : 'Test Connection'}
          </button>
        </div>

        <div className="panel" style={{ borderColor: 'rgba(168,69,62,.3)' }}>
          <div className="panel-title" style={{ color: 'var(--danger)' }}>
            Danger Zone
          </div>
          <div className="space-y-2">
            <button className="btn-outline-admin w-full" style={{ fontSize: '.7rem' }} onClick={exportData}>
              Export All Data (JSON)
            </button>
            <button className="btn-danger-admin w-full" style={{ fontSize: '.7rem' }} onClick={() => setConfirmingReset(true)}>
              Reset Demo Data
            </button>
            <button className="btn-outline-admin w-full" style={{ fontSize: '.7rem' }} onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className={`modal-admin ${confirmingReset ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setConfirmingReset(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 380 }}>
          <div className="modal-body text-center pt-6 p-6">
            <p className="font-display" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Reset all demo data?
            </p>
            <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)', marginTop: '.4rem' }}>
              Everything will return to its original seeded state. This cannot be undone.
            </p>
          </div>
          <div className="p-4 pt-0 flex gap-2 justify-end">
            <button className="btn-outline-admin" onClick={() => setConfirmingReset(false)}>
              Cancel
            </button>
            <button
              className="btn-danger-admin"
              style={{ background: 'var(--danger)', color: '#fff' }}
              onClick={() => {
                resetDemoData();
                setConfirmingReset(false);
                showToast('Demo data reset', 'danger');
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SystemSection() {
  const [tab, setTab] = useState<SysTab>('activity');

  return (
    <div className="dash-section">
      <div className="flex gap-1 overflow-x-auto mb-5" style={{ borderBottom: '1px solid var(--line)' }}>
        {SYS_TABS.map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {SYS_LABELS[t]}
          </button>
        ))}
      </div>
      {tab === 'activity' && <ActivityTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}
