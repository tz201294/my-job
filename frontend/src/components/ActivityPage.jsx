import React, { useEffect, useState } from 'react';
import {
  Activity, FileText, HelpCircle, Inbox, Lightbulb, Zap, ChevronRight, CheckCircle2, Heart, MessageCircle, Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import { toPost, toQuestion } from '../api/mappers';

function Section({ icon: Icon, title, count, children, empty }) {
  return (
    <section className="bg-white border border-teal-100 rounded-3xl p-4 sm:p-5 shadow-2xs">
      <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 mb-3">
        <Icon className="w-4 h-4 text-teal-600" />
        {title}
        {count != null && <span className="text-xs font-bold text-slate-400">({count})</span>}
      </h3>
      {count === 0 ? <p className="text-xs text-slate-500">{empty}</p> : <ul className="divide-y divide-slate-100">{children}</ul>}
    </section>
  );
}

function Row({ onClick, title, meta, badge }) {
  return (
    <li>
      <button type="button" onClick={onClick}
        className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-slate-50 rounded-lg px-1.5 -mx-1.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{title}</p>
          {meta && <p className="text-[11px] text-slate-500 mt-0.5">{meta}</p>}
        </div>
        {badge}
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
      </button>
    </li>
  );
}

// Everything the signed-in user has published or is involved in, in one place.
export default function ActivityPage({ me, qaItems, challenges, onOpenPost, onGoToQA, onGoToChallenge }) {
  const [posts, setPosts] = useState(null);
  const [inbox, setInbox] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getPostsByAuthor(me.username),
      api.getQuestions({ worker_id: me.id, answered: false, limit: 100 }),
    ])
      .then(([p, q]) => {
        if (cancelled) return;
        setPosts(p.map(toPost));
        setInbox(q.map(toQuestion));
      })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [me.id, me.username]);

  const myQuestions = qaItems.filter((q) => q.askerId === me.id);
  const myChallenges = challenges.filter((c) => c.workerId === me.id);
  const myIdeas = challenges.flatMap((c) =>
    (c.suggestions || []).filter((s) => s.suggesterId === me.id).map((s) => ({ ...s, challenge: c }))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="p-1.5 rounded-xl bg-teal-100 text-teal-700"><Activity className="w-5 h-5" /></span>
        <h2 className="font-black text-xl text-slate-900">My activity</h2>
      </div>
      {error && <p role="alert" className="text-xs font-bold text-rose-600">Couldn't load everything: {error}</p>}

      {inbox && inbox.length > 0 && (
        <button type="button" onClick={() => onGoToQA('inbox')}
          className="w-full flex items-center gap-3 p-4 rounded-3xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-left shadow-md">
          <Inbox className="w-5 h-5" />
          <span className="flex-1 text-sm font-extrabold">
            {inbox.length} {inbox.length === 1 ? 'question is' : 'questions are'} waiting for your answer
          </span>
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {posts === null && !error ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading your posts…</p>
      ) : (
        <Section icon={FileText} title="My posts" count={posts?.length ?? 0} empty="You haven't published anything yet.">
          {(posts || []).map((p) => (
            <Row
              key={p.id}
              onClick={() => onOpenPost(p)}
              title={p.title}
              meta={
                <span className="inline-flex items-center gap-2.5">
                  <span>{p.timeAgo}</span>
                  <span className="inline-flex items-center gap-0.5"><Heart className="w-3 h-3" /> {p.likesCount}</span>
                  <span className="inline-flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {p.commentsCount}</span>
                </span>
              }
            />
          ))}
        </Section>
      )}

      <Section icon={HelpCircle} title="Questions I asked" count={myQuestions.length}
        empty="You haven't asked anyone a question yet.">
        {myQuestions.map((q) => (
          <Row
            key={q.id}
            onClick={() => onGoToQA('all')}
            title={q.questionText}
            meta={`To ${q.workerFullName} · ${q.timeAgo}`}
            badge={q.answerText
              ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Answered</span>
              : <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Waiting</span>}
          />
        ))}
      </Section>

      <Section icon={Zap} title="My live work challenges" count={myChallenges.length}
        empty="You haven't posted a live work challenge yet.">
        {myChallenges.map((c) => (
          <Row
            key={c.id}
            onClick={() => onGoToChallenge(c.id)}
            title={c.title}
            meta={`${c.suggestions?.length || 0} ideas · ${c.timeAgo}`}
            badge={c.isSolved && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-3 h-3" /> Solved
              </span>
            )}
          />
        ))}
      </Section>

      <Section icon={Lightbulb} title="Ideas I suggested" count={myIdeas.length}
        empty="You haven't suggested an idea on a live work challenge yet.">
        {myIdeas.map((s) => (
          <Row
            key={s.id}
            onClick={() => onGoToChallenge(s.challenge.id)}
            title={s.suggestionText}
            meta={`On "${s.challenge.title}" · ${s.upvotes} upvotes`}
            badge={s.isAccepted && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Accepted</span>
            )}
          />
        ))}
      </Section>
    </div>
  );
}
