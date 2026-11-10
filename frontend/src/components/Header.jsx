import React from 'react';
import { Briefcase, Search, PlusCircle, Compass, Sparkles, User, ShieldCheck } from 'lucide-react';

export default function Header({ 
  currentRole, 
  onToggleRole, 
  onOpenCreate, 
  searchTerm, 
  onSearchChange,
  activeTab,
  onTabChange
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('feed')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-brand-700 to-indigo-600 bg-clip-text text-transparent">
                MyJob
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 uppercase tracking-wider">
                Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block font-medium">Real Jobs • Real Workflows</p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by profession, task, tool (e.g. Subpoena, PRV, Bus)..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-sm rounded-full border border-transparent focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all outline-none"
            />
          </div>
        </div>

        {/* Right Actions & Persona Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Worker vs Explorer Role Switcher Pill */}
          <div className="flex items-center bg-slate-100 p-1 rounded-full text-xs font-semibold border border-slate-200/80">
            <button
              onClick={() => onToggleRole('worker')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                currentRole === 'worker'
                  ? 'bg-white text-brand-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              <span>Worker <span className="hidden lg:inline text-[10px] text-slate-400 font-normal">(Elena, Esq.)</span></span>
            </button>
            <button
              onClick={() => onToggleRole('explorer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                currentRole === 'explorer'
                  ? 'bg-white text-indigo-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              <span>Explorer</span>
            </button>
          </div>

          {/* Share Work Button (Visible for Workers) */}
          {currentRole === 'worker' && (
            <button
              onClick={onOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-full text-xs font-bold shadow-sm shadow-brand-500/30 transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Publish Work</span>
            </button>
          )}

          {/* User Profile Avatar */}
          <div className="flex items-center gap-2 pl-1">
            <img
              src={currentRole === 'worker' 
                ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
                : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80"
              }
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500/30"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
