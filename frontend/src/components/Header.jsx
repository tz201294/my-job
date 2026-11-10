import React from 'react';
import { Briefcase, Search, PlusSquare, Compass, Bell, MessageCircle } from 'lucide-react';

export default function Header({ 
  onOpenCreate, 
  searchTerm, 
  onSearchChange,
  activeTab,
  onTabChange
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onTabChange('feed')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-sm shadow-brand-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-brand-700 to-indigo-600 bg-clip-text text-transparent">
                MyJob
              </span>
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-sm hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by job, task, tool..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100 hover:bg-slate-100/90 focus:bg-white text-xs rounded-full border border-transparent focus:border-brand-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Right Actions: Instagram-style New Post, Notifications, and Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Universal Create Button (+ icon like Instagram) */}
          <button
            onClick={onOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-full text-xs font-bold shadow-sm shadow-brand-500/20 transition-all active:scale-95"
          >
            <PlusSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Post</span>
          </button>

          {/* Activity / Bell */}
          <button className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-white"></span>
          </button>

          {/* User Profile Avatar */}
          <div className="cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
              alt="Elena Vance"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500/30"
              title="Elena Vance, Esq. (Litigation Partner)"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
