import React, { useEffect, useState } from 'react';
import { Briefcase, Loader2, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { api, IS_DEMO, tokenStore } from '../api/client';
import { DEMO_PASSWORD } from '../api/demoBackend';

// Used only if /auth/signup-options cannot be loaded; the server re-validates everything.
const FALLBACK_OPTIONS = {
  industries: [
    'Trades & Craftsmanship', 'Transportation & Logistics', 'Legal & Finance', 'Technology & Engineering',
    'Healthcare & Medicine', 'Education & Training', 'Food & Hospitality', 'Arts, Media & Design',
    'Science & Research', 'Public Service & Safety', 'Other',
  ],
  interests: [
    'Trades & Craftsmanship', 'Transportation & Logistics', 'Legal & Finance', 'Technology & Engineering',
    'Healthcare & Medicine', 'Education & Training', 'Food & Hospitality', 'Arts, Media & Design',
    'Science & Research', 'Public Service & Safety',
  ],
  genders: ['female', 'male', 'non_binary', 'prefer_not_to_say'],
  non_working_statuses: ['student', 'unemployed', 'retired', 'other'],
  education_levels: ['high_school', 'vocational', 'bachelors', 'masters', 'doctorate', 'other'],
};

const label = (v) => v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const inputCls =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1.5';

function Field({ id, label: text, children, hint }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{text}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function Choice({ checked, onChange, children, type = 'radio', name }) {
  return (
    <label
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
        checked ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span
        className={`w-4 h-4 flex items-center justify-center border ${type === 'radio' ? 'rounded-full' : 'rounded'} ${
          checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
        }`}
        aria-hidden="true"
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </span>
      {children}
    </label>
  );
}

const STEPS = ['Account', 'About your work', 'About you'];

// `notice` is a message from the previous session (e.g. "Your account was deleted.").
export default function AuthScreen({ onAuthenticated, notice = '' }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState(FALLBACK_OPTIONS);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [login, setLogin] = useState({ username_or_email: '', password: '' });
  const [form, setForm] = useState({
    username: '', password: '', full_name: '', email: '',
    works: null, non_working_status: '',
    industry: '', title: '', specialization: '', years_of_experience: '', company_or_freelance: '',
    interests: [],
    gender: '', age: '', country: '', education_level: '', data_consent: false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.getSignupOptions().then(setOptions).catch(() => {});
  }, []);

  const switchMode = (m) => { setMode(m); setStep(0); setError(''); };

  const finish = (data) => {
    tokenStore.set(data.access_token);
    onAuthenticated(data.user);
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      finish(await api.login(login));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Client-side checks per step (the server validates again).
  const stepError = () => {
    if (step === 0) {
      if (!/^[A-Za-z0-9_]{3,30}$/.test(form.username.trim())) return 'Username must be 3-30 characters: letters, numbers and underscores.';
      if (form.password.length < 8) return 'Password must be at least 8 characters.';
    }
    if (step === 1) {
      if (form.works === null) return 'Please tell us whether you currently work.';
      if (form.works && (!form.industry || form.title.trim().length < 2)) return 'Please choose your field and enter your profession.';
      if (!form.works && !form.non_working_status) return 'Please tell us what describes you best.';
      if (form.interests.length === 0) return 'Pick at least one field you are interested in.';
    }
    if (step === 2) {
      const age = Number(form.age);
      if (!form.gender) return 'Please choose a gender option.';
      if (!Number.isInteger(age) || age < 13 || age > 120) return 'Please enter an age between 13 and 120.';
    }
    return '';
  };

  const next = (e) => {
    e.preventDefault();
    const msg = stepError();
    setError(msg);
    if (!msg) setStep(step + 1);
  };

  const submitSignup = async (e) => {
    e.preventDefault();
    const msg = stepError();
    if (msg) return setError(msg);
    setError(''); setBusy(true);
    const payload = {
      username: form.username.trim(),
      password: form.password,
      full_name: form.full_name.trim() || null,
      email: form.email.trim() || null,
      works: form.works,
      non_working_status: form.works ? null : form.non_working_status,
      profession: form.works
        ? {
            industry: form.industry,
            title: form.title.trim(),
            specialization: form.specialization.trim() || null,
            years_of_experience: Number(form.years_of_experience) || 0,
            company_or_freelance: form.company_or_freelance.trim() || null,
          }
        : null,
      interests: form.interests,
      gender: form.gender,
      age: Number(form.age),
      country: form.country.trim() || null,
      education_level: form.education_level || null,
      data_consent: form.data_consent,
    };
    try {
      finish(await api.register(payload));
    } catch (err) {
      setError(err.message);
      if (err.status === 409) setStep(0);
    } finally {
      setBusy(false);
    }
  };

  const toggleInterest = (i) =>
    set('interests', form.interests.includes(i) ? form.interests.filter((x) => x !== i) : [...form.interests, i]);

  const lastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/30">
            <Briefcase className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="font-extrabold text-3xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-700 to-rose-600 bg-clip-text text-transparent">
            MyJob
          </span>
        </div>
        <p className="text-center text-sm text-slate-600 font-medium mb-5">
          See how every profession really works — and share yours.
        </p>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6">
          <div className="flex p-1 bg-slate-100 rounded-xl mb-5 text-xs font-bold" role="tablist">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg transition-all ${mode === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          {notice && !error && (
            <div role="status" className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              {notice}
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={submitLogin} className="space-y-4">
              {IS_DEMO && (
                <p className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs">
                  <strong>Demo mode:</strong> sample data, saved only in this browser. Log in as{' '}
                  <code>sarah_plumber</code>, <code>alex_driver</code> or <code>elena_lawyer</code> with password{' '}
                  <code>{DEMO_PASSWORD}</code>, or create an account.
                </p>
              )}
              <Field id="login-id" label="Username or email">
                <input id="login-id" className={inputCls} autoComplete="username" required value={login.username_or_email}
                  onChange={(e) => setLogin({ ...login, username_or_email: e.target.value })} />
              </Field>
              <Field id="login-pw" label="Password">
                <input id="login-pw" type="password" className={inputCls} autoComplete="current-password" required value={login.password}
                  onChange={(e) => setLogin({ ...login, password: e.target.value })} />
              </Field>
              <SubmitButton busy={busy}>Log in</SubmitButton>
              <p className="text-center text-xs text-slate-500">
                New here?{' '}
                <button type="button" onClick={() => switchMode('signup')} className="font-bold text-indigo-600 hover:underline">
                  Create an account
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={lastStep ? submitSignup : next} className="space-y-4" noValidate>
              <ol className="flex items-center gap-2 mb-1" aria-label="Sign-up progress">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex-1" aria-current={i === step ? 'step' : undefined}>
                    <div className={`h-1.5 rounded-full ${i <= step ? 'bg-gradient-to-r from-indigo-600 to-rose-500' : 'bg-slate-200'}`} />
                    <span className={`block mt-1 text-[10px] font-bold uppercase tracking-wide ${i === step ? 'text-indigo-700' : 'text-slate-400'}`}>{s}</span>
                  </li>
                ))}
              </ol>

              {step === 0 && (
                <>
                  <Field id="su-username" label="Username" hint="3-30 characters: letters, numbers, underscores.">
                    <input id="su-username" className={inputCls} autoComplete="username" value={form.username} onChange={(e) => set('username', e.target.value)} />
                  </Field>
                  <Field id="su-password" label="Password" hint="At least 8 characters.">
                    <input id="su-password" type="password" className={inputCls} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
                  </Field>
                  <Field id="su-name" label="Display name (optional)">
                    <input id="su-name" className={inputCls} autoComplete="name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
                  </Field>
                  <Field id="su-email" label="Email (optional)" hint="Lets you log in with your email too.">
                    <input id="su-email" type="email" className={inputCls} autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  <fieldset>
                    <legend className={labelCls}>Do you currently work?</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <Choice name="works" checked={form.works === true} onChange={() => set('works', true)}>Yes, I work</Choice>
                      <Choice name="works" checked={form.works === false} onChange={() => set('works', false)}>No, not currently</Choice>
                    </div>
                  </fieldset>

                  {form.works === true && (
                    <>
                      <Field id="su-industry" label="Which field do you work in?">
                        <select id="su-industry" className={inputCls} value={form.industry} onChange={(e) => set('industry', e.target.value)}>
                          <option value="">Select a field…</option>
                          {options.industries.map((i) => <option key={i}>{i}</option>)}
                        </select>
                      </Field>
                      <Field id="su-title" label="Your profession">
                        <input id="su-title" className={inputCls} placeholder="e.g. Master Plumber, Accountant, Bus Driver" value={form.title} onChange={(e) => set('title', e.target.value)} />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field id="su-years" label="Years of experience">
                          <input id="su-years" type="number" min="0" max="70" className={inputCls} value={form.years_of_experience} onChange={(e) => set('years_of_experience', e.target.value)} />
                        </Field>
                        <Field id="su-spec" label="Specialization (optional)">
                          <input id="su-spec" className={inputCls} value={form.specialization} onChange={(e) => set('specialization', e.target.value)} />
                        </Field>
                      </div>
                      <Field id="su-company" label="Company or freelance (optional)">
                        <input id="su-company" className={inputCls} value={form.company_or_freelance} onChange={(e) => set('company_or_freelance', e.target.value)} />
                      </Field>
                    </>
                  )}

                  {form.works === false && (
                    <fieldset>
                      <legend className={labelCls}>What describes you best?</legend>
                      <div className="grid grid-cols-2 gap-2">
                        {options.non_working_statuses.map((s) => (
                          <Choice key={s} name="nws" checked={form.non_working_status === s} onChange={() => set('non_working_status', s)}>{label(s)}</Choice>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  <fieldset>
                    <legend className={labelCls}>Which fields interest you? <span className="font-medium text-slate-500">(pick one or more)</span></legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {options.interests.map((i) => (
                        <Choice key={i} type="checkbox" name="interests" checked={form.interests.includes(i)} onChange={() => toggleInterest(i)}>{i}</Choice>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}

              {step === 2 && (
                <>
                  <fieldset>
                    <legend className={labelCls}>Gender</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {options.genders.map((g) => (
                        <Choice key={g} name="gender" checked={form.gender === g} onChange={() => set('gender', g)}>{label(g)}</Choice>
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid grid-cols-2 gap-3">
                    <Field id="su-age" label="Age">
                      <input id="su-age" type="number" min="13" max="120" className={inputCls} value={form.age} onChange={(e) => set('age', e.target.value)} />
                    </Field>
                    <Field id="su-country" label="Country (optional)">
                      <input id="su-country" className={inputCls} autoComplete="country-name" value={form.country} onChange={(e) => set('country', e.target.value)} />
                    </Field>
                  </div>
                  <Field id="su-edu" label="Education (optional)">
                    <select id="su-edu" className={inputCls} value={form.education_level} onChange={(e) => set('education_level', e.target.value)}>
                      <option value="">Prefer not to say</option>
                      {options.education_levels.map((e) => <option key={e} value={e}>{label(e)}</option>)}
                    </select>
                  </Field>
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 accent-indigo-600" checked={form.data_consent} onChange={(e) => set('data_consent', e.target.checked)} />
                    <span>
                      I agree that my answers above may be used in anonymised form for analysis and research.
                      Your name, email and password are never included.
                    </span>
                  </label>
                </>
              )}

              <div className="flex gap-2 pt-1">
                {step > 0 && (
                  <button type="button" onClick={() => { setError(''); setStep(step - 1); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                )}
                <SubmitButton busy={busy}>{lastStep ? 'Create account' : 'Continue'}</SubmitButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 hover:from-indigo-700 hover:to-rose-600 disabled:opacity-60 text-white rounded-xl text-sm font-extrabold shadow-md shadow-indigo-500/25 transition-all"
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
