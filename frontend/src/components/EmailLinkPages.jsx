import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { BrandMark, Wordmark } from './Brand';
import { api } from '../api/client';
import { SlowHint } from './SlowHint';

// Pages opened from links in emails (/reset-password#token=… and /verify-email#token=…). They work whether or not
// someone is logged in on this device.

/** Reads the token from the address once, then removes it from the address bar (and so from browser history). */
function useLinkToken() {
  const location = useLocation();
  const go = useNavigate();
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '');
  useEffect(() => {
    if (location.hash) go(location.pathname, { replace: true });
  }, [location.hash, location.pathname, go]);
  return token;
}

function Shell({ title, children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-6">
          <BrandMark size={56} title="Prologue" />
          <Wordmark className="text-[2.2rem]" />
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
          <h1 className="text-lg font-black text-slate-900 mb-4">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

function Problem({ children }) {
  return (
    <div role="alert" className="flex items-start gap-2 mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
      <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
      <span>{children}</span>
    </div>
  );
}

const buttonCls =
  'w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 via-cyan-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 disabled:opacity-60 text-white rounded-xl text-sm font-extrabold shadow-md shadow-teal-500/25';
const inputCls =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';

export function ResetPasswordPage({ onReset, onCancel }) {
  const token = useLinkToken();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== repeat) return setError("The two passwords don't match.");
    setError(''); setBusy(true);
    try {
      onReset(await api.resetPassword(token, password));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <Shell title="Choose a new password">
        <Problem>This link is incomplete. Open it again from the email, or ask for a new one on the login page.</Problem>
        <button type="button" onClick={onCancel} className={buttonCls}>Go to Prologue</button>
      </Shell>
    );
  }

  return (
    <Shell title="Choose a new password">
      {error && <Problem>{error}</Problem>}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="reset-pw" className="block text-xs font-bold text-slate-700 mb-1.5">New password</label>
          <input id="reset-pw" type="password" autoComplete="new-password" className={inputCls} value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <p className="text-[11px] text-slate-500 mt-1">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="reset-pw2" className="block text-xs font-bold text-slate-700 mb-1.5">Repeat the new password</label>
          <input id="reset-pw2" type="password" autoComplete="new-password" className={inputCls} value={repeat}
            onChange={(e) => setRepeat(e.target.value)} />
        </div>
        <button type="submit" disabled={busy} className={buttonCls}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Save and log in
        </button>
        <SlowHint active={busy} className="text-center" />
        <p className="text-[11px] text-slate-500 text-center">You'll be logged out everywhere else.</p>
      </form>
    </Shell>
  );
}

export function VerifyEmailPage({ onVerified, onContinue }) {
  const token = useLinkToken();
  const [state, setState] = useState(token ? 'checking' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This link is incomplete. Open it again from the email.');
  const [email, setEmail] = useState('');
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true; // once, even when React runs effects twice in development
    api.verifyEmail(token)
      .then((r) => { setEmail(r.email); setState('done'); onVerified?.(); })
      .catch((err) => { setMessage(err.message); setState('error'); });
  }, [token, onVerified]);

  return (
    <Shell title="Confirm your email">
      {state === 'checking' && (
        <p className="flex items-center gap-2 text-sm text-slate-600" role="status">
          <Loader2 className="w-4 h-4 animate-spin text-teal-600" /> Confirming…
        </p>
      )}
      {state === 'done' && (
        <div role="status" className="flex items-start gap-2 mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Thanks! <strong>{email}</strong> is confirmed. You can now use it to reset your password if you ever forget it.</span>
        </div>
      )}
      {state === 'error' && <Problem>{message}</Problem>}
      {state !== 'checking' && <button type="button" onClick={onContinue} className={buttonCls}>Continue to Prologue</button>}
    </Shell>
  );
}
