import React from 'react';
import { Settings, User, Lock, Shield, Info, LogOut, RotateCcw } from 'lucide-react';

const SOON = (
  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
    Coming soon
  </span>
);

function Card({ icon: Icon, title, action, children }) {
  return (
    <section className="bg-white border border-indigo-100 rounded-3xl p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
          <Icon className="w-4 h-4 text-indigo-600" />
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
      <dd className="text-sm font-semibold text-slate-800 text-right break-words">{value || '—'}</dd>
    </div>
  );
}

// Account details and app settings. Editing arrives with the profile-editing step (see ROADMAP.md);
// until then the page shows what is stored and says plainly what isn't available yet.
export default function SettingsPage({ account, me, isDemo, onLogout, onResetDemo }) {
  const survey = account.survey;
  const interests = account.interests || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="p-1.5 rounded-xl bg-indigo-100 text-indigo-700"><Settings className="w-5 h-5" /></span>
        <h2 className="font-black text-xl text-slate-900">Settings</h2>
      </div>

      <Card icon={User} title="Profile" action={SOON}>
        <dl>
          <Field label="Name" value={me.fullName} />
          <Field label="Username" value={`@${me.username}`} />
          {account.email && <Field label="Email" value={account.email} />}
          <Field label="Profession" value={account.profession ? me.professionTitle : 'Not working / exploring'} />
          {account.profession && <Field label="Field" value={me.industry} />}
          {interests.length > 0 && <Field label="Interests" value={interests.join(', ')} />}
        </dl>
        <p className="mt-3 text-[11px] text-slate-500">Editing your name, photo, bio and profession is coming soon.</p>
      </Card>

      <Card icon={Lock} title="Password & sign-in" action={SOON}>
        <p className="text-xs text-slate-600">Changing your password will be available here.</p>
      </Card>

      <Card icon={Shield} title="Privacy & data" action={survey ? null : SOON}>
        {survey ? (
          <dl>
            <Field label="Share anonymous survey answers for research" value={survey.data_consent ? 'Yes' : 'No'} />
          </dl>
        ) : (
          <p className="text-xs text-slate-600">Your sign-up survey and data-sharing choices will be shown here.</p>
        )}
        <p className="mt-3 text-[11px] text-slate-500">Changing your consent and deleting your account are coming soon.</p>
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
        <p className="text-xs text-slate-600">MyJob shows how every profession really works, from the people doing it.</p>
      </Card>

      <button type="button" onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200">
        <LogOut className="w-4 h-4" /> Log out
      </button>
    </div>
  );
}
