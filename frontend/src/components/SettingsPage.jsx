import React, { useEffect, useState } from 'react';
import {
  Settings, User, Lock, Shield, Info, LogOut, RotateCcw, Pencil, AlertTriangle, Check, Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import { DEFAULT_AVATAR } from '../api/mappers';

const inputCls =
  'w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1';

function Card({ icon: Icon, title, action, children, tone = 'default' }) {
  return (
    <section className={`bg-white border rounded-3xl p-4 sm:p-5 shadow-2xs ${tone === 'danger' ? 'border-rose-200' : 'border-teal-100'}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className={`flex items-center gap-2 text-sm font-black ${tone === 'danger' ? 'text-rose-800' : 'text-slate-900'}`}>
          <Icon className={`w-4 h-4 ${tone === 'danger' ? 'text-rose-600' : 'text-teal-600'}`} />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800 text-right break-words min-w-0">{value || '—'}</dd>
    </div>
  );
}

// Runs an async save, tracking busy/error/"Saved" state for a form.
function useSubmit(fn) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    setDone(false);
    try {
      await fn();
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, done, submit, setError };
}

function SaveRow({ busy, error, done, label = 'Save', onCancel, disabled }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
      {error && <p role="alert" className="mr-auto text-xs font-bold text-rose-600">{error}</p>}
      {done && !error && <p className="mr-auto flex items-center gap-1 text-xs font-bold text-emerald-700"><Check className="w-3.5 h-3.5" /> Saved</p>}
      {onCancel && (
        <button type="button" onClick={onCancel} disabled={busy}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
      )}
      <button type="submit" disabled={busy || disabled}
        className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 inline-flex items-center gap-1.5">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {busy ? 'Saving…' : label}
      </button>
    </div>
  );
}

function ProfileForm({ account, options, onSave, onDone }) {
  const p = account.profession;
  const [fullName, setFullName] = useState(account.full_name || '');
  const [bio, setBio] = useState(account.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(account.avatar_url || '');
  const [email, setEmail] = useState(account.email || '');
  const [works, setWorks] = useState(!!p);
  const [industry, setIndustry] = useState(p?.industry || options.industries[0] || '');
  const [title, setTitle] = useState(p?.title || '');
  const [specialization, setSpecialization] = useState(p?.specialization || '');
  const [years, setYears] = useState(p?.years_of_experience ?? 0);
  const [company, setCompany] = useState(p?.company_or_freelance || '');
  const [interests, setInterests] = useState(account.interests || []);
  const [previewOk, setPreviewOk] = useState(true);

  const industries = options.industries.includes(industry) || !industry ? options.industries : [industry, ...options.industries];
  const professionChanged = p && works && (industry !== p.industry || title.trim() !== p.title);

  const { busy, error, submit } = useSubmit(async () => {
    const data = {
      full_name: fullName,
      bio,
      avatar_url: avatarUrl.trim(),
      email: email.trim(),
      interests,
    };
    if (works) {
      data.profession = {
        industry,
        title: title.trim(),
        specialization: specialization.trim() || null,
        years_of_experience: Number(years) || 0,
        company_or_freelance: company.trim() || null,
      };
    } else if (p) {
      data.works = false;
    }
    await onSave(data);
    onDone();
  });

  const toggleInterest = (i) =>
    setInterests((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]));

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div className="flex items-center gap-3">
        <img loading="lazy" decoding="async"
          src={avatarUrl && previewOk ? avatarUrl : DEFAULT_AVATAR}
          onError={() => setPreviewOk(false)}
          alt="Photo preview"
          className="w-14 h-14 rounded-full object-cover ring-2 ring-teal-200"
        />
        <div className="flex-1">
          <label className={labelCls} htmlFor="set-avatar">Photo link</label>
          <input id="set-avatar" type="url" className={inputCls} placeholder="https://..." maxLength={512}
            value={avatarUrl} onChange={(e) => { setAvatarUrl(e.target.value); setPreviewOk(true); }} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="set-name">Name</label>
        <input id="set-name" className={inputCls} required maxLength={128} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="set-bio">Bio</label>
        <textarea id="set-bio" className={inputCls} rows={3} maxLength={1000} placeholder="What do you do, and what do you love about it?"
          value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="set-email">Email (optional, private)</label>
        <input id="set-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <fieldset className="space-y-3">
        <legend className={labelCls}>Work</legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Do you work?">
          {[[true, 'I work'], [false, "I don't work right now"]].map(([val, text]) => (
            <button key={text} type="button" role="radio" aria-checked={works === val} onClick={() => setWorks(val)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border ${works === val ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-300'}`}>
              {text}
            </button>
          ))}
        </div>
        {works && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="set-industry">Field</label>
              <select id="set-industry" className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                {industries.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="set-title">Job title</label>
              <input id="set-title" className={inputCls} required minLength={2} maxLength={128} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="set-spec">Specialization (optional)</label>
              <input id="set-spec" className={inputCls} maxLength={128} value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="set-years">Years of experience</label>
              <input id="set-years" type="number" min={0} max={70} className={inputCls} value={years} onChange={(e) => setYears(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="set-company">Company, or "Freelance" (optional)</label>
              <input id="set-company" className={inputCls} maxLength={128} value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
        )}
        {professionChanged && p.is_verified_pro && (
          <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            Changing your field or job title removes your verified badge.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className={labelCls}>Interests</legend>
        <div className="flex flex-wrap gap-1.5">
          {options.interests.map((i) => (
            <button key={i} type="button" aria-pressed={interests.includes(i)} onClick={() => toggleInterest(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${interests.includes(i) ? 'bg-teal-50 text-teal-800 border-teal-400' : 'bg-white text-slate-600 border-slate-300'}`}>
              {i}
            </button>
          ))}
        </div>
        {interests.length === 0 && <p className="mt-1 text-[11px] font-semibold text-rose-600">Choose at least one.</p>}
      </fieldset>

      <SaveRow busy={busy} error={error} label="Save profile" onCancel={onDone}
        disabled={!fullName.trim() || interests.length === 0 || (works && title.trim().length < 2)} />
    </form>
  );
}

function PasswordForm({ onChangePassword }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = confirm && next !== confirm;
  const { busy, error, done, submit } = useSubmit(async () => {
    await onChangePassword({ current_password: current, new_password: next });
    setCurrent(''); setNext(''); setConfirm('');
  });
  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className={labelCls} htmlFor="pw-current">Current password</label>
        <input id="pw-current" type="password" autoComplete="current-password" required className={inputCls}
          value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="pw-new">New password</label>
          <input id="pw-new" type="password" autoComplete="new-password" required minLength={8} className={inputCls}
            value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="pw-confirm">Repeat new password</label>
          <input id="pw-confirm" type="password" autoComplete="new-password" required className={inputCls}
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
      </div>
      {mismatch && <p className="text-[11px] font-semibold text-rose-600">The new passwords don't match.</p>}
      <p className="text-[11px] text-slate-500">At least 8 characters. Changing it signs you out on your other devices.</p>
      <SaveRow busy={busy} error={error} done={done} label="Change password"
        disabled={!current || next.length < 8 || next !== confirm} />
    </form>
  );
}

function ConsentToggle({ survey, onSave }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toggle = async () => {
    setBusy(true);
    setError('');
    try {
      await onSave({ data_consent: !survey.data_consent });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="consent-label" className="text-sm font-semibold text-slate-800">Share my anonymous survey answers for research</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Your answers from sign-up, with no name, email or password.</p>
        </div>
        <button type="button" role="switch" aria-checked={!!survey.data_consent} aria-labelledby="consent-label"
          onClick={toggle} disabled={busy}
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${survey.data_consent ? 'bg-teal-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${survey.data_consent ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
    </div>
  );
}

function DeleteAccount({ username, onDeleteAccount }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const { busy, error, submit } = useSubmit(() => onDeleteAccount({ password }));
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200">
        Delete my account…
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-rose-800 font-semibold">
        This permanently deletes your account, your posts, stories, comments, questions, challenges and ideas.
        It cannot be undone.
      </p>
      <div>
        <label className={labelCls} htmlFor="del-username">Type your username (<strong>{username}</strong>) to confirm</label>
        <input id="del-username" className={inputCls} autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="del-password">Password</label>
        <input id="del-password" type="password" autoComplete="current-password" className={inputCls}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {error && <p role="alert" className="mr-auto text-xs font-bold text-rose-600">{error}</p>}
        <button type="button" onClick={() => { setOpen(false); setPassword(''); setTyped(''); }} disabled={busy}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
        <button type="submit" disabled={busy || !password || typed.trim().toLowerCase() !== username}
          className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50">
          {busy ? 'Deleting…' : 'Delete my account permanently'}
        </button>
      </div>
    </form>
  );
}

// Account settings: profile, password, privacy, and deleting the account.
export default function SettingsPage({
  account, me, isDemo, onSaveProfile, onChangePassword, onDeleteAccount, onLogout, onResetDemo,
}) {
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState(null);
  const survey = account.survey;
  const interests = account.interests || [];

  useEffect(() => {
    api.getSignupOptions().then(setOptions).catch(() => setOptions({ industries: [], interests: [] }));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="p-1.5 rounded-xl bg-teal-100 text-teal-700"><Settings className="w-5 h-5" /></span>
        <h2 className="font-black text-xl text-slate-900">Settings</h2>
      </div>

      <Card
        icon={User}
        title="Profile"
        action={!editing && (
          <button type="button" onClick={() => setEditing(true)} disabled={!options}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
      >
        {editing && options ? (
          <ProfileForm account={account} options={options} onSave={onSaveProfile} onDone={() => setEditing(false)} />
        ) : (
          <dl>
            <Field label="Name" value={me.fullName} />
            <Field label="Username" value={`@${me.username}`} />
            {account.bio && <Field label="Bio" value={account.bio} />}
            <Field label="Email" value={account.email} />
            <Field label="Work" value={account.profession ? `${me.professionTitle} · ${me.industry}` : "Not working right now"} />
            {interests.length > 0 && <Field label="Interests" value={interests.join(', ')} />}
          </dl>
        )}
      </Card>

      <Card icon={Lock} title="Password">
        <PasswordForm onChangePassword={onChangePassword} />
      </Card>

      <Card icon={Shield} title="Privacy & data">
        {survey ? (
          <ConsentToggle survey={survey} onSave={onSaveProfile} />
        ) : (
          <p className="text-xs text-slate-600">This account has no sign-up survey, so there is nothing to share.</p>
        )}
      </Card>

      {isDemo && (
        <Card icon={RotateCcw} title="Demo data">
          <p className="text-xs text-slate-600 mb-3">
            This is the demo: everything you do is saved only in this browser. Resetting brings back the original
            sample data and signs you out.
          </p>
          <button type="button" onClick={onResetDemo}
            className="px-4 py-2 rounded-xl text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200">
            Reset demo data
          </button>
        </Card>
      )}

      <Card icon={Info} title="About">
        <p className="text-xs text-slate-600">
          <strong className="text-slate-800">Prologue</strong> — a story behind every profession. See how every profession really
          works, from the people doing it.
        </p>
      </Card>

      <button type="button" onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200">
        <LogOut className="w-4 h-4" /> Log out
      </button>

      <Card icon={AlertTriangle} title="Delete account" tone="danger">
        <DeleteAccount username={me.username} onDeleteAccount={onDeleteAccount} />
      </Card>
    </div>
  );
}
