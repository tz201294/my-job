import React from 'react';
import { Briefcase, Search, PlusSquare, Bell, Sparkles } from 'lucide-react';

export default function Header({ 
  onOpenCreate, 
  searchTerm, 
  onSearchChange,
  activeTab,
  onTabChange,
  onOpenMyProfile
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-indigo-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand Logo with jewel gradient */}
        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => onTabChange('feed')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/30 group-hover:scale-105 transition-transform">
            <Briefcase className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-700 to-rose-600 bg-clip-text text-transparent">
                MyJob
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white uppercase tracking-wider shadow-2xs">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Global Search Bar with vibrant focus */}
        <div className="flex-1 max-w-sm hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by job, task, tool..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs font-medium rounded-full border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* Right Actions: Instagram-style New Post, Notifications, and Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Universal Create Button with vibrant gradient */}
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 hover:from-indigo-700 hover:to-rose-600 text-white rounded-full text-xs font-extrabold shadow-md shadow-indigo-500/25 transition-all active:scale-95"
          >
            <PlusSquare className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Post</span>
          </button>

          {/* Activity / Bell with vibrant pulse */}
          <button className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 absolute top-1.5 right-1.5 ring-2 ring-white animate-pulse"></span>
          </button>

          {/* User Profile Avatar with colorful border */}
          <div className="cursor-pointer" onClick={onOpenMyProfile}>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
              alt="Elena Vance"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500 hover:ring-rose-500 shadow-sm hover:scale-105 transition-all"
              title="View Your Profile & Portfolio (Elena Vance, Esq.)"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
