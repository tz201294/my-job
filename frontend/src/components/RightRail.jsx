import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock, ShieldCheck, Sparkles, UserPlus } from 'lucide-react';
import { useCatalog } from '../catalog';
import { fieldName } from '../api/mappers';
import { useI18n } from '../i18n';
import { paths } from '../routes';
import { professionIndexFor } from './ProfessionOfTheDay';

const PEOPLE = 4;
const EXPLORE = 5;

const card = 'bg-white border border-teal-100 rounded-3xl p-4 shadow-sm';
const heading = 'text-sm font-black text-slate-900 mb-3';

function TodayCard({ profession }) {
  const { t } = useI18n();
  return (
    <Link to={paths.profession(profession.slug)}
      className="group block rounded-3xl p-4 bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-sm hover:shadow-md transition-shadow">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> {t('pod.label')}
      </span>
      <span className="block mt-1.5 text-lg font-black leading-tight">{profession.name}</span>
      <span className="block text-[11px] font-semibold text-white/75">{fieldName(profession.field)}</span>
      <span className="block mt-2 text-xs text-white/90 leading-relaxed line-clamp-3">{profession.description}</span>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold group-hover:gap-2 transition-all">
        {t('pod.cta')} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}

// Working people you don't follow yet. The list is picked once, so someone you just followed stays in it
// (showing "Following") instead of jumping away under your cursor.
function PeopleToFollow({ people, meId, onToggleFollow, onOpenProfile }) {
  const { t } = useI18n();
  const [ids, setIds] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (ids || !people.length) return;
    const pick = people
      .filter((p) => p.id !== meId && !p.isFollowing && !p.followRequested && !p.isBlocked)
      .sort((a, b) => Number(b.isVerified) - Number(a.isVerified))
      .slice(0, PEOPLE)
      .map((p) => p.id);
    setIds(pick);
  }, [people, meId, ids]);

  const shown = (ids || []).map((id) => people.find((p) => p.id === id)).filter(Boolean);
  if (!shown.length) return null;

  const toggle = async (p) => {
    setBusy(p.username); setError('');
    try {
      await onToggleFollow(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <section aria-labelledby="rail-people" className={card}>
      <h2 id="rail-people" className={heading}>{t('rail.people')}</h2>
      {error && <p role="alert" className="text-xs font-bold text-rose-600 mb-2">{error}</p>}
      <ul className="space-y-3">
        {shown.map((p) => {
          const on = p.isFollowing || p.followRequested;
          return (
            <li key={p.id} className="flex items-center gap-2.5">
              <button type="button" onClick={() => onOpenProfile(p.username)} className="flex items-center gap-2.5 min-w-0 flex-1 text-left group">
                <img src={p.avatarUrl} alt="" loading="lazy" className="w-9 h-9 shrink-0 rounded-full object-cover" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-xs font-extrabold text-slate-900 group-hover:text-teal-700">
                    <span className="truncate">{p.fullName}</span>
                    {p.isVerified && <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-sky-500" aria-hidden="true" />}
                  </span>
                  <span className="block text-[11px] text-slate-500 truncate">{p.professionTitle}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => toggle(p)}
                disabled={busy === p.username}
                aria-pressed={on}
                aria-label={`${on ? t(p.isFollowing ? 'profile.following' : 'profile.requested') : t('profile.follow')}: ${p.fullName}`}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-extrabold transition-colors disabled:opacity-60 ${
                  on ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {p.isFollowing ? <Check className="w-3 h-3" /> : p.followRequested ? <Clock className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                {t(p.isFollowing ? 'profile.following' : p.followRequested ? 'profile.requested' : 'profile.follow')}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// A different handful of catalog professions each day (not today's profession).
function ExploreProfessions({ professions, today }) {
  const { t } = useI18n();
  const picks = useMemo(() => {
    const n = professions.length;
    const out = [];
    for (let k = 1; out.length < Math.min(EXPLORE, n - 1) && k < n * 2; k += 1) {
      const p = professions[(today + k * 11) % n];
      if (p && (today + k * 11) % n !== today && !out.includes(p)) out.push(p);
    }
    return out;
  }, [professions, today]);
  if (!picks.length) return null;
  return (
    <section aria-labelledby="rail-explore" className={card}>
      <h2 id="rail-explore" className={heading}>{t('rail.explore')}</h2>
      <ul className="space-y-1">
        {picks.map((p) => (
          <li key={p.slug}>
            <Link to={paths.profession(p.slug)} className="block -mx-2 px-2 py-1.5 rounded-xl hover:bg-teal-50 transition-colors">
              <span className="block text-xs font-extrabold text-slate-800">{p.name}</span>
              <span className="block text-[11px] text-slate-500">{fieldName(p.field)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to={paths.professions} className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-teal-700 hover:gap-1.5 transition-all">
        {t('discover.allProfessions')} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}

// The column beside the feed on wide screens.
export default function RightRail({ people = [], meId, onToggleFollow, onOpenProfile, date = new Date() }) {
  const { t } = useI18n();
  const { professions } = useCatalog();
  const today = professions.length ? professionIndexFor(date, professions.length) : -1;
  return (
    <aside aria-label={t('rail.label')} className="hidden lg:block w-72 shrink-0 py-6">
      <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar pb-2">
        {professions[today] && <TodayCard profession={professions[today]} />}
        <PeopleToFollow people={people} meId={meId} onToggleFollow={onToggleFollow} onOpenProfile={onOpenProfile} />
        <ExploreProfessions professions={professions} today={today} />
        <p className="px-2 text-[11px] text-slate-400">
          <Link to={paths.privacy} className="hover:text-slate-600">{t('legal.privacy')}</Link>
          {' · '}
          <Link to={paths.terms} className="hover:text-slate-600">{t('legal.terms')}</Link>
          {' · '}© {date.getFullYear()} Prologue
        </p>
      </div>
    </aside>
  );
}
