import React, { useEffect, useRef } from 'react';
import {
  Home, Zap, MessageSquareText, Film, User, Bookmark, Activity, Bell, Settings, LogOut, X, ShieldCheck,
} from 'lucide-react';

// Main sections, then personal pages. `key` is what App navigates to.
export const MAIN_ITEMS = [
  { key: 'feed', label: 'Home', icon: Home },
  { key: 'challenges', label: 'Live Work', icon: Zap },
  { key: 'qa', label: 'Q&A', icon: MessageSquareText },
  { key: 'reels', label: 'Reels', icon: Film, note: 'sample' },
];

const PERSONAL_ITEMS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'saved', label: 'Saved', icon: Bookmark },
  { key: 'activity', label: 'My activity', icon: Activity },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'settings', label: 'Settings', icon: Settings },
];

function MenuItem({ item, active, onNavigate }) {
  const Icon = item.icon;
  return (
    <li>
      <button
        type="button"
        onClick={() => onNavigate(item.key)}
        aria-current={active ? 'page' : undefined}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
          active
            ? 'bg-indigo-50 text-indigo-800 font-extrabold'
            : 'text-slate-700 hover:bg-slate-100 font-semibold'
        }`}
      >
        <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-500'}`} />
        <span>{item.label}</span>
        {item.note && (
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">{item.note}</span>
        )}
      </button>
    </li>
  );
}

function MenuContent({ me, activeKey, onNavigate, onLogout }) {
  return (
    <nav aria-label="Main menu" className="flex flex-col gap-4">
      {/* Who is signed in */}
      <button
        type="button"
        onClick={() => onNavigate('profile')}
        className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-100 text-left"
      >
        <img src={me.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-500" />
        <div className="min-w-0">
          <p className="flex items-center gap-1 font-extrabold text-sm text-slate-900 truncate">
            {me.fullName}
            {me.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
          </p>
          <p className="text-xs text-slate-500 truncate">@{me.username} · {me.professionTitle}</p>
        </div>
      </button>

      <ul className="space-y-0.5">
        {MAIN_ITEMS.map((item) => (
          <MenuItem key={item.key} item={item} active={activeKey === item.key} onNavigate={onNavigate} />
        ))}
      </ul>

      <div className="border-t border-slate-200" />

      <ul className="space-y-0.5">
        {PERSONAL_ITEMS.map((item) => (
          <MenuItem key={item.key} item={item} active={activeKey === item.key} onNavigate={onNavigate} />
        ))}
      </ul>

      <div className="border-t border-slate-200" />

      <button
        type="button"
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
      >
        <LogOut className="w-5 h-5" />
        <span>Log out</span>
      </button>
    </nav>
  );
}

// Fixed left column on wide screens.
export function Sidebar(props) {
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-20 py-6 max-h-[calc(100vh-5rem)] overflow-y-auto">
        <MenuContent {...props} />
      </div>
    </aside>
  );
}

// Slide-in menu on phones and tablets, opened from the header's menu button.
export function MenuDrawer({ open, onClose, ...props }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute inset-y-0 left-0 w-[82%] max-w-xs bg-white shadow-2xl p-4 overflow-y-auto outline-none"
      >
        <div className="flex justify-end mb-1">
          <button type="button" onClick={onClose} aria-label="Close menu"
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <MenuContent
          {...props}
          onNavigate={(key) => { onClose(); props.onNavigate(key); }}
          onLogout={() => { onClose(); props.onLogout(); }}
        />
      </div>
    </div>
  );
}
