import React, { useEffect, useState } from 'react';
import {
  Settings, User, Lock, Shield, Info, LogOut, RotateCcw, Pencil, AlertTriangle, Check, Loader2, Ban, Download, Globe,
} from 'lucide-react';
import { api } from '../api/client';
import { DEFAULT_AVATAR, fieldName } from '../api/mappers';
import LanguageSelect from './LanguageSelect';
import ProfessionPicker from './ProfessionPicker';
import ImageField from './ImageField';
import { useI18n } from '../i18n';

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

// The email row: the address, whether it's confirmed, and a way to get a new confirmation link.
function EmailField({ account }) {
  const { t } = useI18n();
  const [state, setState] = useState({ busy: false, message: '', error: false });

  const resend = async () => {
    setState({ busy: true, message: '', error: false });
    try {
      setState({ busy: false, message: (await api.resendVerification()).detail, error: false });
    } catch (err) {
      setState({ busy: false, message: err.message, error: true });
    }
  };

  return (
    <div className="py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="shrink-0 text-xs font-semibold text-slate-500">{t('settings.email')}</dt>
        <dd className="text-sm font-semibold text-slate-800 text-right break-words min-w-0">
          {account.email || '—'}
          {account.email && (account.email_verified ? (
            <span className="ml-2 inline-flex items-center gap-0.5 align-middle px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
              <Check className="w-3 h-3" /> {t('settings.confirmed')}
            </span>
          ) : (
            <span className="ml-2 align-middle px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold">
              {t('settings.notConfirmed')}
            </span>
          ))}
        </dd>
      </div>
      {!account.email && (
        <p className="mt-1 text-[11px] text-slate-500">{t('settings.addEmailHint')}</p>
      )}
      {account.email && !account.email_verified && (
        <div className="mt-1.5 text-[11px] text-slate-600">
          <p>
            {t('settings.confirmEmailHint')}{' '}
            <button type="button" onClick={resend} disabled={state.busy}
              className="font-bold text-teal-700 hover:underline disabled:opacity-60">
              {state.busy ? t('common.sending') : t('settings.sendNewLink')}
            </button>
          </p>
          {state.message && (
            <p role={state.error ? 'alert' : 'status'} className={`mt-1 font-bold ${state.error ? 'text-rose-600' : 'text-emerald-700'}`}>
              {state.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Everything Prologue stores about you, saved as a JSON file.
function DownloadMyData({ username }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setBusy(true); setError('');
    try {
      const data = await api.exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `prologue-data-${username}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">{t('settings.downloadData')}</p>
        <p className="text-[11px] text-slate-500">{t('settings.downloadDataHint')}</p>
        {error && <p role="alert" className="text-xs font-bold text-rose-600 mt-1">{error}</p>}
      </div>
      <button type="button" onClick={download} disabled={busy}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-60">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} {t('settings.download')}
      </button>
    </div>
  );
}

// People you blocked, with a way to unblock them.
function BlockedAccounts({ onChange }) {
  const { t } = useI18n();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getBlocked().then(setList).catch((err) => setError(err.message));
  }, []);

  const unblock = async (username) => {
    try {
      await api.unblockUser(username);
      setList((l) => l.filter((u) => u.username !== username));
      onChange?.();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <p role="alert" className="text-xs font-bold text-rose-600">{error}</p>;
  if (list === null) return <p className="text-xs text-slate-500">{t('common.loading')}</p>;
  if (!list.length) {
    return <p className="text-xs text-slate-600">{t('settings.noBlocked')}</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {list.map((u) => (
        <li key={u.username} className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm text-slate-800"><strong>{u.full_name}</strong> <span className="text-slate-500">@{u.username}</span></span>
          <button type="button" onClick={() => unblock(u.username)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100">{t('profile.unblock')}</button>
        </li>
      ))}
    </ul>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <dt className="shrink-0 text-xs font-semibold text-slate-500">{label}</dt>
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

function SaveRow({ busy, error, done, label, onCancel, disabled }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
      {error && <p role="alert" className="mr-auto text-xs font-bold text-rose-600">{error}</p>}
      {done && !error && <p className="mr-auto flex items-center gap-1 text-xs font-bold text-emerald-700"><Check className="w-3.5 h-3.5" /> {t('common.saved')}</p>}
      {onCancel && (
        <button type="button" onClick={onCancel} disabled={busy}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">{t('common.cancel')}</button>
      )}
      <button type="submit" disabled={busy || disabled}
        className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 inline-flex items-center gap-1.5">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {busy ? t('common.saving') : (label || t('common.save'))}
      </button>
    </div>
  );
}

function ProfileForm({ account, options, onSave, onDone }) {
  const { t } = useI18n();
  const p = account.profession;
  const [fullName, setFullName] = useState(account.full_name || '');
  const [bio, setBio] = useState(account.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(account.avatar_url || '');
  const [email, setEmail] = useState(account.email || '');
  const [works, setWorks] = useState(!!p);
  const [industry, setIndustry] = useState(p?.industry || options.industries[0] || '');
  const [title, setTitle] = useState(p?.title || '');
  const [slug, setSlug] = useState(p?.catalog_slug || null);
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
        catalog_slug: slug,
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
          alt={t('settings.photoPreview')}
          className="w-14 h-14 rounded-full object-cover ring-2 ring-teal-200"
        />
        <div className="flex-1 min-w-0">
          <ImageField label={t('settings.profilePhoto')} value={avatarUrl} purpose="avatar" preview="none" inputId="set-avatar"
            onChange={(url) => { setAvatarUrl(url); setPreviewOk(true); }} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="set-name">{t('settings.name')}</label>
        <input id="set-name" className={inputCls} required maxLength={128} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="set-bio">{t('settings.bio')}</label>
        <textarea id="set-bio" className={inputCls} rows={3} maxLength={1000} placeholder={t('settings.bioPlaceholder')}
          value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="set-email">{t('settings.emailOptional')}</label>
        <input id="set-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className="text-[11px] text-slate-500 mt-1">{t('settings.emailEditHint')}</p>
      </div>

      <fieldset className="space-y-3">
        <legend className={labelCls}>{t('settings.work')}</legend>
        <div className="flex gap-2" role="radiogroup" aria-label={t('signup.doYouWork')}>
          {[[true, t('settings.iWork')], [false, t('settings.iDontWork')]].map(([val, text]) => (
            <button key={text} type="button" role="radio" aria-checked={works === val} onClick={() => setWorks(val)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border ${works === val ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-300'}`}>
              {text}
            </button>
          ))}
        </div>
        {works && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="set-industry">{t('settings.field')}</label>
              <select id="set-industry" className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                {industries.map((i) => <option key={i} value={i}>{fieldName(i)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="set-title">{t('settings.jobTitle')}</label>
              <ProfessionPicker id="set-title" inputClassName={inputCls} title={title} slug={slug}
                onChange={({ title: next, slug: nextSlug, field }) => {
                  setTitle(next);
                  setSlug(nextSlug || null);
                  if (field) setIndustry(field);
                }} />
            </div>
            <div>
              <label className={labelCls} htmlFor="set-spec">{t('signup.specialization')}</label>
              <input id="set-spec" className={inputCls} maxLength={128} value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
            </div>
            <div>
              <label className={labelCls} htmlFor="set-years">{t('signup.years')}</label>
              <input id="set-years" type="number" min={0} max={70} className={inputCls} value={years} onChange={(e) => setYears(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="set-company">{t('signup.company')}</label>
              <input id="set-company" className={inputCls} maxLength={128} value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
        )}
        {professionChanged && p.is_verified_pro && (
          <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {t('settings.badgeWarning')}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className={labelCls}>{t('settings.interests')}</legend>
        <div className="flex flex-wrap gap-1.5">
          {options.interests.map((i) => (
            <button key={i} type="button" aria-pressed={interests.includes(i)} onClick={() => toggleInterest(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${interests.includes(i) ? 'bg-teal-50 text-teal-800 border-teal-400' : 'bg-white text-slate-600 border-slate-300'}`}>
              {fieldName(i)}
            </button>
          ))}
        </div>
        {interests.length === 0 && <p className="mt-1 text-[11px] font-semibold text-rose-600">{t('settings.chooseOne')}</p>}
      </fieldset>

      <SaveRow busy={busy} error={error} label={t('settings.saveProfile')} onCancel={onDone}
        disabled={!fullName.trim() || interests.length === 0 || (works && title.trim().length < 2)} />
    </form>
  );
}

function PasswordForm({ onChangePassword }) {
  const { t } = useI18n();
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
        <label className={labelCls} htmlFor="pw-current">{t('settings.currentPassword')}</label>
        <input id="pw-current" type="password" autoComplete="current-password" required className={inputCls}
          value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="pw-new">{t('settings.newPassword')}</label>
          <input id="pw-new" type="password" autoComplete="new-password" required minLength={8} className={inputCls}
            value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="pw-confirm">{t('settings.repeatPassword')}</label>
          <input id="pw-confirm" type="password" autoComplete="new-password" required className={inputCls}
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
      </div>
      {mismatch && <p className="text-[11px] font-semibold text-rose-600">{t('settings.passwordMismatch')}</p>}
      <p className="text-[11px] text-slate-500">{t('settings.passwordHint')}</p>
      <SaveRow busy={busy} error={error} done={done} label={t('settings.changePassword')}
        disabled={!current || next.length < 8 || next !== confirm} />
    </form>
  );
}

// Private account: only approved followers see your posts and stories.
function PrivateToggle({ account, onSave }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const on = !!account.is_private;
  const toggle = async () => {
    setBusy(true);
    setError('');
    try {
      await onSave({ is_private: !on });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mb-4 pb-4 border-b border-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="private-label" className="text-sm font-semibold text-slate-800">{t('settings.privateAccount')}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{t(on ? 'settings.privateOnHint' : 'settings.privateOffHint')}</p>
        </div>
        <button type="button" role="switch" aria-checked={on} aria-labelledby="private-label" onClick={toggle} disabled={busy}
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${on ? 'bg-teal-600' : 'bg-slate-300'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
    </div>
  );
}

function ConsentToggle({ survey, onSave }) {
  const { t } = useI18n();
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
          <p id="consent-label" className="text-sm font-semibold text-slate-800">{t('settings.shareSurvey')}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{t('settings.shareSurveyHint')}</p>
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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const { busy, error, submit } = useSubmit(() => onDeleteAccount({ password }));
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200">
        {t('settings.deleteAccountOpen')}
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-rose-800 font-semibold">
        {t('settings.deleteWarning')}
      </p>
      <div>
        <label className={labelCls} htmlFor="del-username">{t('settings.typeUsername', { username })}</label>
        <input id="del-username" className={inputCls} autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </div>
      <div>
        <label className={labelCls} htmlFor="del-password">{t('auth.password')}</label>
        <input id="del-password" type="password" autoComplete="current-password" className={inputCls}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {error && <p role="alert" className="mr-auto text-xs font-bold text-rose-600">{error}</p>}
        <button type="button" onClick={() => { setOpen(false); setPassword(''); setTyped(''); }} disabled={busy}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">{t('common.cancel')}</button>
        <button type="submit" disabled={busy || !password || typed.trim().toLowerCase() !== username}
          className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50">
          {busy ? t('common.deleting') : t('settings.deleteForever')}
        </button>
      </div>
    </form>
  );
}

// Account settings: profile, password, privacy, and deleting the account.
export default function SettingsPage({
  account, me, isDemo, onSaveProfile, onChangePassword, onDeleteAccount, onLogout, onResetDemo, onBlockChange,
  onLanguageChange,
}) {
  const { t } = useI18n();
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
        <h2 className="font-black text-xl text-slate-900">{t('nav.settings')}</h2>
      </div>

      <Card
        icon={User}
        title={t('settings.profile')}
        action={!editing && (
          <button type="button" onClick={() => setEditing(true)} disabled={!options}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50">
            <Pencil className="w-3.5 h-3.5" /> {t('common.edit')}
          </button>
        )}
      >
        {editing && options ? (
          <ProfileForm account={account} options={options} onSave={onSaveProfile} onDone={() => setEditing(false)} />
        ) : (
          <dl>
            <Field label={t('settings.name')} value={me.fullName} />
            <Field label={t('signup.username')} value={`@${me.username}`} />
            {account.bio && <Field label={t('settings.bio')} value={account.bio} />}
            <EmailField account={account} />
            <Field label={t('settings.work')} value={account.profession ? `${me.professionTitle} · ${fieldName(me.industry)}` : t('settings.notWorking')} />
            {interests.length > 0 && <Field label={t('settings.interests')} value={interests.map(fieldName).join(', ')} />}
          </dl>
        )}
      </Card>

      <Card icon={Lock} title={t('auth.password')}>
        <PasswordForm onChangePassword={onChangePassword} />
      </Card>

      <Card icon={Globe} title={t('language.label')}>
        <LanguageSelect id="settings-language" onChange={onLanguageChange} />
        <p className="text-[11px] text-slate-500 mt-2">{t('settings.languageHint')}</p>
      </Card>

      <Card icon={Shield} title={t('settings.privacyData')}>
        <PrivateToggle account={account} onSave={onSaveProfile} />
        {survey ? (
          <ConsentToggle survey={survey} onSave={onSaveProfile} />
        ) : (
          <p className="text-xs text-slate-600">{t('settings.noSurvey')}</p>
        )}
        <DownloadMyData username={me.username} />
      </Card>

      <Card icon={Ban} title={t('settings.blockedAccounts')}>
        <BlockedAccounts onChange={onBlockChange} />
      </Card>

      {isDemo && (
        <Card icon={RotateCcw} title={t('settings.demoData')}>
          <p className="text-xs text-slate-600 mb-3">{t('settings.demoDataHint')}</p>
          <button type="button" onClick={onResetDemo}
            className="px-4 py-2 rounded-xl text-xs font-extrabold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200">
            {t('settings.resetDemo')}
          </button>
        </Card>
      )}

      <Card icon={Info} title={t('settings.about')}>
        <p className="text-xs text-slate-600">
          <strong className="text-slate-800">Prologue</strong> — {t('settings.aboutText')}
        </p>
        <p className="text-xs text-slate-600 mt-2">
          <a href={`${import.meta.env.BASE_URL}privacy`} className="font-bold text-teal-700 hover:underline">{t('legal.privacy')}</a>
          {' · '}
          <a href={`${import.meta.env.BASE_URL}terms`} className="font-bold text-teal-700 hover:underline">{t('legal.terms')}</a>
        </p>
      </Card>

      <button type="button" onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200">
        <LogOut className="w-4 h-4" /> {t('nav.logout')}
      </button>

      <Card icon={AlertTriangle} title={t('settings.deleteAccount')} tone="danger">
        <DeleteAccount username={me.username} onDeleteAccount={onDeleteAccount} />
      </Card>
    </div>
  );
}
