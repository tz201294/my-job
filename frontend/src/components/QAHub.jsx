import React, { useCallback, useEffect, useState } from 'react';
import {
  Send, ShieldCheck, ArrowUp, MessageSquareText, Video, Pencil, Inbox, Loader2
} from 'lucide-react';
import { api } from '../api/client';
import { toQuestion, topicName } from '../api/mappers';
import OwnerActions from './OwnerActions';
import ReportButton from './ReportButton';
import { useI18n } from '../i18n';

const MAX_ANSWER = 5000;

// Inline form the asked worker uses to answer, or to edit an existing answer.
function AnswerForm({ qa, onSubmit, onCancel }) {
  const { t } = useI18n();
  const [answerText, setAnswerText] = useState(qa.answerText || '');
  const [videoResponseUrl, setVideoResponseUrl] = useState(qa.videoResponseUrl || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editing = !!qa.answerText;

  const submit = async (e) => {
    e.preventDefault();
    const text = answerText.trim();
    if (!text) return;
    setError('');
    setBusy(true);
    try {
      await onSubmit({ answerText: text, videoResponseUrl: videoResponseUrl.trim() });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-teal-50/60 border border-teal-200 rounded-2xl p-3.5 space-y-2.5">
      <label htmlFor={`answer-${qa.id}`} className="block text-xs font-black text-teal-950">
        {editing ? t('qa.editAnswer') : t('qa.yourAnswer')}
      </label>
      <textarea
        id={`answer-${qa.id}`}
        rows={4}
        maxLength={MAX_ANSWER}
        required
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        placeholder={t('qa.answerPlaceholder')}
        className="w-full px-3.5 py-2.5 bg-white border border-teal-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-medium resize-y"
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor={`answer-video-${qa.id}`}>{t('qa.videoLabel')}</label>
        <input
          id={`answer-video-${qa.id}`}
          type="url"
          pattern="https?://.+"
          title={t('qa.linkTitle')}
          value={videoResponseUrl}
          onChange={(e) => setVideoResponseUrl(e.target.value)}
          placeholder={t('qa.videoPlaceholder')}
          className="flex-1 px-3.5 py-2 bg-white border border-teal-200 rounded-xl text-xs text-slate-800 outline-none focus:border-teal-500 font-medium"
        />
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              {t('common.cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !answerText.trim()}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{editing ? t('qa.saveAnswer') : t('qa.postAnswer')}</span>
          </button>
        </div>
      </div>
      <div className="flex justify-between text-[10px] font-semibold">
        <span role="alert" className="text-rose-600">{error}</span>
        <span className="text-slate-400">{answerText.length}/{MAX_ANSWER}</span>
      </div>
    </form>
  );
}

// The asker rewords their question (only while it is unanswered).
function QuestionEditForm({ qa, onSubmit, onCancel }) {
  const { t } = useI18n();
  const [text, setText] = useState(qa.questionText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    setBusy(true);
    try {
      await onSubmit({ questionText: text.trim(), topicTag: qa.topicTag });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mb-3 space-y-2">
      <label htmlFor={`q-edit-${qa.id}`} className="sr-only">{t('qa.editQuestion')}</label>
      <textarea
        id={`q-edit-${qa.id}`}
        rows={2}
        maxLength={2000}
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-white border border-teal-200 rounded-xl text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 font-semibold resize-y"
      />
      <div className="flex items-center justify-between gap-2">
        <span role="alert" className="text-[11px] font-bold text-rose-600">{error}</span>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} disabled={busy}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={busy || !text.trim()}
            className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60">
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </form>
  );
}

function QuestionCard({ qa, isMine, isAsker, canReport, onUpvoteQA, onAnswer, onUpdate, onDelete }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const answered = !!qa.answerText;

  const submitAnswer = async (draft) => {
    await onAnswer(qa.id, draft);
    setEditing(false);
  };

  const submitQuestion = async (draft) => {
    await onUpdate(qa.id, draft);
    setEditingQuestion(false);
  };

  // The asker can reword until it's answered and delete any time; the professional asked can delete it.
  const canEditQuestion = isAsker && !answered && !editingQuestion;
  const canDelete = isAsker || isMine;

  return (
    <div className="border border-teal-100 rounded-3xl p-4 sm:p-5 bg-white hover:border-teal-200 transition-all shadow-2xs">
      {/* Question Header */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] px-3 py-0.5 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-800 border border-teal-200 font-extrabold shadow-2xs">
            {topicName(qa.topicTag)}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {qa.askerUsername
              ? t(isMine ? 'qa.userAskedYou' : 'qa.userAsked', { username: qa.askerUsername, name: qa.workerFullName })
              : t(isMine ? 'qa.askedYou' : 'qa.asked', { name: qa.workerFullName })}
            {' · '}{qa.timeAgo}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
        {canDelete && (
          <OwnerActions
            label="question"
            onEdit={canEditQuestion ? () => setEditingQuestion(true) : undefined}
            onDelete={() => onDelete(qa.id)}
            confirmText={answered ? t('qa.confirmDeleteAnswered') : t('qa.confirmDelete')}
          />
        )}
        {canReport && <ReportButton targetType="question" targetId={qa.id} label="question" />}
        <button
          onClick={() => onUpvoteQA(qa.id)}
          aria-pressed={qa.upvotedByMe}
          aria-label={t('qa.upvote', { n: qa.upvotes })}
          className={`flex items-center gap-1 px-3 py-1 rounded-xl border text-xs font-black transition-colors ${
            qa.upvotedByMe
              ? 'bg-teal-600 border-teal-600 text-white'
              : 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-800'
          }`}
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>{qa.upvotes}</span>
        </button>
        </div>
      </div>

      {/* Question Text */}
      {editingQuestion ? (
        <QuestionEditForm qa={qa} onSubmit={submitQuestion} onCancel={() => setEditingQuestion(false)} />
      ) : (
        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 mb-3 leading-snug">
          "{qa.questionText}"
        </h4>
      )}

      {/* Worker Response Box */}
      {isMine && (!answered || editing) ? (
        <AnswerForm qa={qa} onSubmit={submitAnswer} onCancel={answered ? () => setEditing(false) : null} />
      ) : answered ? (
        <div className="bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/20 border border-teal-100 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-teal-500 to-cyan-500">
                <img loading="lazy" decoding="async"
                  src={qa.workerAvatarUrl}
                  alt={qa.workerFullName}
                  className="w-7 h-7 rounded-full object-cover border border-white"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-extrabold text-xs text-slate-900">{qa.workerFullName}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-[10px] text-teal-700 font-bold">({qa.workerProfessionTitle})</span>
                {qa.answeredTimeAgo && (
                  <span className="text-[10px] text-slate-400 font-medium">· {t('qa.answeredAgo', { time: qa.answeredTimeAgo })}</span>
                )}
              </div>
            </div>
            {isMine && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-teal-700 hover:bg-teal-100"
              >
                <Pencil className="w-3 h-3" />
                {t('common.edit')}
              </button>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-line">
            {qa.answerText}
          </p>
          {qa.videoResponseUrl && /^https?:\/\//i.test(qa.videoResponseUrl) && (
            <a
              href={qa.videoResponseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:underline"
            >
              <Video className="w-3.5 h-3.5" />
              {t('qa.watchVideo')}
            </a>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 font-bold flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span>Waiting for {qa.workerFullName} to answer</span>
        </div>
      )}
    </div>
  );
}

export default function QAHub({
  qaItems, professionals = [], currentUserId, onAskQuestion, onAnswerQuestion, onUpdateQuestion, onDeleteQuestion,
  onUpvoteQA,
  initialView = 'all',
  onViewChange,
}) {
  const { t } = useI18n();
  const [questionText, setQuestionText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('Daily Routine & Worklife');
  const [targetWorker, setTargetWorker] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [view, setLocalView] = useState(initialView); // 'all' | 'inbox'
  // With onViewChange the parent owns the view (the address); otherwise it's local.
  const setView = onViewChange || setLocalView;
  const [inbox, setInbox] = useState(null); // questions waiting for my answer; null = not loaded
  const [inboxError, setInboxError] = useState('');

  // You can't ask yourself a question.
  const askable = professionals.filter((p) => p.id !== currentUserId);
  const workerId = targetWorker || askable[0]?.id || '';

  const loadInbox = useCallback(async () => {
    if (!currentUserId) return;
    setInboxError('');
    try {
      const list = await api.getQuestions({ worker_id: currentUserId, answered: false, limit: 100 });
      setInbox(list.map(toQuestion));
    } catch (err) {
      setInboxError(err.message);
    }
  }, [currentUserId]);

  // Loaded up front so the tab can show how many questions are waiting.
  useEffect(() => { loadInbox(); }, [loadInbox]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!questionText.trim() || !workerId) return;
    setError('');
    setBusy(true);
    try {
      await onAskQuestion(workerId, { questionText: questionText.trim(), topicTag: selectedTopic });
      setQuestionText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAnswer = async (qaId, draft) => {
    await onAnswerQuestion(qaId, draft);
    setInbox((list) => (list ? list.filter((q) => q.id !== qaId) : list));
  };

  const handleUpdate = async (qaId, draft) => {
    const updated = await onUpdateQuestion(qaId, draft);
    setInbox((list) => list && list.map((q) => (q.id === qaId ? updated : q)));
  };

  const handleDelete = async (qaId) => {
    if (await onDeleteQuestion(qaId)) setInbox((list) => list && list.filter((q) => q.id !== qaId));
  };

  // Keep upvotes on inbox cards in step with the main list.
  const handleUpvote = (qaId) => {
    onUpvoteQA(qaId);
    setInbox((list) => list && list.map((q) => (q.id === qaId
      ? { ...q, upvotedByMe: !q.upvotedByMe, upvotes: q.upvotes + (q.upvotedByMe ? -1 : 1) }
      : q)));
  };

  const inboxCount = inbox?.length || 0;
  const shown = view === 'inbox' ? inbox || [] : qaItems;
  const tabCls = (v) => `flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-colors ${
    view === v ? 'bg-teal-600 text-white shadow-sm' : 'text-teal-800 hover:bg-teal-50'
  }`;

  return (
    <div className="bg-white/95 border border-teal-100 rounded-3xl p-5 sm:p-6 shadow-sm mb-6 backdrop-blur-sm card-glow">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-teal-100 text-teal-700">
              <MessageSquareText className="w-5 h-5" />
            </span>
            <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
              {t('qa.title')}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {t('qa.subtitle')}
          </p>
        </div>
      </div>

      {/* Ask a Question Box with Vibrant Gradient */}
      <form onSubmit={handleAsk} className="bg-gradient-to-br from-teal-50/80 via-cyan-50/50 to-slate-50 border border-teal-100 rounded-3xl p-4 sm:p-5 mb-6 space-y-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-black text-teal-950">
            {t('qa.askPractitioner')}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={workerId}
              onChange={(e) => setTargetWorker(e.target.value)}
              aria-label={t('qa.whoToAsk')}
              className="px-3 py-1.5 bg-white border border-teal-200 rounded-xl text-xs font-bold text-teal-900 outline-none focus:border-teal-500 shadow-2xs max-w-full"
            >
              {askable.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName} ({p.professionTitle})</option>
              ))}
            </select>

            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              aria-label={t('qa.topic')}
              className="px-3 py-1.5 bg-white border border-teal-200 rounded-xl text-xs font-bold text-teal-900 outline-none focus:border-teal-500 shadow-2xs"
            >
              <option value="Daily Routine & Worklife">{topicName('Daily Routine & Worklife')}</option>
              <option value="Career & Salary Advice">{topicName('Career & Salary Advice')}</option>
              <option value="Tools & Software">{topicName('Tools & Software')}</option>
              <option value="DIY Pitfalls & Solutions">{topicName('DIY Pitfalls & Solutions')}</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            aria-label={t('qa.yourQuestion')}
            placeholder={t('qa.questionPlaceholder')}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="flex-1 min-w-0 px-4 py-2.5 bg-white border border-teal-200 rounded-2xl text-xs text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all font-medium"
            required
          />
          <button
            type="submit"
            disabled={busy || !workerId}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-600 via-cyan-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60 text-white rounded-2xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{t('qa.askPro')}</span>
          </button>
        </div>
        {error && <p role="alert" className="text-xs font-bold text-rose-600">{error}</p>}
      </form>

      {/* All questions / my inbox */}
      <div className="flex items-center gap-2 mb-4" role="tablist" aria-label={t('qa.questions')}>
        <button role="tab" aria-selected={view === 'all'} onClick={() => setView('all')} className={tabCls('all')}>
          {t('qa.all')}
        </button>
        <button
          role="tab"
          aria-selected={view === 'inbox'}
          onClick={() => { setView('inbox'); loadInbox(); }}
          className={tabCls('inbox')}
        >
          <Inbox className="w-3.5 h-3.5" />
          {t('qa.inboxTitle')}
          {inboxCount > 0 && (
            <span className={`ml-0.5 px-1.5 rounded-full text-[10px] ${view === 'inbox' ? 'bg-white text-teal-700' : 'bg-rose-500 text-white'}`}>
              {inboxCount}
            </span>
          )}
        </button>
      </div>

      {view === 'inbox' && inboxError && (
        <p role="alert" className="text-center text-xs font-bold text-rose-600 py-4">Couldn't load your questions: {inboxError}</p>
      )}
      {view === 'inbox' && !inboxError && inbox === null && (
        <p className="text-center text-xs font-medium text-slate-500 py-6">{t('common.loading')}</p>
      )}
      {view === 'inbox' && !inboxError && inbox?.length === 0 && (
        <p className="text-center text-xs font-medium text-slate-500 py-6">
          {t('qa.inboxEmpty')}
        </p>
      )}
      {view === 'all' && qaItems.length === 0 && (
        <p className="text-center text-xs font-medium text-slate-500 py-6">{t('qa.empty')}</p>
      )}

      <div className="space-y-4">
        {shown.map((qa) => (
          <QuestionCard
            key={qa.id}
            qa={qa}
            isMine={!!currentUserId && qa.workerId === currentUserId}
            isAsker={!!currentUserId && qa.askerId === currentUserId}
            canReport={!!currentUserId && qa.askerId !== currentUserId}
            onUpvoteQA={handleUpvote}
            onAnswer={handleAnswer}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
