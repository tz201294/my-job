import React from 'react';
import {
  Plus, Sparkles,
} from 'lucide-react';
import { useI18n } from '../i18n';

export default function StoryTray({ stories, myAvatarUrl, onSelectStory, onOpenAddStory }) {
  const { t } = useI18n();
  return (
    <div className="bg-white/95 border border-teal-100 rounded-3xl p-4 sm:p-5 shadow-sm mb-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3.5 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-slate-900 to-teal-700 bg-clip-text text-transparent">
            {t('stories.title')}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-white bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 py-0.5 rounded-full shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> {t('stories.liveShifts')}
          </span>
        </div>
        <span className="text-xs text-teal-500 font-bold flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>{t('stories.realtime')}</span>
        </span>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1 pt-1">
        {/* "Your Story (+)" Action (Instagram pattern) */}
        <div 
          onClick={onOpenAddStory}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
        >
          <div className="relative">
            <div className="p-0.5 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 group-hover:from-teal-400 group-hover:to-cyan-400 transition-all">
              <img loading="lazy" decoding="async"
                src={myAvatarUrl}
                alt={t('stories.add')}
                className="w-14 h-14 rounded-full object-cover border-2 border-white group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-teal-600 to-cyan-500 text-white flex items-center justify-center absolute -bottom-0.5 -right-0.5 border-2 border-white shadow-sm">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
          <span className="text-xs font-bold text-slate-800 text-center max-w-[70px] truncate">
            {t('stories.yours')}
          </span>
        </div>

        {/* Stories list from followed accounts */}
        {stories.map((story, idx) => (
          <div
            key={story.id}
            onClick={() => onSelectStory(story, idx)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
          >
            <div className="relative p-[3px] rounded-full story-ring-gradient group-hover:scale-105 transition-transform duration-200">
              <div className="p-0.5 bg-white rounded-full">
                <img loading="lazy" decoding="async"
                  src={story.avatarUrl}
                  alt={story.fullName}
                  className="w-14 h-14 rounded-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-gradient-to-r from-slate-900 to-teal-950 text-white text-[9px] font-black rounded-full border border-white shadow-xs">
                {story.professionTag}
              </span>
            </div>
            <div className="text-center max-w-[76px]">
              <p className="text-xs font-extrabold text-slate-800 truncate">{story.fullName.split(' ')[0]}</p>
              <p className="text-[10px] text-teal-600 font-semibold truncate">{story.timeAgo}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
