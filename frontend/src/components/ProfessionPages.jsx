import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Search, ArrowLeft, ListChecks, Wrench, GraduationCap, Users, FileText, ChevronRight, Send,
  MessageCircleQuestion, Truck, Scale, Code, HeartPulse, ChefHat, Palette, FlaskConical, Shield,
} from 'lucide-react';
import { api } from '../api/client';
import { fieldName, toPost, toProfileUser } from '../api/mappers';
import { FIELD_ORDER, searchProfessions, useCatalog } from '../catalog';
import { useI18n } from '../i18n';
import { paths } from '../routes';
import NotFoundPage from './NotFoundPage';


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
                      <span className="shrink-0 tag tag-brand">
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

const FIELD_ICONS = {
  'Trades & Craftsmanship': Wrench, 'Transportation & Logistics': Truck, 'Legal & Finance': Scale,
  'Technology & Engineering': Code, 'Healthcare & Medicine': HeartPulse, 'Education & Training': GraduationCap,
  'Food & Hospitality': ChefHat, 'Arts, Media & Design': Palette, 'Science & Research': FlaskConical,
  'Public Service & Safety': Shield,
};
const POSTS_FIRST = 6;

function Section({ icon: Icon, title, id, children }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="bg-white border border-teal-100 rounded-3xl p-4 sm:p-5 scroll-mt-20">
      <h3 id={id ? `${id}-title` : undefined} className="flex items-center gap-2 text-sm font-black text-slate-900 mb-3">
        <Icon className="w-4 h-4 text-teal-600" aria-hidden="true" /> {title}
      </h3>
      {children}
    </section>
  );
}

// A question to one of the people who do this job, sent from the profession page.
function AskForm({ profession, askable, chosen, onChoose, onAskQuestion, textRef }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const to = askable.find((u) => u.id === chosen) || askable[0];

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setError(''); setSent(false);
    try {
      await onAskQuestion(to.id, { questionText: text.trim(), topicTag: profession.name.slice(0, 64) });
      setText('');
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={send} className="space-y-2.5">
      {askable.length > 1 ? (
        <div>
          <label htmlFor="ask-who" className="block text-xs font-bold text-slate-600 mb-1">{t('catalog.askWho')}</label>
          <select id="ask-who" value={to.id} onChange={(e) => onChoose(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500">
            {askable.map((u) => <option key={u.id} value={u.id}>{u.fullName} · {u.professionTitle}</option>)}
          </select>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-xs text-slate-600">
          <img src={to.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
          {t('catalog.askPerson', { name: to.fullName })}
        </p>
      )}
      <label htmlFor="ask-text" className="sr-only">{t('catalog.askLabel')}</label>
      <textarea id="ask-text" ref={textRef} rows={3} value={text} onChange={(e) => { setText(e.target.value); setSent(false); }}
        placeholder={t('catalog.askPlaceholder')} maxLength={1000}
        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 resize-y" />
      {error && <p role="alert" className="text-xs font-bold text-rose-600">{error}</p>}
      {sent && <p role="status" className="text-xs font-bold text-teal-700">{t('catalog.askSent')}</p>}
      <button type="submit" disabled={busy || !text.trim()}
        className="btn btn-primary">
        <Send className="w-3.5 h-3.5" aria-hidden="true" /> {t('catalog.askSend')}
      </button>
    </form>
  );
}

/** /professions/<slug>: what the work looks like (real posts first), how to get in, and the people who do it. */
export function ProfessionPage({ slug, meId, mySlug, onAskQuestion }) {
  const { t } = useI18n();
  const { bySlug } = useCatalog();
  const profession = bySlug[slug];
  const [people, setPeople] = useState(null);
  const [posts, setPosts] = useState(null);
  const [allPosts, setAllPosts] = useState(false);
  const [chosen, setChosen] = useState('');
  const textRef = useRef(null);

  useEffect(() => {
    if (!profession) return undefined;
    let live = true;
    setPeople(null);
    setPosts(null);
    setAllPosts(false);
    setChosen('');
    api.getProfessionPeople(slug).then((list) => live && setPeople(list.map(toProfileUser))).catch(() => live && setPeople([]));
    api.getPostsByProfession(slug).then((list) => live && setPosts(list.map(toPost))).catch(() => live && setPosts([]));
    return () => { live = false; };
  }, [slug, !!profession]); // eslint-disable-line react-hooks/exhaustive-deps

  const related = useMemo(() => (profession?.related || []).map((s) => bySlug[s]).filter(Boolean), [profession, bySlug]);

  if (!profession) return <NotFoundPage title={t('catalog.notFound')} message={t('catalog.notFoundText')} />;

  const FieldIcon = FIELD_ICONS[profession.field] || Briefcase;
  const cover = posts?.find((p) => p.mediaUrl)?.mediaUrl;
  const askable = onAskQuestion ? (people || []).filter((u) => u.id !== meId) : [];
  const shownPosts = (posts || []).slice(0, allPosts ? undefined : POSTS_FIRST);
  const iDoThis = mySlug === slug || (people || []).some((u) => u.id === meId);

  const askSomeone = (id) => {
    if (id) setChosen(id);
    document.getElementById('ask')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    textRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-4">
      <Link to={paths.professions} className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:underline">
        <ArrowLeft className="w-4 h-4" /> {t('catalog.all')}
      </Link>

      {/* Cover: a photo from someone doing the job, or the field's icon */}
      <header className="relative overflow-hidden rounded-3xl text-white bg-gradient-to-br from-teal-700 to-cyan-700 min-h-[220px] sm:min-h-[260px] flex items-end">
        {cover ? (
          <>
            <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/10" />
          </>
        ) : (
          <FieldIcon className="absolute -right-8 -top-6 w-56 h-56 text-white/10" aria-hidden="true" />
        )}
        <div className="relative w-full p-5 sm:p-6">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white/80">
            <FieldIcon className="w-3.5 h-3.5" aria-hidden="true" /> {fieldName(profession.field)}
          </p>
          <h2 className="text-3xl font-black mt-1 drop-shadow-sm">{profession.name}</h2>
          <p className="text-sm text-white/90 mt-1.5 leading-relaxed max-w-xl">{profession.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {people?.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-bold">
                {t('catalog.peopleHere', { count: people.length })}
              </span>
            )}
            {posts?.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur text-[11px] font-bold">
                {t('catalog.postsCount', { count: posts.length })}
              </span>
            )}
            {askable.length > 0 && (
              <button type="button" onClick={() => askSomeone()}
                className="sm:ml-auto btn bg-white text-teal-800 hover:bg-teal-50 shadow-sm">
                <MessageCircleQuestion className="w-4 h-4" aria-hidden="true" /> {t('catalog.askTitle')}
              </button>
            )}
          </div>
        </div>
      </header>

      <Section icon={ListChecks} title={t('catalog.typicalDay')}>
        <ol className="space-y-2.5">
          {profession.tasks.map((task, i) => (
            <li key={task} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="shrink-0 w-6 h-6 rounded-full bg-teal-600 text-white text-[11px] font-black flex items-center justify-center" aria-hidden="true">
                {i + 1}
              </span>
              <span className="pt-0.5">{task}</span>
            </li>
          ))}
        </ol>
      </Section>

      {posts?.length > 0 && (
        <Section icon={FileText} title={t('catalog.posts')}>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {shownPosts.map((post) => (
              <li key={post.id}>
                <Link to={paths.post(post.id)}
                  className="group block h-full rounded-2xl overflow-hidden border border-slate-200 hover:border-teal-300 hover:shadow-sm bg-white transition-all">
                  <span className="block aspect-[4/3] bg-slate-100 overflow-hidden">
                    {post.mediaUrl && (
                      <img src={post.mediaUrl} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    )}
                  </span>
                  <span className="block p-2.5">
                    <span className="block text-xs font-extrabold text-slate-900 line-clamp-2">{post.title}</span>
                    <span className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                      <img src={post.authorAvatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                      <span className="truncate">{post.authorFullName}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {!allPosts && posts.length > POSTS_FIRST && (
            <button type="button" onClick={() => setAllPosts(true)} className="mt-3 text-xs font-extrabold text-teal-700 hover:underline">
              {t('catalog.showAll', { n: posts.length })}
            </button>
          )}
        </Section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section icon={Wrench} title={t('catalog.tools')}>
          <ul className="flex flex-wrap gap-1.5">
            {profession.tools.map((tool) => (
              <li key={tool} className="tag text-xs px-2.5 py-1">{tool}</li>
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
              <li key={u.username} className="flex items-center gap-2">
                <Link to={paths.profile(u.username)} className="flex items-center gap-3 py-2 hover:bg-slate-50 rounded-xl px-1 min-w-0 flex-1">
                  <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-slate-900 truncate">{u.fullName}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {u.professionTitle} · {t('catalog.years', { count: u.yearsExp })}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-auto shrink-0" />
                </Link>
                {askable.some((a) => a.id === u.id) && (
                  <button type="button" onClick={() => askSomeone(u.id)} aria-label={t('catalog.askPerson', { name: u.fullName })}
                    className="btn btn-sm btn-quiet shrink-0">
                    {t('catalog.ask')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {people?.length > 0 && !iDoThis && (
          <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
            {t('catalog.doYou')}{' '}
            <Link to={paths.settings} className="font-bold text-teal-700 hover:underline">{t('catalog.addToProfile')}</Link>
          </p>
        )}
      </Section>

      {askable.length > 0 && (
        <Section id="ask" icon={MessageCircleQuestion} title={t('catalog.askTitle')}>
          <AskForm profession={profession} askable={askable} chosen={chosen} onChoose={setChosen}
            onAskQuestion={onAskQuestion} textRef={textRef} />
        </Section>
      )}

      {related.length > 0 && (
        <Section icon={Briefcase} title={t('catalog.related')}>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {related.map((r) => (
              <li key={r.slug}>
                <Link to={paths.profession(r.slug)}
                  className="block h-full p-3 rounded-2xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition-colors">
                  <span className="block text-sm font-extrabold text-slate-900">{r.name}</span>
                  <span className="block mt-0.5 text-[11px] text-slate-500 line-clamp-2">{r.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
