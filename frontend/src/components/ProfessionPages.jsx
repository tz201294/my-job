import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Search, ArrowLeft, ListChecks, Wrench, GraduationCap, Users, FileText, ChevronRight,
} from 'lucide-react';
import { api } from '../api/client';
import { fieldName, toPost, toProfileUser } from '../api/mappers';
import { searchProfessions, useCatalog } from '../catalog';
import { useI18n } from '../i18n';
import { paths } from '../routes';
import NotFoundPage from './NotFoundPage';

// Field order as on the sign-up form.
const FIELD_ORDER = [
  'Trades & Craftsmanship', 'Transportation & Logistics', 'Legal & Finance', 'Technology & Engineering',
  'Healthcare & Medicine', 'Education & Training', 'Food & Hospitality', 'Arts, Media & Design',
  'Science & Research', 'Public Service & Safety',
];

/** /professions: every profession in the catalog, by field, with how many people do it here. */
export function ProfessionsPage() {
  const { t } = useI18n();
  const { professions } = useCatalog();
  const [query, setQuery] = useState('');
  const [counts, setCounts] = useState({});

  useEffect(() => {
    api.getCatalog().then((list) => setCounts(Object.fromEntries(list.map((p) => [p.slug, p.people_count])))).catch(() => {});
  }, []);

  const shown = searchProfessions(professions, query, fieldName);
  const byField = FIELD_ORDER.map((field) => [field, shown.filter((p) => p.field === field)]).filter(([, list]) => list.length);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center"><Briefcase className="w-5 h-5" /></span>
        <div>
          <h2 className="text-xl font-black text-slate-900">{t('catalog.title')}</h2>
          <p className="text-xs text-slate-500">{t('catalog.subtitle', { n: professions.length })}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-teal-500 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <label htmlFor="catalog-search" className="sr-only">{t('catalog.search')}</label>
        <input id="catalog-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t('catalog.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" />
      </div>

      {byField.length === 0 && <p className="text-sm text-slate-500 text-center py-8">{t('catalog.noMatches')}</p>}

      {byField.map(([field, list]) => (
        <section key={field} aria-labelledby={`field-${field}`}>
          <h3 id={`field-${field}`} className="text-xs font-black uppercase tracking-wider text-teal-700 mb-2">{fieldName(field)}</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {list.map((p) => (
              <li key={p.slug}>
                <Link to={paths.profession(p.slug)}
                  className="block h-full bg-white border border-slate-200 hover:border-teal-400 hover:shadow-sm rounded-2xl p-3.5 transition-all">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900">{p.name}</span>
                    {counts[p.slug] > 0 && (
                      <span className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        {t('catalog.peopleCount', { count: counts[p.slug] })}
                      </span>
                    )}
                  </span>
                  <span className="block mt-1 text-xs text-slate-600 line-clamp-2">{p.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="bg-white border border-teal-100 rounded-3xl p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 mb-3"><Icon className="w-4 h-4 text-teal-600" /> {title}</h3>
      {children}
    </section>
  );
}

/** /professions/<slug>: what the work is, how to get in, and the people here who do it. */
export function ProfessionPage({ slug }) {
  const { t } = useI18n();
  const { bySlug } = useCatalog();
  const profession = bySlug[slug];
  const [people, setPeople] = useState(null);
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    if (!profession) return undefined;
    let live = true;
    setPeople(null);
    setPosts(null);
    api.getProfessionPeople(slug).then((list) => live && setPeople(list.map(toProfileUser))).catch(() => live && setPeople([]));
    api.getPostsByProfession(slug).then((list) => live && setPosts(list.map(toPost))).catch(() => live && setPosts([]));
    return () => { live = false; };
  }, [slug, !!profession]); // eslint-disable-line react-hooks/exhaustive-deps

  const related = useMemo(() => (profession?.related || []).map((s) => bySlug[s]).filter(Boolean), [profession, bySlug]);

  if (!profession) return <NotFoundPage title={t('catalog.notFound')} message={t('catalog.notFoundText')} />;

  return (
    <div className="space-y-4">
      <Link to={paths.professions} className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:underline">
        <ArrowLeft className="w-4 h-4" /> {t('catalog.all')}
      </Link>

      <header className="bg-gradient-to-br from-teal-700 to-cyan-700 text-white rounded-3xl p-5 sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-wider text-teal-100">{fieldName(profession.field)}</p>
        <h2 className="text-2xl font-black mt-1">{profession.name}</h2>
        <p className="text-sm text-teal-50 mt-2 leading-relaxed">{profession.description}</p>
      </header>

      <Section icon={ListChecks} title={t('catalog.typicalDay')}>
        <ul className="space-y-2">
          {profession.tasks.map((task) => (
            <li key={task} className="flex items-start gap-2 text-sm text-slate-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" aria-hidden="true" /> {task}
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section icon={Wrench} title={t('catalog.tools')}>
          <ul className="flex flex-wrap gap-1.5">
            {profession.tools.map((tool) => (
              <li key={tool} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">{tool}</li>
            ))}
          </ul>
        </Section>
        <Section icon={GraduationCap} title={t('catalog.howToGetIn')}>
          <p className="text-sm text-slate-700 leading-relaxed">{profession.path}</p>
        </Section>
      </div>

      <Section icon={Users} title={t('catalog.people')}>
        {people === null ? <p className="text-xs text-slate-500">{t('common.loading')}</p> : people.length === 0 ? (
          <p className="text-xs text-slate-600">{t('catalog.noPeople')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {people.map((u) => (
              <li key={u.username}>
                <Link to={paths.profile(u.username)} className="flex items-center gap-3 py-2 hover:bg-slate-50 rounded-xl px-1">
                  <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-slate-900 truncate">{u.fullName}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {u.professionTitle} · {t('catalog.years', { count: u.yearsExp })}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-auto shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {posts?.length > 0 && (
        <Section icon={FileText} title={t('catalog.posts')}>
          <ul className="space-y-1.5">
            {posts.slice(0, 8).map((post) => (
              <li key={post.id}>
                <Link to={paths.post(post.id)} className="block text-sm font-semibold text-slate-800 hover:text-teal-700">
                  {post.title} <span className="text-xs text-slate-400 font-medium">· {post.authorFullName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {related.length > 0 && (
        <Section icon={Briefcase} title={t('catalog.related')}>
          <ul className="flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link to={paths.profession(r.slug)}
                  className="inline-block px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold">
                  {r.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
