import React from 'react';
import { Home, Zap, Plus, MessageSquareText } from 'lucide-react';
import { useI18n } from '../i18n';

// Phone-style tab bar at the bottom of the screen (hidden on wide screens, where the sidebar is shown).
export default function BottomNav({ me, activeKey, onNavigate, onOpenCreate }) {
  const { t } = useI18n();
  const tab = (key, label, Icon) => {
    const active = activeKey === key;
    return (
      <button
        type="button"
        onClick={() => onNavigate(key)}
        aria-current={active ? 'page' : undefined}
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] ${
          active ? 'text-teal-700 font-extrabold' : 'text-slate-500 font-semibold'
        }`}
      >
        <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5]' : ''}`} />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label={t('nav.sections')}
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-xl mx-auto flex items-stretch h-16 px-1">
        {tab('feed', t('nav.home'), Home)}
        {tab('challenges', t('nav.liveWork'), Zap)}
        <div className="flex-1 flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenCreate}
            aria-label={t('nav.createPost')}
            className="w-12 h-12 -mt-1 rounded-2xl bg-gradient-to-tr from-teal-600 via-cyan-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/30 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
        {tab('qa', 'Q&A', MessageSquareText)}
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          aria-current={activeKey === 'profile' ? 'page' : undefined}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] ${
            activeKey === 'profile' ? 'text-teal-700 font-extrabold' : 'text-slate-500 font-semibold'
          }`}
        >
          <img loading="lazy" decoding="async"
            src={me.avatarUrl}
            alt=""
            className={`w-6 h-6 rounded-full object-cover ${activeKey === 'profile' ? 'ring-2 ring-teal-600' : ''}`}
          />
          <span>{t('nav.profile')}</span>
        </button>
      </div>
    </nav>
  );
}
