import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { BrandMark, Wordmark } from './Brand';
import LanguageSelect from './LanguageSelect';
import ProfessionPicker from './ProfessionPicker';
import { fieldName } from '../api/mappers';
import { api, DEMO_URL, IS_DEMO, REAL_APP_URL, tokenStore } from '../api/client';
import { SlowHint } from './SlowHint';
import { DEMO_PASSWORD } from '../api/demoConstants';
import { useI18n } from '../i18n';

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


const inputCls =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all';
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
        checked ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
      }`}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span
        className={`w-4 h-4 flex items-center justify-center border ${type === 'radio' ? 'rounded-full' : 'rounded'} ${
          checked ? 'bg-teal-600 border-teal-600' : 'border-slate-300'
        }`}
        aria-hidden="true"
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </span>
      {children}
    </label>
  );
}

const STEPS = ['signup.stepAccount', 'signup.stepWork', 'signup.stepYou'];

// `notice` is a message from the previous session (e.g. "Your account was deleted.").
export default function AuthScreen({ onAuthenticated, notice = '' }) {
  const { t } = useI18n();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [info, setInfo] = useState(''); // e.g. "we've sent a link"
  const [forgotId, setForgotId] = useState('');
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState(FALLBACK_OPTIONS);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [login, setLogin] = useState({ username_or_email: '', password: '' });
  const [form, setForm] = useState({
    username: '', password: '', full_name: '', email: '',
    works: null, non_working_status: '',
    industry: '', title: '', catalog_slug: '', specialization: '', years_of_experience: '', company_or_freelance: '',
    interests: [],
    gender: '', age: '', country: '', education_level: '', data_consent: false, accept_terms: false,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.getSignupOptions().then(setOptions).catch(() => {});
  }, []);

  const switchMode = (m) => { setMode(m); setStep(0); setError(''); setInfo(''); };

  const submitForgot = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      setInfo((await api.forgotPassword(forgotId.trim())).detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

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
      if (!/^[A-Za-z0-9_]{3,30}$/.test(form.username.trim())) return t('signup.errUsername');
      if (form.password.length < 8) return t('signup.errPassword');
    }
    if (step === 1) {
      if (form.works === null) return t('signup.errWorks');
      if (form.works && (!form.industry || form.title.trim().length < 2)) return t('signup.errProfession');
      if (!form.works && !form.non_working_status) return t('signup.errStatus');
      if (form.interests.length === 0) return t('signup.errInterests');
    }
    if (step === 2) {
      const age = Number(form.age);
      if (!form.gender) return t('signup.errGender');
      if (!Number.isInteger(age) || age < 13 || age > 120) return t('signup.errAge');
      if (!form.accept_terms) return t('signup.errTerms');
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
            catalog_slug: form.catalog_slug || null,
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
      accept_terms: form.accept_terms,
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
        <div className="flex flex-col items-center gap-3 mb-6">
          <BrandMark size={64} title="Prologue" className="drop-shadow-[0_10px_24px_rgba(11,95,90,0.35)]" />
          <h1><Wordmark className="text-[2.6rem]" /></h1>
          <p className="text-sm text-slate-500 font-medium tracking-wide">{t('brand.tagline')}</p>
        </div>

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
                {m === 'login' ? t('auth.login') : t('auth.signup')}
              </button>
            ))}
          </div>

          {(info || notice) && !error && (
            <div role="status" className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
              {info || notice}
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'forgot' ? (
            <form onSubmit={submitForgot} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('auth.forgotIntro')}
              </p>
              <Field id="forgot-id" label={t('auth.usernameOrEmail')}>
                <input id="forgot-id" className={inputCls} autoComplete="username" required value={forgotId}
                  onChange={(e) => setForgotId(e.target.value)} />
              </Field>
              <SubmitButton busy={busy}>{t('auth.sendResetLink')}</SubmitButton>
              <SlowHint active={busy} className="text-center" />
              <p className="text-center text-xs text-slate-500">
                <button type="button" onClick={() => switchMode('login')} className="font-bold text-teal-600 hover:underline">
                  {t('auth.backToLogin')}
                </button>
              </p>
            </form>
          ) : mode === 'login' ? (
            <form onSubmit={submitLogin} className="space-y-4">
              {IS_DEMO && (
                <p className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs">
                  <strong>{t('demo.title')}</strong> {t('demo.loginIntro')}{' '}
                  <code>sarah_plumber</code>, <code>alex_driver</code>, <code>elena_lawyer</code> · {t('demo.password')}{' '}
                  <code>{DEMO_PASSWORD}</code>
                  {REAL_APP_URL && (
                    <>
                      {' '}<a href={REAL_APP_URL} className="font-bold underline hover:text-teal-950">{t('demo.joinReal')}</a>
                    </>
                  )}
                </p>
              )}
              <Field id="login-id" label={t('auth.usernameOrEmail')}>
                <input id="login-id" className={inputCls} autoComplete="username" required value={login.username_or_email}
                  onChange={(e) => setLogin({ ...login, username_or_email: e.target.value })} />
              </Field>
              <Field id="login-pw" label={t('auth.password')}>
                <input id="login-pw" type="password" className={inputCls} autoComplete="current-password" required value={login.password}
                  onChange={(e) => setLogin({ ...login, password: e.target.value })} />
              </Field>
              <div className="-mt-2 text-right">
                <button type="button" onClick={() => { switchMode('forgot'); setForgotId(login.username_or_email); }}
                  className="text-xs font-bold text-teal-600 hover:underline">
                  {t('auth.forgotPassword')}
                </button>
              </div>
              <SubmitButton busy={busy}>{t('auth.login')}</SubmitButton>
              <SlowHint active={busy} className="text-center" />
              <p className="text-center text-xs text-slate-500">
                {t('auth.newHere')}{' '}
                <button type="button" onClick={() => switchMode('signup')} className="font-bold text-teal-600 hover:underline">
                  {t('auth.createAccount')}
                </button>
              </p>
              {DEMO_URL && (
                <p className="text-center text-xs text-slate-500">
                  {t('auth.lookAround')}{' '}
                  <a href={DEMO_URL} className="font-bold text-teal-600 hover:underline">{t('auth.tryDemo')}</a>
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={lastStep ? submitSignup : next} className="space-y-4" noValidate>
              <ol className="flex items-center gap-2 mb-1" aria-label={t('signup.progress')}>
                {STEPS.map((s, i) => (
                  <li key={s} className="flex-1" aria-current={i === step ? 'step' : undefined}>
                    <div className={`h-1.5 rounded-full ${i <= step ? 'bg-teal-600' : 'bg-slate-200'}`} />
                    <span className={`block mt-1 text-[10px] font-bold uppercase tracking-wide ${i === step ? 'text-teal-700' : 'text-slate-400'}`}>{t(s)}</span>
                  </li>
                ))}
              </ol>

              {step === 0 && (
                <>
                  <Field id="su-username" label={t('signup.username')} hint={t('signup.usernameHint')}>
                    <input id="su-username" className={inputCls} autoComplete="username" value={form.username} onChange={(e) => set('username', e.target.value)} />
                  </Field>
                  <Field id="su-password" label={t('auth.password')} hint={t('signup.passwordHint')}>
                    <input id="su-password" type="password" className={inputCls} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
                  </Field>
                  <Field id="su-name" label={t('signup.displayName')}>
                    <input id="su-name" className={inputCls} autoComplete="name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
                  </Field>
                  <Field id="su-email" label={t('signup.email')} hint={t('signup.emailHint')}>
                    <input id="su-email" type="email" className={inputCls} autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  <fieldset>
                    <legend className={labelCls}>{t('signup.doYouWork')}</legend>
                    <div className="grid grid-cols-2 gap-2">
                      <Choice name="works" checked={form.works === true} onChange={() => set('works', true)}>{t('signup.yesWork')}</Choice>
                      <Choice name="works" checked={form.works === false} onChange={() => set('works', false)}>{t('signup.noWork')}</Choice>
                    </div>
                  </fieldset>

                  {form.works === true && (
                    <>
                      <Field id="su-industry" label={t('signup.whichField')}>
                        <select id="su-industry" className={inputCls} value={form.industry} onChange={(e) => set('industry', e.target.value)}>
                          <option value="">{t('signup.selectField')}</option>
                          {options.industries.map((i) => <option key={i} value={i}>{fieldName(i)}</option>)}
                        </select>
                      </Field>
                      <Field id="su-title" label={t('signup.profession')}>
                        <ProfessionPicker id="su-title" inputClassName={inputCls} placeholder={t('signup.professionPlaceholder')}
                          title={form.title} slug={form.catalog_slug}
                          onChange={({ title, slug, field }) => setForm((f) => ({
                            ...f, title, catalog_slug: slug || '', ...(field ? { industry: field } : {}),
                          }))} />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field id="su-years" label={t('signup.years')}>
                          <input id="su-years" type="number" min="0" max="70" className={inputCls} value={form.years_of_experience} onChange={(e) => set('years_of_experience', e.target.value)} />
                        </Field>
                        <Field id="su-spec" label={t('signup.specialization')}>
                          <input id="su-spec" className={inputCls} value={form.specialization} onChange={(e) => set('specialization', e.target.value)} />
                        </Field>
                      </div>
                      <Field id="su-company" label={t('signup.company')}>
                        <input id="su-company" className={inputCls} value={form.company_or_freelance} onChange={(e) => set('company_or_freelance', e.target.value)} />
                      </Field>
                    </>
                  )}

                  {form.works === false && (
                    <fieldset>
                      <legend className={labelCls}>{t('signup.describesYou')}</legend>
                      <div className="grid grid-cols-2 gap-2">
                        {options.non_working_statuses.map((s) => (
                          <Choice key={s} name="nws" checked={form.non_working_status === s} onChange={() => set('non_working_status', s)}>{t(`option.${s}`)}</Choice>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  <fieldset>
                    <legend className={labelCls}>{t('signup.interests')} <span className="font-medium text-slate-500">{t('signup.pickOneOrMore')}</span></legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {options.interests.map((i) => (
                        <Choice key={i} type="checkbox" name="interests" checked={form.interests.includes(i)} onChange={() => toggleInterest(i)}>{fieldName(i)}</Choice>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}

              {step === 2 && (
                <>
                  <fieldset>
                    <legend className={labelCls}>{t('signup.gender')}</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {options.genders.map((g) => (
                        <Choice key={g} name="gender" checked={form.gender === g} onChange={() => set('gender', g)}>{t(`option.${g}`)}</Choice>
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid grid-cols-2 gap-3">
                    <Field id="su-age" label={t('signup.age')}>
                      <input id="su-age" type="number" min="13" max="120" className={inputCls} value={form.age} onChange={(e) => set('age', e.target.value)} />
                    </Field>
                    <Field id="su-country" label={t('signup.country')}>
                      <input id="su-country" className={inputCls} autoComplete="country-name" value={form.country} onChange={(e) => set('country', e.target.value)} />
                    </Field>
                  </div>
                  <Field id="su-edu" label={t('signup.education')}>
                    <select id="su-edu" className={inputCls} value={form.education_level} onChange={(e) => set('education_level', e.target.value)}>
                      <option value="">{t('option.prefer_not_to_say')}</option>
                      {options.education_levels.map((e) => <option key={e} value={e}>{t(`option.${e}`)}</option>)}
                    </select>
                  </Field>
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 accent-teal-600" checked={form.data_consent} onChange={(e) => set('data_consent', e.target.checked)} />
                    <span>
                      {t('signup.researchConsent')}
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 accent-teal-600" checked={form.accept_terms}
                      onChange={(e) => set('accept_terms', e.target.checked)} />
                    <span>
                      {t('signup.agreeBefore')}{' '}
                      <a href={`${import.meta.env.BASE_URL}terms`} target="_blank" rel="noreferrer" className="font-bold text-teal-700 underline">{t('legal.terms')}</a>
                      {' '}{t('signup.agreeMiddle')}{' '}
                      <a href={`${import.meta.env.BASE_URL}privacy`} target="_blank" rel="noreferrer" className="font-bold text-teal-700 underline">{t('legal.privacy')}</a>{t('signup.agreeAfter')}
                      {' '}<span className="text-slate-500">{t('signup.required')}</span>
                    </span>
                  </label>
                </>
              )}

              <div className="flex gap-2 pt-1">
                {step > 0 && (
                  <button type="button" onClick={() => { setError(''); setStep(step - 1); }}
                    className="btn btn-secondary py-2.5 text-sm">
                    <ArrowLeft className="w-4 h-4" /> {t('common.back')}
                  </button>
                )}
                <SubmitButton busy={busy}>{lastStep ? t('signup.createAccount') : t('common.continue')}</SubmitButton>
              </div>
              <SlowHint active={busy} className="text-center" />
            </form>
          )}
        </div>
        <p className="text-center text-xs text-slate-500 mt-4">
          <a href={`${import.meta.env.BASE_URL}privacy`} className="hover:underline">{t('legal.privacyShort')}</a>
          {' · '}
          <a href={`${import.meta.env.BASE_URL}terms`} className="hover:underline">{t('legal.termsShort')}</a>
          {' · '}
          <LanguageSelect compact />
        </p>
      </div>
    </div>
  );
}

function SubmitButton({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex-1 w-full btn btn-primary py-2.5 text-sm"
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
