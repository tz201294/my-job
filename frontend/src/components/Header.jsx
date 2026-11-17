import React, { useEffect, useRef, useState } from 'react';
import { Briefcase, Search, PlusSquare, Bell, Menu, X } from 'lucide-react';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';

export default function Header({
  currentUser,
  onOpenCreate,
  searchTerm,
  onSearchChange,
  onGoHome,
  onOpenMenu,
  onOpenNotifications,
  onOpenMyProfile,
  notificationsActive = false,
}) {
  // On phones the search box opens as a full-width row under the header.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef(null);
  useEffect(() => {
    if (mobileSearchOpen) mobileInputRef.current?.focus();
  }, [mobileSearchOpen]);

  const searchInput = (props) => (
    <div className="relative">
      <Search className="w-4 h-4 text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        type="search"
        aria-label="Search posts by job, task or tool"
        placeholder="Search by job, task, tool..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full pl-9 pr-3.5 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-sm sm:text-xs font-medium rounded-full border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
        {...props}
      />
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-teal-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Menu button (the sidebar takes over on wide screens) */}
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open menu"
            className="lg:hidden p-2 -ml-1 text-slate-700 hover:bg-slate-100 rounded-full"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Brand */}
          <button type="button" className="flex items-center gap-2.5 group" onClick={onGoHome} aria-label="MyJob home">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-teal-500 via-cyan-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/30 group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-slate-900 via-teal-700 to-cyan-600 bg-clip-text text-transparent">
                MyJob
              </span>
              <span className="hidden sm:inline text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white uppercase tracking-wider shadow-2xs">
                PRO
              </span>
            </span>
          </button>
        </div>

        {/* Search (wide screens) */}
        <div className="flex-1 max-w-sm hidden sm:block">{searchInput()}</div>

        <div className="flex items-center gap-1 sm:gap-3">
          {/* Search toggle (phones) */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label={mobileSearchOpen ? 'Close search' : 'Search'}
            aria-expanded={mobileSearchOpen}
            className="sm:hidden p-2 text-slate-600 hover:bg-teal-50 rounded-full"
          >
            {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          {/* Create (phones use the + in the bottom bar) */}
          <button
            type="button"
            onClick={onOpenCreate}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 via-cyan-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 text-white rounded-full text-xs font-extrabold shadow-md shadow-teal-500/25 transition-all active:scale-95"
          >
            <PlusSquare className="w-4 h-4 stroke-[2.5]" />
            <span>Post</span>
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Notifications"
            aria-current={notificationsActive ? 'page' : undefined}
            className={`p-2 rounded-full transition-colors ${
              notificationsActive ? 'text-teal-700 bg-teal-50' : 'text-slate-600 hover:text-teal-600 hover:bg-teal-50'
            }`}
          >
            <Bell className="w-5 h-5" />
          </button>

          {/* Your profile (phones use the bottom bar) */}
          <button
            type="button"
            className="hidden sm:block"
            onClick={onOpenMyProfile}
            title={`View your profile (@${currentUser.username})`}
          >
            <img
              src={currentUser.avatar_url || DEFAULT_AVATAR}
              alt={`${currentUser.full_name} — your profile`}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-teal-500 hover:ring-cyan-400 shadow-sm hover:scale-105 transition-all"
            />
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="sm:hidden px-3 pb-3">{searchInput({ ref: mobileInputRef })}</div>
      )}
    </header>
  );
}
