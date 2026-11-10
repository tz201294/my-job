import React from 'react';
import { Plus, Sparkles, Clock } from 'lucide-react';

export default function StoryTray({ stories, onSelectStory, currentRole, onOpenAddStory }) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">24h Worklife Stories</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Shifts
          </span>
        </div>
        <span className="text-xs text-slate-400 font-medium">Auto-expires in 24h</span>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1 pt-1">
        {/* Worker "Add Story" Action */}
        {currentRole === 'worker' && (
          <div 
            onClick={onOpenAddStory}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-brand-400 hover:border-brand-600 bg-brand-50/50 flex flex-col items-center justify-center text-brand-600 transition-all group-hover:scale-105">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-xs font-semibold text-slate-700 text-center max-w-[70px] truncate">
              Your Story
            </span>
          </div>
        )}

        {/* Stories list */}
        {stories.map((story, idx) => (
          <div
            key={story.id}
            onClick={() => onSelectStory(story, idx)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
          >
            <div className="relative p-[2.5px] rounded-full story-ring-gradient group-hover:scale-105 transition-transform duration-200">
              <div className="p-0.5 bg-white rounded-full">
                <img
                  src={story.avatarUrl}
                  alt={story.fullName}
                  className="w-14 h-14 rounded-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-slate-900/90 text-white text-[9px] font-extrabold rounded-full border border-white">
                {story.professionTag}
              </span>
            </div>
            <div className="text-center max-w-[76px]">
              <p className="text-xs font-semibold text-slate-800 truncate">{story.fullName.split(' ')[0]}</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">{story.timeAgo}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
