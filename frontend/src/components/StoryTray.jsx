import React from 'react';
import { Plus, Sparkles, Clock } from 'lucide-react';

export default function StoryTray({ stories, onSelectStory, onOpenAddStory }) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs mb-5">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">24h Work Stories</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live Shifts
          </span>
        </div>
        <span className="text-xs text-slate-400 font-medium">Expires in 24h</span>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1 pt-1">
        {/* "Your Story (+)" Action (Instagram pattern) */}
        <div 
          onClick={onOpenAddStory}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
        >
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
              alt="Your Profile"
              className="w-14 h-14 rounded-full object-cover border border-slate-200 group-hover:scale-105 transition-transform"
            />
            <div className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center absolute -bottom-0.5 -right-0.5 border-2 border-white shadow-xs">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-700 text-center max-w-[70px] truncate">
            Your Story
          </span>
        </div>

        {/* Stories list from followed accounts */}
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
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-full object-cover"
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
